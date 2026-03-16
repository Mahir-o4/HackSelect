from prisma import Prisma

from app.services.github_service import get_github_metrics
from app.services.scoring_service import compute_gi, compute_dataset_maxima
from app.services.team_feature_service import compute_team_features
from app.services.clustering_service import cluster_teams
from app.persistence.persistence import persist_results


async def run_pipeline():

    db = Prisma()
    await db.connect()

    print("Fetching teams...")

    teams = await db.team.find_many(
        include={"participant": True}
    )

    # ----------------------------------------------------------------
    # Idempotency Checks (WTV has been processed will not be recomputed)
    # -----------------------------------------------------------------

    existing_profiles = await db.githubprofile.find_many()
    processed_pids = {p.participantId for p in existing_profiles}

    existing_scores = await db.memberscore.find_many()
    scored_pids = {s.participantId for s in existing_scores}

    existing_features = await db.teamfeature.find_many()
    feature_team_ids = {f.teamId for f in existing_features}

    existing_results = await db.teamresult.find_many()
    result_team_ids = {r.teamId for r in existing_results}

    await db.disconnect()

    # ============================================================
    # Stage 1 — GitHub Metrics (compute only for missing)
    # ============================================================

    print("GitHub metrics...")

    github_data = {}
    all_metrics = []

    for team in teams:
        for p in team.participant:

            if not p.githubUsername:
                continue

            if p.participantId in processed_pids:
                continue

            stats = get_github_metrics(p.githubUsername)

            if stats:
                github_data[p.participantId] = stats
                all_metrics.append(stats)

    # ============================================================
    # Stage 2 — Compute Gᵢ
    # ============================================================

    print("🧮 Computing Gᵢ...")

    gi_scores = {}

    if all_metrics:
        maxima = compute_dataset_maxima(all_metrics)

        for pid, metrics in github_data.items():
            if pid in scored_pids:
                continue

            gi_scores[pid] = compute_gi(metrics, maxima)

    # ============================================================
    # Stage 3 — Team Features
    # ============================================================

    print("Team features...")

    team_features = {}

    for team in teams:

        if team.teamId in feature_team_ids:
            continue

        member_gis = [
            gi_scores[p.participantId]
            for p in team.participant
            if p.participantId in gi_scores
        ]

        if not member_gis:
            continue

        team_features[team.teamId] = compute_team_features(member_gis)

    # ============================================================
    # Stage 4 — Clustering
    # ============================================================

    print("🤖 Clustering...")

    clusters = {}

    if team_features:
        raw_clusters = cluster_teams(team_features)

        for team_id, res in raw_clusters.items():
            if team_id in result_team_ids:
                continue

            clusters[team_id] = res

    # ============================================================
    # Stage 5 — PERSISTENCE (single call)
    # ============================================================

    print("Persisting results...")

    await persist_results(
        github_data,
        gi_scores,
        team_features,
        clusters
    )

    print("Pipeline complete!")