from prisma import Prisma

from app.compute.clustering import cluster_teams
from app.compute.scoring import compute_ci


# ----------------------------------------------------------------
# Feature keys per filter mode
# When github-only or resume-only, F7/F8 (combined strength) become
# redundant with F1/F2 or F5/F6 respectively, so they are dropped.
# ----------------------------------------------------------------

FEATURE_KEYS_BOTH = [
    "F1", "F2", "F3", "F4",        # GitHub strength
    "F5", "F6",                     # Resume strength
    "F7", "F8",                     # Combined strength
    "F9", "F10", "F11",             # Impact + productivity
    "F12",                          # Skill diversity
    "F14", "F15",                   # Activity
    "F16", "F17",                   # Team composition
]

FEATURE_KEYS_GITHUB = [
    "F1", "F2", "F3", "F4",        # GitHub strength
    "F9", "F10", "F11",             # Impact + productivity
    "F12",                          # Skill diversity
    "F14", "F15",                   # Activity
    "F16", "F17",                   # Team composition
]

FEATURE_KEYS_RESUME = [
    "F5", "F6",                     # Resume strength
    "F16", "F17",                   # Team composition
]

FILTER_FEATURE_MAP = {
    "both":   FEATURE_KEYS_BOTH,
    "github": FEATURE_KEYS_GITHUB,
    "resume": FEATURE_KEYS_RESUME,
}


async def run_clustering(
    hackathon_id: str,
    filter_mode:  str  = "both",
    w_g:          float = 0.7,
    w_r:          float = 0.3,
) -> dict:
    """
    Reads stored team features and member scores from DB,
    recomputes Cᵢ / F7 / F8 if weights differ from default,
    builds a filtered feature vector, runs KMeans, and
    upserts TeamResult rows.

    Args:
        hackathon_id: Hackathon to cluster
        filter_mode:  "both" | "github" | "resume"
        w_g:          Weight for GitHub score in Cᵢ
        w_r:          Weight for Resume score in Cᵢ

    Returns:
        { "clustered": int, "message": str }
    """

    db = Prisma()
    await db.connect()

    # Fetch all teams for this hackathon
    teams = await db.team.find_many(
        where={"hackathonId": hackathon_id},
        include={"participant": True}
    )

    if not teams:
        await db.disconnect()
        return {"clustered": 0, "message": "No teams found."}

    team_ids       = [t.teamId for t in teams]
    hackathon_pids = {
        p.participantId
        for t in teams
        for p in t.participant
    }

    # Fetch stored team features
    feature_rows = await db.teamfeature.find_many(
        where={"teamId": {"in": team_ids}}
    )

    # Fetch stored member scores for Cᵢ recomputation
    score_rows = await db.memberscore.find_many(
        where={"participantId": {"in": list(hackathon_pids)}}
    )

    await db.disconnect()

    if not feature_rows:
        return {"clustered": 0, "message": "No team features found. Run pipeline first."}

    # ----------------------------------------------------------------
    # Build member score lookup: { pid -> { g_i, r_i } }
    # ----------------------------------------------------------------

    member_score_map = {
        row.participantId: {
            "g_i": row.gI or 0.0,
            "r_i": row.rI,
        }
        for row in score_rows
    }

    # ----------------------------------------------------------------
    # Build team → member pid mapping
    # ----------------------------------------------------------------

    team_member_map = {
        t.teamId: [p.participantId for p in t.participant]
        for t in teams
    }

    # ----------------------------------------------------------------
    # Recompute Cᵢ per member with requested weights
    # Then recompute F7 (avg Cᵢ) and F8 (max Cᵢ) per team
    # ----------------------------------------------------------------

    team_ci_map = {}     # { team_id -> { "F7": float, "F8": float } }

    for team_id, pids in team_member_map.items():
        ci_values = []

        for pid in pids:
            if pid not in member_score_map:
                continue

            scores = member_score_map[pid]
            ci     = compute_ci(scores["g_i"], scores["r_i"], w_g=w_g, w_r=w_r)
            ci_values.append(ci)

        if ci_values:
            team_ci_map[team_id] = {
                "F7": sum(ci_values) / len(ci_values),
                "F8": max(ci_values),
            }

    # ----------------------------------------------------------------
    # Build team feature dicts merging DB features + recomputed F7/F8
    # ----------------------------------------------------------------

    feature_map = {}      # { team_id -> full feature dict }

    for row in feature_rows:
        feature_map[row.teamId] = {
            "F1":  row.f1  or 0.0,
            "F2":  row.f2  or 0.0,
            "F3":  row.f3  or 0.0,
            "F4":  row.f4  or 0.0,
            "F5":  row.f5  or 0.0,
            "F6":  row.f6  or 0.0,
            "F7":  team_ci_map.get(row.teamId, {}).get("F7", row.f7 or 0.0),
            "F8":  team_ci_map.get(row.teamId, {}).get("F8", row.f8 or 0.0),
            "F9":  row.f9  or 0.0,
            "F10": row.f10 or 0.0,
            "F11": row.f11 or 0.0,
            "F12": row.f12 or 0.0,
            "F14": row.f14 or 0.0,
            "F15": row.f15 or 0.0,
            "F16": row.f16 or 0.0,
            "F17": row.f17 or 0.0,
        }

    # ----------------------------------------------------------------
    # Select feature keys based on filter mode
    # ----------------------------------------------------------------

    selected_keys = FILTER_FEATURE_MAP.get(filter_mode, FEATURE_KEYS_BOTH)

    # Build filtered feature dicts for cluster_teams
    filtered_features = {
        team_id: {k: features[k] for k in selected_keys}
        for team_id, features in feature_map.items()
    }

    if not filtered_features:
        return {"clustered": 0, "message": "No features available for clustering."}

    # ----------------------------------------------------------------
    # Run KMeans
    # ----------------------------------------------------------------

    clusters = cluster_teams(filtered_features, feature_keys=selected_keys)

    # ----------------------------------------------------------------
    # Upsert TeamResult rows
    # ----------------------------------------------------------------

    db = Prisma()
    await db.connect()

    for team_id, result in clusters.items():
        await db.teamresult.upsert(
            where={"teamId": team_id},
            data={
                "create": {
                    "teamId":       team_id,
                    "clusterLabel": result["cluster"],
                    "level":        result["level"],
                    "teamScore":    result["score"],
                    "selected":     False,
                },
                "update": {
                    "clusterLabel": result["cluster"],
                    "level":        result["level"],
                    "teamScore":    result["score"],
                },
            }
        )

    await db.disconnect()

    return {
        "clustered": len(clusters),
        "message":   f"Clustered {len(clusters)} teams using filter: {filter_mode}.",
    }