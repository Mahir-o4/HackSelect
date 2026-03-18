import asyncio
from prisma import Prisma
import json

from app.services.github_service import GithubService
from app.services.resume_service import ResumeService
from app.services.persistence_service import PersistenceService
from app.services.summary_service import SummaryService

from app.compute.scoring import (
    compute_dataset_maxima,
    compute_activity_score,
    compute_gi,
    compute_ci,
)
from app.compute.team_feature import compute_team_features

from app.config.settings import GITHUB_TOKEN


async def run_pipeline(hackathon_id: str):
    """
    Async generator that runs the full data pipeline for a hackathon.
    Yields SSE-compatible event dicts at each stage.
    Clustering is NOT performed here — it is triggered separately
    via the /teams/cluster route after the pipeline completes.
    """

    def event(stage: str, status: str, message: str) -> dict:
        return {"stage": stage, "status": status, "message": message}

    # ------------------------------------------------------------
    # Init services
    # ------------------------------------------------------------

    yield event("init", "in_progress", "Initializing pipeline...")

    github_service = GithubService(GITHUB_TOKEN)
    resume_service = ResumeService()
    persistence = PersistenceService()

    db = Prisma()
    await db.connect()

    teams = await db.team.find_many(
        where={"hackathonId": hackathon_id},
        include={
            "participant": True,
            "teamSummary": True,
        }
    )

    if not teams:
        yield event("init", "error", "No teams found for this hackathon.")
        await db.disconnect()
        return

    total_teams = len(teams)
    total_participants = sum(len(t.participant) for t in teams)

    yield event("init", "done", f"Found {total_teams} teams and {total_participants} participants.")

    # Collect all participant IDs belonging to this hackathon
    hackathon_pids = {
        p.participantId
        for team in teams
        for p in team.participant
    }

    # ------------------------------------------------------------
    # Idempotency checks — scoped to this hackathon
    # ------------------------------------------------------------

    existing_profiles = await db.githubprofile.find_many(
        where={"participantId": {"in": list(hackathon_pids)}}
    )
    processed_pids = {p.participantId for p in existing_profiles}

    existing_scores = await db.memberscore.find_many(
        where={"participantId": {"in": list(hackathon_pids)}}
    )
    scored_pids = {s.participantId for s in existing_scores}

    existing_resumes = await db.resume.find_many(
        where={"participantId": {"in": list(hackathon_pids)}}
    )
    resume_pids = {r.participantId for r in existing_resumes}

    existing_features = await db.teamfeature.find_many(
        where={"teamId": {"in": [t.teamId for t in teams]}}
    )
    feature_team_ids = {f.teamId for f in existing_features}

    summarized_team_ids = {
        team.teamId for team in teams if team.teamSummary
    }

    # Reuse already fetched rows — no extra DB calls
    existing_profile_rows = existing_profiles
    existing_score_rows = existing_scores

    existing_repo_rows = await db.githubrepo.find_many(
        where={"participantId": {"in": list(hackathon_pids)}}
    )

    existing_resume_map = {
        r.participantId: r.resumeScore
        for r in existing_resumes
        if r.resumeScore is not None
    }

    await db.disconnect()

    # ============================================================
    # Stage 1 — GitHub Metrics (concurrent)
    # ============================================================

    to_fetch = [
        p
        for t in teams
        for p in t.participant
        if p.githubUsername and p.participantId not in processed_pids
    ]

    yield event("github", "in_progress", f"Fetching GitHub metrics for {len(to_fetch)} participants...")

    # Semaphore caps concurrent GitHub API requests to avoid rate limiting
    github_sem = asyncio.Semaphore(10)

    async def fetch_github(p):
        async with github_sem:
            result = await asyncio.to_thread(
                github_service.get_user_metrics, p.githubUsername
            )
            return p.participantId, result

    github_results = await asyncio.gather(*[fetch_github(p) for p in to_fetch])

    github_data = {}
    profile_list = []
    github_ok = 0
    github_fail = 0

    for pid, result in github_results:
        if result:
            github_data[pid] = result
            profile_list.append(result["profile"])
            github_ok += 1
        else:
            github_fail += 1

    yield event(
        "github", "done",
        f"Fetched {github_ok} profiles. {github_fail} failed. "
        f"{len(processed_pids)} already in DB."
    )

    # ============================================================
    # Stage 2 — Resume Processing (concurrent)
    # ============================================================

    to_parse = [
        p
        for t in teams
        for p in t.participant
        if p.resumeURL and p.participantId not in resume_pids
    ]

    yield event("resume", "in_progress", f"Processing {len(to_parse)} resumes...")

    # Semaphore caps concurrent Groq API calls to avoid rate limiting
    resume_sem = asyncio.Semaphore(10)

    async def parse_resume(p):
        async with resume_sem:
            result = await asyncio.to_thread(
                resume_service.process_resume, p.resumeURL
            )
            return p.participantId, result

    resume_results = await asyncio.gather(*[parse_resume(p) for p in to_parse])

    resume_data = {}
    resume_ok = 0
    resume_fail = 0

    for pid, result in resume_results:
        if result:
            resume_data[pid] = result
            resume_ok += 1
        else:
            resume_data[pid] = {
                "raw_text":     None,
                "parsed_json":  None,
                "resume_score": 0.0,
            }
            resume_fail += 1

    yield event(
        "resume", "done",
        f"Processed {resume_ok} resumes. {resume_fail} failed. "
        f"{len(resume_pids)} already in DB."
    )

    # ============================================================
    # Stage 3 — Normalization + Gᵢ + Cᵢ
    # ============================================================

    yield event("scoring", "in_progress", "Computing member scores (Gᵢ, Rᵢ, Cᵢ)...")

    # Seed with already-scored participants from DB
    member_scores = {
        row.participantId: {
            "g_i":            row.gI,
            "r_i":            row.rI,
            "c_i":            row.cI,
            "activity_score": None,
        }
        for row in existing_score_rows
    }

    # Build existing profile map for dataset-wide maxima
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

    # Full profile list = existing (this hackathon) + newly fetched
    all_profiles = list(existing_profile_map.values()) + profile_list
    new_scores = 0

    if all_profiles:

        maxima = compute_dataset_maxima(all_profiles)

        for pid, result in github_data.items():

            if pid in scored_pids:
                continue

            profile = result["profile"]
            a_score = compute_activity_score(
                profile["activity_raw"], maxima["A_max"])
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
            new_scores += 1

    # Patch activity_score into existing member_scores from profile map
    for pid, scores in member_scores.items():
        if scores["activity_score"] is None and pid in existing_profile_map:
            scores["activity_score"] = existing_profile_map[pid]["activity_score"]

    yield event("scoring", "done", f"Computed {new_scores} new scores. {len(scored_pids)} already in DB.")

    # ============================================================
    # Stage 4 — Team Features
    # ============================================================

    yield event("features", "in_progress", "Computing team feature vectors...")

    existing_repo_map = {}
    for row in existing_repo_rows:
        existing_repo_map.setdefault(row.participantId, []).append({
            "stars":    row.stars or 0,
            "language": row.language,
        })

    team_features = {}
    features_new = 0
    features_skip = 0

    for team in teams:

        if team.teamId in feature_team_ids:
            features_skip += 1
            continue

        members = []

        for p in team.participant:

            pid = p.participantId

            if pid not in member_scores:
                continue

            scores = member_scores[pid]

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
        features_new += 1

    yield event(
        "features", "done",
        f"Computed features for {features_new} teams. {features_skip} already in DB."
    )
    # ============================================================
    # Stage 5 — Summary
    # ============================================================

    yield event("summary", "in_progress", "Generating LLM summaries for all teams...")

    summary_service = SummaryService()

    # Build resume map from in-memory data
    # Newly processed resumes take priority, existing DB rows fill the gaps
    summary_resume_map: dict[int, str] = {}

    for pid, d in resume_data.items():
        if d.get("raw_text"):
            summary_resume_map[pid] = d["raw_text"]

    for r in existing_resumes:
        if r.rawText and r.participantId not in summary_resume_map:
            summary_resume_map[r.participantId] = r.rawText

    # Build repo map from in-memory data
    # Newly fetched repos take priority, existing DB rows fill the gaps
    summary_repo_map: dict[int, list] = {}

    for pid, data in github_data.items():
        summary_repo_map[pid] = [
            {
                "name":     r["name"],
                "language": r["language"],
                "stars":    r["stars"] or 0,
                "is_fork":  r["is_fork"] or False,
            }
            for r in data["repos"]
        ]

    for row in existing_repo_rows:
        if row.participantId not in summary_repo_map:
            summary_repo_map.setdefault(row.participantId, []).append({
                "name":     row.name,
                "language": row.language,
                "stars":    row.stars or 0,
                "is_fork":  row.isFork or False,
            })

    generated = []
    skipped = list(summarized_team_ids)
    failed = []
    results_to_save = []

    summary_sem = asyncio.Semaphore(10)

    async def summarize_team_task(team):
        async with summary_sem:

            members = [
                {
                    "name":            p.name,
                    "resume_raw_text": summary_resume_map.get(p.participantId),
                    "repos":           summary_repo_map.get(p.participantId, []),
                }
                for p in team.participant
            ]

            if not members:
                print(
                    f"  [SummaryService] Skipping {team.teamName or team.teamId} — no members.")
                skipped.append(team.teamId)
                return

            result = await summary_service.summarize_team(
                team_name=team.teamName or team.teamId,
                members=members,
            )

            if not result:
                print(f"  [SummaryService] FAILED — {team.teamName or team.teamId}")
                failed.append(team.teamId)
                return

            results_to_save.append({
                "teamId":      team.teamId,
                "summaryText": json.dumps(result),
            })
            generated.append(team.teamId)
            print(f"  [SummaryService] Done — {team.teamName or team.teamId}")

    # teams already has teamSummary from init fetch
    teams_to_summarize = [
        team for team in teams
        if team.teamId not in summarized_team_ids
    ]
    
    await asyncio.gather(*[summarize_team_task(team) for team in teams_to_summarize])

    yield event(
        "summary", "done",
        f"Summaries complete. "
        f"Generated: {len(generated)}, "
        f"Skipped: {len(skipped)}, "
        f"Failed: {len(failed)}."
    )

    # ============================================================
    # Stage 6 — Persistence
    # ============================================================

    yield event("persistence", "in_progress", "Saving results to database...")

    await persistence.connect()

    await persistence.save_github_profiles(github_data)
    await persistence.save_github_repos(github_data)
    await persistence.save_resumes(resume_data)
    await persistence.save_member_scores(member_scores)
    await persistence.save_team_features(team_features)
    await persistence.save_team_summaries(results_to_save)

    await persistence.disconnect()

    yield event("persistence", "done", "All data saved successfully.")

    # ============================================================
    # Complete
    # ============================================================

    yield event(
        "complete", "done",
        "Pipeline complete. Trigger /teams/cluster to run clustering."
    )
