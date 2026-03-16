from sklearn.cluster import KMeans
import numpy as np


def cluster_teams(team_features):

    team_ids = list(team_features.keys())

    X = np.array([
        [
            f["F1_mean"],
            f["F2_max"],
            f["F3_variance"],
            f["F4_size"],
            f["F5_sum"],
        ]
        for f in team_features.values()
    ])

    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    labels = kmeans.fit_predict(X)

    clusters = {}

    for team_id, label, vector in zip(team_ids, labels, X):

        # Map cluster to level (simple heuristic)
        mean_strength = vector[0]

        if mean_strength > 0.66:
            level = "Advanced"
        elif mean_strength > 0.33:
            level = "Intermediate"
        else:
            level = "Beginner"

        clusters[team_id] = {
            "cluster": int(label),
            "level": level,
            "score": float(mean_strength),
            "selected": False
        }

    return clusters