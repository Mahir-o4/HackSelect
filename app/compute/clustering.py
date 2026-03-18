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


def cluster_teams(team_features, feature_keys=None):
    """
    Cluster teams using KMeans on the provided feature vector.

    Args:
        team_features: { team_id -> { feature_key: value, ... } }
        feature_keys:  List of feature keys to use. Defaults to full FEATURE_KEYS.
                       Pass a filtered list from clustering_service for github/resume modes.

    Level (Beginner / Intermediate / Advanced) is assigned by ranking
    the three KMeans cluster centroids on the primary ranking feature:
        - F7 if present (combined strength, used for "both" mode)
        - F1 if F7 absent (github strength, used for "github" mode)
        - F5 if neither present (resume strength, used for "resume" mode)

    Returns:
        { team_id -> { "cluster", "level", "score", "selected" } }
    """

    if feature_keys is None:
        feature_keys = FEATURE_KEYS

    team_ids = list(team_features.keys())

    # Pick the best available ranking feature
    if "F7" in feature_keys:
        rank_feature = "F7"
    elif "F1" in feature_keys:
        rank_feature = "F1"
    else:
        rank_feature = "F5"

    rank_index = feature_keys.index(rank_feature)

    if len(team_ids) < 3:
        # Not enough teams to form 3 clusters — assign everything Intermediate
        return {
            tid: {
                "cluster":  0,
                "level":    "Intermediate",
                "score":    round(float(team_features[tid].get(rank_feature, 0)), 6),
                "selected": False,
            }
            for tid in team_ids
        }

    # ----------------------------------------------------------------
    # Build feature matrix
    # ----------------------------------------------------------------

    X_raw = np.array([
        [f[key] for key in feature_keys]
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
    # Rank clusters by centroid of primary ranking feature
    # ----------------------------------------------------------------

    cluster_rank_means = {
        label: X_raw[labels == label, rank_index].mean()
        for label in range(3)
    }

    sorted_labels = sorted(cluster_rank_means, key=cluster_rank_means.get)
    rank_map = {label: rank for rank, label in enumerate(sorted_labels)}

    # ----------------------------------------------------------------
    # Build output
    # ----------------------------------------------------------------

    clusters = {}

    for team_id, label, raw_vec in zip(team_ids, labels, X_raw):

        rank  = rank_map[int(label)]
        level = LEVEL_MAP[rank]
        score = round(float(raw_vec[rank_index]), 6)

        clusters[team_id] = {
            "cluster":  int(label),
            "level":    level,
            "score":    score,
            "selected": False,
        }

    return clusters