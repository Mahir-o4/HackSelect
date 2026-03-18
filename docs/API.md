# Hackathon Screening API — Route Documentation

---

## 1. `POST /pipeline/run/{hackathon_id}`

### Description

Runs the full data pipeline for a hackathon. Fetches GitHub metrics, processes resumes, computes individual scores (Gᵢ, Rᵢ, Cᵢ), and computes team feature vectors. Results are persisted to the database. This is an **SSE (Server-Sent Events)** endpoint — it streams real-time progress events to the client as each stage completes.

Clustering is **not** triggered here. Call `/teams/cluster/{hackathon_id}` after this completes.

### Input

| Location | Field          | Type     | Description                                 |
| -------- | -------------- | -------- | ------------------------------------------- |
| Path     | `hackathon_id` | `string` | ID of the hackathon to run the pipeline for |

No request body.

### SSE Event Shape

Each event is streamed as a JSON object:

```json
{ "stage": "string", "status": "string", "message": "string" }
```

| Field    | Values                                                                                                                |
| -------- | --------------------------------------------------------------------------------------------------------------------- |
| `stage`  | `init` · `github` · `resume` · `scoring` · `features` · `persistence` ·`(mahir might add some new stage)`· `complete` |
| `status` | `in_progress` · `done` · `error`                                                                                      |

### Example Stream

```
data: {"stage": "init", "status": "in_progress", "message": "Initializing pipeline..."}
data: {"stage": "init", "status": "done", "message": "Found 12 teams and 48 participants."}
data: {"stage": "github", "status": "in_progress", "message": "Fetching GitHub metrics for 48 participants..."}
data: {"stage": "github", "status": "done", "message": "Fetched 45 profiles. 3 failed. 0 already in DB."}
data: {"stage": "resume", "status": "in_progress", "message": "Processing 48 resumes..."}
data: {"stage": "resume", "status": "done", "message": "Processed 46 resumes. 2 failed. 0 already in DB."}
data: {"stage": "scoring", "status": "done", "message": "Computed 45 new scores. 0 already in DB."}
data: {"stage": "features", "status": "done", "message": "Computed features for 12 teams. 0 already in DB."}
data: {"stage": "persistence", "status": "done", "message": "All data saved successfully."}
data: {"stage": "complete", "status": "done", "message": "Pipeline complete. Trigger /teams/cluster to run clustering."}
```

### Special Notes

- **Idempotent** — re-running (after completion of one full call) skips participants and teams already in the database. Safe to call multiple times.
- **Concurrency** — GitHub fetches run at up to 10 concurrent requests. Resume parsing runs at up to 10 concurrent requests with automatic model fallback on rate limits.
- **Resume model fallback** — if the primary Gemini model hits its rate limit, the service automatically switches to the next model in the chain (`gemini-3.1-flash-lite-preview` → `gemini-2.5-flash-lite` → `gemini-2.5-flash`) and stays on that model for the rest of the run (sticky).
- **Testing** — use `curl -N http://localhost:8000/pipeline/run/{hackathon_id}` or an `EventSource` in the browser. Swagger `/docs` does not support SSE.

---

## 2. `POST /teams/cluster/{hackathon_id}`

### Description

Reads stored team features from the database, recomputes Cᵢ (combined individual strength) using the provided weights, builds a filtered feature vector based on `filter_mode`, runs KMeans clustering, and upserts `TeamResult` rows. Can be called multiple times with different filters — results are always overwritten.

### Input

| Location | Field            | Type     | Default  | Description                             |
| -------- | ---------------- | -------- | -------- | --------------------------------------- |
| Path     | `hackathon_id`   | `string` | —        | Hackathon to cluster                    |
| Body     | `filter_mode`    | `string` | `"both"` | Which feature set to use for clustering |
| Body     | `weights.github` | `float`  | `0.7`    | Weight for Gᵢ in Cᵢ computation         |
| Body     | `weights.resume` | `float`  | `0.3`    | Weight for Rᵢ in Cᵢ computation         |

#### `filter_mode` options

| Value      | Features used in KMeans                       | Cᵢ computed as                        |
| ---------- | --------------------------------------------- | ------------------------------------- |
| `"both"`   | All 16 features                               | `0.7·Gᵢ + 0.3·Rᵢ` (or custom weights) |
| `"github"` | GitHub-only features (F1–F4, F9–F12, F14–F17) | `1.0·Gᵢ`                              |
| `"resume"` | Resume-only features (F5, F6, F16, F17)       | `1.0·Rᵢ`                              |

#### Weight normalisation ⚠️

`weights.github + weights.resume` **must equal exactly 1.0**. The backend validates this and returns a `422` if it doesn't. The frontend should normalise weights before sending — if one criterion is unchecked set its weight to `0.0` and divide the other by the total.

### Example Input

```json
{
  "filter_mode": "both",
  "weights": {
    "github": 0.7,
    "resume": 0.3
  }
}
```

### Example Output

```json
{
  "status": "ok",
  "message": "Clustered 12 teams using filter: both.",
  "clustered": 12
}
```

### Special Notes

- **Run pipeline first** — if no team features exist in the DB this returns `clustered: 0`.
- **Upserts** — calling this multiple times is safe. Each call overwrites the previous `TeamResult` for every team.
- **Level assignment** — Beginner / Intermediate / Advanced labels are assigned by ranking the KMeans cluster centroids on the primary score feature (F7 for `"both"`, F1 for `"github"`, F5 for `"resume"`). Labels always reflect relative performance within the dataset, not hardcoded thresholds.
- **Minimum teams** — KMeans requires at least 3 teams. If fewer exist, all teams are assigned `"Intermediate"`.

---

## 3. `POST /teams/{hackathon_id}/autoselect`

### Description

Automatically selects teams for the hackathon based on level quotas and team score ranking. Within each level, teams are ranked by `teamScore` and the top N are selected. If a level has fewer teams than its quota, the shortfall is redistributed to adjacent levels. Selected state is persisted to the database and the full selected list is returned for the UI to display.

### Input

| Location | Field              | Type      | Description                                               |
| -------- | ------------------ | --------- | --------------------------------------------------------- |
| Path     | `hackathon_id`     | `string`  | Hackathon to select teams for                             |
| Body     | `max_teams`        | `integer` | Total number of teams to select                           |
| Body     | `beginner_pct`     | `float`   | Fraction of `max_teams` to select from Beginner level     |
| Body     | `intermediate_pct` | `float`   | Fraction of `max_teams` to select from Intermediate level |
| Body     | `advanced_pct`     | `float`   | Fraction of `max_teams` to select from Advanced level     |

#### Percentage normalisation ⚠️

`beginner_pct + intermediate_pct + advanced_pct` **must equal exactly 1.0**. The backend validates this and returns a `422` if it doesn't. The frontend should enforce this before sending — same pattern as weight normalisation above.

#### Quota calculation

Each level quota is computed as `floor(max_teams * pct)`. If a level has fewer available teams than its quota, the shortfall is redistributed:

- Beginner shortfall → Intermediate first, then Advanced
- Advanced shortfall → Intermediate first, then Beginner
- Intermediate shortfall → Advanced first, then Beginner

Total selected will never exceed `max_teams`.

### Example Input

```json
{
  "max_teams": 20,
  "beginner_pct": 0.2,
  "intermediate_pct": 0.5,
  "advanced_pct": 0.3
}
```

### Example Output

```json
{
  "status": "ok",
  "message": "Auto-selected 20 teams.",
  "total_selected": 20,
  "breakdown": {
    "Beginner": 4,
    "Intermediate": 10,
    "Advanced": 6
  },
  "selected": [
    {
      "teamId": "team_abc123",
      "teamName": "Team Alpha",
      "level": "Advanced",
      "teamScore": 0.812345
    },
    {
      "teamId": "team_xyz456",
      "teamName": "Team Beta",
      "level": "Intermediate",
      "teamScore": 0.654321
    }
  ]
}
```

### Special Notes

- **Run clustering first** — if no `TeamResult` rows exist this returns an empty selected list.
- **Overwrites previous selection** — running autoselect multiple times replaces the previous selection entirely.
- **`selected` list is unordered by level** — sort on the frontend if needed.
- **This is not final** — the returned list is meant for manual review. Use `PUT /teams/{hackathon_id}/selection` to save the final selection after review.

---

## 4. `PUT /teams/{hackathon_id}/selection`

### Description

Saves the final team selection after manual review. Sets `selected = true` for all teams in the provided list and `selected = false` for all other teams in the hackathon. This is a full replacement — whatever is sent is exactly what gets saved.

### Input

| Location | Field               | Type       | Description                                        |
| -------- | ------------------- | ---------- | -------------------------------------------------- |
| Path     | `hackathon_id`      | `string`   | Hackathon to save selection for                    |
| Body     | `selected_team_ids` | `string[]` | List of team IDs that should be marked as selected |

### Example Input

```json
{
  "selected_team_ids": ["team_abc123", "team_xyz456", "team_def789"]
}
```

### Example Output

```json
{
  "status": "ok",
  "message": "Selection saved. 3 teams selected.",
  "total_selected": 3,
  "total_unselected": 17
}
```

### Special Notes

- **Full replacement** — any team not in `selected_team_ids` will be set to `selected = false`, including teams that were previously selected by autoselect or a previous call to this route.
- **Empty list is valid** — sending `selected_team_ids: []` will deselect all teams.
- **No validation on team IDs** — if a `teamId` in the list does not belong to the hackathon it will simply not match any rows and be silently ignored.
- **Typical flow** — call `/autoselect` first to get an initial list, let the organiser review and edit it in the UI, then call this route with the final list when they click Save.
