from prisma import Prisma

from app.services.github_service import GithubService
from app.services.resume_service import ResumeService
from app.services.persistence_service import PersistenceService

from app.compute.scoring import (
    compute_dataset_maxima,
    compute_activity_score,
    compute_gi,
    compute_ci,
)
from app.compute.team_feature import compute_team_features
from app.compute.clustering import cluster_teams

from app.config.settings import GITHUB_TOKEN


async def run_pipeline():

    # ------------------------------------------------------------
    # Init services
    # ------------------------------------------------------------

    github_service = GithubService(GITHUB_TOKEN)
    resume_service = ResumeService()
    persistence = PersistenceService()

    db = Prisma()
    await db.connect()

    print("Fetching teams...")

    teams = await db.team.find_many(
        include={"participant": True}
    )

    # ------------------------------------------------------------
    # Determine existing data (idempotency)
    # ------------------------------------------------------------

    existing_profiles = await db.githubprofile.find_many()
    processed_pids = {p.participantId for p in existing_profiles}

    existing_scores = await db.memberscore.find_many()
    scored_pids = {s.participantId for s in existing_scores}

    existing_features = await db.teamfeature.find_many()
    feature_team_ids = {f.teamId for f in existing_features}

    existing_results = await db.teamresult.find_many()
    result_team_ids = {r.teamId for r in existing_results}
    
    existing_resumes  = await db.resume.find_many()
    resume_pids       = {r.participantId for r in existing_resumes}

    # Load existing profiles and scores from DB for merging
    # so that incremental runs have the full dataset available
    existing_profile_rows = await db.githubprofile.find_many()
    existing_score_rows = await db.memberscore.find_many()
    existing_repo_rows = await db.githubrepo.find_many()

    existing_resume_map = {
        r.participantId: r.resumeScore
        for r in existing_resumes
        if r.resumeScore is not None
    }

    await db.disconnect()

    # ============================================================
    # Stage 1 — GitHub Metrics
    # ============================================================

    print("Fetching GitHub metrics...")

    # github_data : { pid -> { "profile": {...}, "repos": [...] } }
    # Only contains NEWLY fetched participants this run
    github_data = {}
    profile_list = []

    for team in teams:
        for p in team.participant:

            if not p.githubUsername:
                continue

            if p.participantId in processed_pids:
                continue

            result = github_service.get_user_metrics(p.githubUsername)

            if result:
                github_data[p.participantId] = result
                profile_list.append(result["profile"])

    # ============================================================
    # Stage 1.5 — Resume Processing
    # ============================================================

    print("Processing resumes...")

    resume_data = {}

    for team in teams:
        for p in team.participant:
            if not p.resumeURL:
                continue
            if p.participantId in resume_pids:
                continue

            print(f"  [resume] Participant {p.participantId}...")
            result = resume_service.process_resume(p.resumeURL)

            if result:
                resume_data[p.participantId] = result
    # ============================================================
    # Stage 2 — Normalization + Gᵢ + Cᵢ
    # ============================================================

    print("Computing scores...")

    # member_scores : { pid -> { "g_i", "r_i", "c_i", "activity_score" } }
    # Seed with already-scored participants from DB first
    member_scores = {
        row.participantId: {
            "g_i":            row.gI,
            "r_i":            row.rI,
            "c_i":            row.cI,
            "activity_score": None,     # not stored separately, handled below
        }
        for row in existing_score_rows
    }

    # Merge existing profiles into a full profile list for correct maxima
    existing_profile_map = {
        row.participantId: {
            "total_stars":      row.totalStars or 0,
            "total_forks":      row.totalForks or 0,
            "original_repos":   row.originalRepos or 0,
            "total_repos":      row.totalRepos or 0,
            "unique_languages": row.uniqueLanguages or 0,
            "activity_raw":     row.activityRaw or 0,
            "activity_score":   row.activityScore or 0,
        }
        for row in existing_profile_rows
    }

    # Full profile list = existing + new (for dataset-wide maxima)
    all_profiles = list(existing_profile_map.values()) + profile_list

    if all_profiles:

        maxima = compute_dataset_maxima(all_profiles)

        for pid, result in github_data.items():

            if pid in scored_pids:
                continue

            profile = result["profile"]

            a_score = compute_activity_score(
                profile["activity_raw"], maxima["A_max"]
            )

            # Attach normalised activity_score back onto profile
            # so persistence can save it
            profile["activity_score"] = a_score

            g_i = compute_gi(profile, maxima)

            if pid in resume_data:
                r_i = resume_data[pid]["resume_score"]
            elif pid in existing_resume_map:
                r_i = existing_resume_map[pid]
            else:
                r_i = None

            c_i = compute_ci(g_i, r_i)

            member_scores[pid] = {
                "g_i":            g_i,
                "r_i":            r_i,
                "c_i":            c_i,
                "activity_score": a_score,
            }

    # ============================================================
    # Stage 3 — Team Features
    # ============================================================

    print("Computing team features...")

    # Build a repo lookup from existing DB rows: { pid -> [repo dicts] }
    existing_repo_map = {}
    for row in existing_repo_rows:
        existing_repo_map.setdefault(row.participantId, []).append({
            "stars":    row.stars or 0,
            "language": row.language,
        })

    team_features = {}

    for team in teams:

        if team.teamId in feature_team_ids:
            continue

        # Build rich per-member dicts expected by compute_team_features
        # drawing from both newly fetched and previously stored data
        members = []

        for p in team.participant:

            pid = p.participantId

            if pid not in member_scores:
                continue

            scores = member_scores[pid]

            # Profile — prefer newly fetched, fall back to DB
            if pid in github_data:
                profile = github_data[pid]["profile"]
                repos = github_data[pid]["repos"]
            elif pid in existing_profile_map:
                profile = existing_profile_map[pid]
                repos = existing_repo_map.get(pid, [])
            else:
                continue

            members.append({
                "g_i":            scores["g_i"],
                "r_i":            scores["r_i"],
                "c_i":            scores["c_i"],
                "activity_score": scores["activity_score"] or profile.get("activity_score", 0),
                "total_stars":    profile["total_stars"],
                "repo_stars":     [r["stars"] for r in repos],
                "original_repos": profile["original_repos"],
                "languages":      {r["language"] for r in repos if r["language"]},
            })

        if not members:
            continue

        team_features[team.teamId] = compute_team_features(members)

    # ============================================================
    # Stage 4 — Clustering
    # ============================================================

    print("Clustering teams...")

    clusters = {}

    if team_features:

        raw_clusters = cluster_teams(team_features)

        for team_id, res in raw_clusters.items():

            if team_id in result_team_ids:
                continue

            clusters[team_id] = res

    # ============================================================
    # Stage 5 — Persistence
    # ============================================================

    print("Persisting results...")

    await persistence.connect()

    # Pass the full github_data so persistence can unpack profile + repos
    await persistence.save_github_profiles(github_data)
    await persistence.save_github_repos(github_data)
    await persistence.save_resumes(resume_data)        
    await persistence.save_member_scores(member_scores) 
    await persistence.save_team_features(team_features)
    await persistence.save_team_results(clusters)

    await persistence.disconnect()

    print("Pipeline complete!")
