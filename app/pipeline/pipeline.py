from prisma import Prisma

from app.services.github_service import GithubService
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
    persistence    = PersistenceService()

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
    processed_pids    = {p.participantId for p in existing_profiles}

    existing_scores   = await db.memberscore.find_many()
    scored_pids       = {s.participantId for s in existing_scores}

    existing_features = await db.teamfeature.find_many()
    feature_team_ids  = {f.teamId for f in existing_features}

    existing_results  = await db.teamresult.find_many()
    result_team_ids   = {r.teamId for r in existing_results}

    await db.disconnect()

    # ============================================================
    # Stage 1 — GitHub Metrics
    # ============================================================

    print("Fetching GitHub metrics...")

    # github_data  : { pid -> { "profile": {...}, "repos": [...] } }
    # profile_list : flat list of profile dicts for compute_dataset_maxima
    github_data  = {}
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
    # Stage 2 — Normalization + Gᵢ + Cᵢ
    # ============================================================

    print("Computing scores...")

    # member_scores : { pid -> { "g_i", "r_i", "c_i", "activity_score" } }
    member_scores = {}

    if profile_list:

        maxima = compute_dataset_maxima(profile_list)

        for pid, result in github_data.items():

            if pid in scored_pids:
                continue

            profile = result["profile"]

            a_score = compute_activity_score(
                profile["activity_raw"], maxima["A_max"]
            )

            # Attach normalised activity_score back onto profile
            # so compute_gi can use it if needed and persistence can save it
            profile["activity_score"] = a_score

            g_i = compute_gi(profile, maxima)

            # r_i — None until resume pipeline is active
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

    team_features = {}

    for team in teams:

        if team.teamId in feature_team_ids:
            continue

        # Build rich per-member dicts expected by compute_team_features
        members = []

        for p in team.participant:

            pid = p.participantId

            if pid not in member_scores:
                continue

            scores  = member_scores[pid]
            profile = github_data[pid]["profile"]
            repos   = github_data[pid]["repos"]

            members.append({
                "g_i":            scores["g_i"],
                "r_i":            scores["r_i"],
                "c_i":            scores["c_i"],
                "activity_score": scores["activity_score"],
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
    await persistence.save_member_scores(member_scores)
    await persistence.save_team_features(team_features)
    await persistence.save_team_results(clusters)

    await persistence.disconnect()

    print("Pipeline complete!")