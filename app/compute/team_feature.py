def compute_team_features(members):
    """
    Compute the full 16-feature vector for a team.

    Expected input — `members`: a list of dicts, one per team member:
    {
        "g_i":          float,       # GitHub Score
        "r_i":          float|None,  # Resume Score (None until resume pipeline is active)
        "c_i":          float,       # Combined Score  w_g*G + w_r*R
        "total_stars":  int,         # sum of stars across all their repos
        "repo_stars":   list[int],   # per-repo star counts (for F10 max-star)
        "original_repos": int,       # number of non-fork repos
        "languages":    set[str],    # set of languages used
        "activity_score": float,     # normalised Aᵢ ∈ [0,1]
    }

    Returns a flat dict  F1 … F17  (F13 intentionally absent — reserved).
    Returns None if the member list is empty.
    """

    if not members:
        return None

    n = len(members)

    # ----------------------------------------------------------------
    # Unpack per-member values
    # ----------------------------------------------------------------

    G  = [m["g_i"]            for m in members]
    R  = [m["r_i"] if m["r_i"] is not None else 0.0 for m in members]
    C  = [m["c_i"]            for m in members]
    A  = [m["activity_score"] for m in members]
    OR = [m["original_repos"] for m in members]

    # Per-member total stars (Sᵢ = sum of stars across that member's repos)
    S  = [m["total_stars"]    for m in members]

    # All individual repo star counts across the whole team (for F10)
    all_repo_stars = [
        star
        for m in members
        for star in m.get("repo_stars", [])
    ]

    # Union of all languages across the team (for F12)
    L_team = set()
    for m in members:
        L_team.update(m.get("languages", set()))

    # ----------------------------------------------------------------
    # GitHub Strength  (F1 – F4)
    # ----------------------------------------------------------------

    F1_mean_g = sum(G) / n                                      # Avg GitHub Strength
    F2_max_g  = max(G)                                          # Max GitHub Strength
    F3_min_g  = min(G)                                          # Min GitHub Strength
    F4_var_g  = sum((g - F1_mean_g) ** 2 for g in G) / n       # GitHub Variance

    # ----------------------------------------------------------------
    # Resume Strength  (F5 – F6)
    # ----------------------------------------------------------------

    F5_mean_r = sum(R) / n                                      # Avg Resume Score
    F6_max_r  = max(R)                                          # Max Resume Score

    # ----------------------------------------------------------------
    # Combined Strength  (F7 – F8)
    # ----------------------------------------------------------------

    F7_mean_c = sum(C) / n                                      # Avg Combined Strength
    F8_max_c  = max(C)                                          # Max Combined Strength

    # ----------------------------------------------------------------
    # Impact  (F9 – F11)
    # ----------------------------------------------------------------

    F9_total_stars = sum(S)                                     # Total Stars (team)
    F10_max_star   = max(all_repo_stars) if all_repo_stars else 0  # Max star on a single repo
    F11_avg_or     = sum(OR) / n                                # Avg Original Repos

    # ----------------------------------------------------------------
    # Skill Diversity  (F12)
    # ----------------------------------------------------------------

    F12_lang_diversity = len(L_team)                            # Distinct languages (union)

    # F13 — reserved / intentionally absent

    # ----------------------------------------------------------------
    # Activity  (F14 – F15)
    # ----------------------------------------------------------------

    F14_avg_activity = sum(A) / n                               # Avg Activity Score
    F15_max_activity = max(A)                                   # Max Activity Score

    # ----------------------------------------------------------------
    # Team Composition  (F16 – F17)
    # ----------------------------------------------------------------

    T = 0.6
    F16_size         = n                                        # Team Size
    F17_strong_ratio = sum(1 for g in G if g >= T) / n         # Strong Member Ratio

    return {
        "F1":  F1_mean_g,
        "F2":  F2_max_g,
        "F3":  F3_min_g,
        "F4":  F4_var_g,
        "F5":  F5_mean_r,
        "F6":  F6_max_r,
        "F7":  F7_mean_c,
        "F8":  F8_max_c,
        "F9":  F9_total_stars,
        "F10": F10_max_star,
        "F11": F11_avg_or,
        "F12": F12_lang_diversity,
        # F13 reserved
        "F14": F14_avg_activity,
        "F15": F15_max_activity,
        "F16": F16_size,
        "F17": F17_strong_ratio,
    }