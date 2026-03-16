def compute_team_features(G):

    n = len(G)

    mean_strength = sum(G) / n
    max_strength = max(G)
    sum_strength = sum(G)
    variance = sum((g - mean_strength) ** 2 for g in G) / n

    return {
        "F1_mean": mean_strength,
        "F2_max": max_strength,
        "F3_variance": variance,
        "F4_size": n,
        "F5_sum": sum_strength
    }