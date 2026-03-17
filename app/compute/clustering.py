from sklearn.cluster import KMeans
from sklearn.preprocessing import MinMaxScaler
import numpy as np


# Feature order must match team_feature.py output exactly
FEATURE_KEYS = [
    "F1", "F2", "F3", "F4",
    "F5", "F6",
    "F7", "F8",
    "F9", "F10", "F11",
    "F12",
    "F14", "F15",
    "F16", "F17",
]

# Map KMeans cluster rank (0=lowest, 1=mid, 2=highest) to level label
LEVEL_MAP = {
    0: "Beginner",
    1: "Intermediate",
    2: "Advanced",
}


def cluster_teams(team_features):
    """
    Cluster teams using KMeans on the full 16-feature vector.

    Level (Beginner / Intermediate / Advanced) is assigned by ranking
    the three KMeans cluster centroids on F7 (Average Combined Strength),
    so the label reflects actual relative performance rather than a
    hardcoded threshold on a single feature.

    Returns:
        { team_id -> { "cluster", "level", "score", "selected" } }
    """

    team_ids = list(team_features.keys())

    if len(team_ids) < 3:
        # Not enough teams to form 3 clusters — assign everything Intermediate
        return {
            tid: {
                "cluster":  0,
                "level":    "Intermediate",
                "score":    round(float(team_features[tid].get("F7", 0)), 6),
                "selected": False,
            }
            for tid in team_ids
        }

    # ----------------------------------------------------------------
    # Build feature matrix
    # ----------------------------------------------------------------

    X_raw = np.array([
        [f[key] for key in FEATURE_KEYS]
        for f in team_features.values()
    ], dtype=float)

    # Normalise to [0,1] column-wise so large-magnitude features like
    # F9 (total stars) and F12 (language count) don't dominate distance
    scaler = MinMaxScaler()
    X = scaler.fit_transform(X_raw)

    # ----------------------------------------------------------------
    # KMeans
    # ----------------------------------------------------------------

    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    labels = kmeans.fit_predict(X)

    # ----------------------------------------------------------------
    # Rank clusters by centroid F7 (index of F7 in FEATURE_KEYS = 6)
    # ----------------------------------------------------------------

    F7_index = FEATURE_KEYS.index("F7")

    # Mean raw F7 per cluster label
    cluster_f7_means = {
        label: X_raw[labels == label, F7_index].mean()
        for label in range(3)
    }

    # rank_map: cluster_label -> rank (0=weakest, 2=strongest)
    sorted_labels = sorted(cluster_f7_means, key=cluster_f7_means.get)
    rank_map = {label: rank for rank, label in enumerate(sorted_labels)}

    # ----------------------------------------------------------------
    # Build output
    # ----------------------------------------------------------------

    clusters = {}

    for team_id, label, raw_vec in zip(team_ids, labels, X_raw):

        rank  = rank_map[int(label)]
        level = LEVEL_MAP[rank]
        score = round(float(raw_vec[F7_index]), 6)   # F7 as team score

        clusters[team_id] = {
            "cluster":  int(label),
            "level":    level,
            "score":    score,
            "selected": False,
        }

    return clusters