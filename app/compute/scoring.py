import math


def compute_dataset_maxima(member_metrics):
    """
    Compute dataset-wide maxima for normalization.
    All maxima default to 1 to avoid division by zero.
    """
    return {
        "S_max":  max(m["total_stars"]      for m in member_metrics) or 1,
        "F_max":  max(m["total_forks"]      for m in member_metrics) or 1,
        "OR_max": max(m["original_repos"]   for m in member_metrics) or 1,
        "L_max":  max(m["unique_languages"] for m in member_metrics) or 1,
        "A_max":  max(m["activity_raw"]     for m in member_metrics) or 1,
    }


def compute_gi(metrics, maxima):
    """
    Compute normalised GitHub Score (Gᵢ) for a single member.

    Components (all normalised to [0, 1]):
        stars_score  — log-normalised total stars received
        forks_score  — log-normalised total forks received
        activity     — normalised activity score from events
        originality  — fraction of repos that are original (not forked)
        repo_score   — log-normalised original repo count
        diversity    — normalised unique language count

    Weights sum to 1.0.
    """

    S_i  = metrics["total_stars"]
    F_i  = metrics["total_forks"]
    TR_i = metrics["total_repos"]
    OR_i = metrics["original_repos"]
    L_i  = metrics["unique_languages"]
    A_raw = metrics["activity_raw"]

    S_max  = maxima["S_max"]
    F_max  = maxima["F_max"]
    OR_max = maxima["OR_max"]
    L_max  = maxima["L_max"]
    A_max  = maxima["A_max"]

    # --- Normalised components ---
    stars_score  = math.log1p(S_i)  / math.log1p(S_max)
    forks_score  = math.log1p(F_i)  / math.log1p(F_max)
    activity     = A_raw / A_max    if A_max  > 0 else 0
    originality  = OR_i  / TR_i     if TR_i   > 0 else 0
    repo_score   = math.log1p(OR_i) / math.log1p(OR_max)
    diversity    = L_i   / L_max    if L_max  > 0 else 0

    G_i = (
        0.25 * stars_score  +
        0.10 * forks_score  +
        0.25 * activity     +
        0.15 * originality  +
        0.15 * repo_score   +
        0.10 * diversity
    )

    return round(G_i, 6)


def compute_activity_score(activity_raw, a_max):
    """
    Normalise a single member's raw activity score against the dataset maximum.
    Kept as a standalone helper so pipeline.py and team_feature.py
    can call it without re-running the full Gᵢ computation.
    """
    return activity_raw / a_max if a_max > 0 else 0


def compute_ci(g_i, r_i, w_g=0.7, w_r=0.3):
    """
    Compute Combined Individual Strength (Cᵢ).

        Cᵢ = w_g * Gᵢ + w_r * Rᵢ

    Rᵢ defaults to 0.0 until resume scoring is active.
    """
    r_i = r_i if r_i is not None else 0.0
    return round(w_g * g_i + w_r * r_i, 6)