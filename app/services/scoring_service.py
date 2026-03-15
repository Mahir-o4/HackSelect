import math


def compute_dataset_maxima(member_metrics):
    return {
        "S_max": max(m["total_stars"] for m in member_metrics) or 1,
        "A_max": max(m["activity_raw"] for m in member_metrics) or 1,
        "OR_max": max(m["original_repos"] for m in member_metrics) or 1,
        "L_max": max(m["unique_languages"] for m in member_metrics) or 1,
    }


def compute_gi(metrics, maxima):

    S_i = metrics["total_stars"]
    TR_i = metrics["total_repos"]
    OR_i = metrics["original_repos"]
    L_i = metrics["unique_languages"]
    A_raw = metrics["activity_raw"]

    S_max = maxima["S_max"]
    A_max = maxima["A_max"]
    OR_max = maxima["OR_max"]
    L_max = maxima["L_max"]

    #NORMALISING THE METRICS
    stars_score = math.log1p(S_i) / math.log1p(S_max)
    activity_score = A_raw / A_max if A_max > 0 else 0
    originality = OR_i / TR_i if TR_i > 0 else 0
    repo_score = math.log1p(OR_i) / math.log1p(OR_max)
    diversity = L_i / L_max if L_max > 0 else 0

    G_i = (
        0.30 * stars_score +
        0.25 * activity_score +
        0.20 * originality +
        0.15 * repo_score +
        0.10 * diversity
    )

    return G_i