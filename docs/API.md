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

<br/><br/><br/>

---

# Summary API Documentation

## Overview

The Summary API generates and retrieves AI-powered team summaries for hackathon participants. Each summary is produced by a large language model (Gemini) that analyses a team's resume data and GitHub activity, then produces a structured JSON breakdown of each member and the team as a whole.

Summaries are generated as part of the main data pipeline — you do not call the generate endpoint manually. Once the pipeline runs, summaries are stored in the `TeamSummary` table and can be retrieved via the GET endpoints below.

---

## How It Works

```
Pipeline run
  └── For each team in the hackathon
        ├── Reads resume raw text (from Resume table/ now from in-memory data)
        ├── Reads GitHub repos (from GithubRepo table/ now from in-memory data)
        ├── Builds a structured prompt with member data
        └── Calls Gemini LLM → stores result in TeamSummary table
```

The LLM receives each team's member data formatted as:

```
TEAM NAME: AlgoNova

--- Member 1: Mark ---
RESUME:
  <raw resume text, up to 3000 characters>

GITHUB REPOS:
  - my-project | Python | ★12
  - portfolio  | TypeScript | ★3 [fork]
```

It returns a structured JSON object conforming to the `TeamSummaryOutput` schema. This is stored as a JSON string in the `summaryText` column of the `TeamSummary` table.

The LLM call uses a **model fallback chain** — if the primary model hits a quota limit or times out, it automatically switches to the next model in the chain and retries. All calls have a 60-second timeout per model.

---

## Base URL

```
http://localhost:8000/summary
```

---

## Endpoints

---

### `GET /summary/all/{hackathon_id}`

Retrieves all stored team summaries for a specific hackathon.

#### Path Parameters

| Parameter      | Type     | Required | Description                        |
| -------------- | -------- | -------- | ---------------------------------- |
| `hackathon_id` | `string` | ✅       | Unique identifier of the hackathon |

#### Response — `200 OK`

Returns a list of `TeamSummaryResponse` objects.

```json
[
  {
    "teamId": "team_abc123",
    "teamName": "AlgoNova",
    "hackathonId": "hack_2024",
    "summary": {
      "team_name": "AlgoNova",
      "team_summary": "A technically strong team with deep ML expertise...",
      "strengths": ["Strong GitHub activity", "Diverse skill set"],
      "weaknesses": ["Limited hackathon experience"],
      "selection_verdict": "Highly recommended due to strong technical foundation.",
      "members": [
        {
          "name": "Mark",
          "summary": "Full-stack developer with strong ML background...",
          "skills": ["Python", "TypeScript", "React", "FastAPI"],
          "projects": ["Oceanography LLM", "3D Portfolio Website"],
          "education": "undergraduate",
          "experience": "1 year internship experience in web development",
          "qualities": ["Fast learner", "Strong problem solver"],
          "github_highlights": ["12 original repos", "Active open source contributor"],
          "hackathon_ready": true
        }
      ]
    }
  },
  {
    "teamId": "1cwds1c54wa8",
    "teamName": "HomeCore",
    "hackathonId": "yu876uhs",
    "summary": {
      "team_name": "HomeCore",
      "team_summary": "HomeCore is an exceptionally high-caliber team of ..."
      "strengths": [
        "Extensive open-source maintenance experience",
        "Deep expertise in CI/CD and automation tooling",
        "Strong cross-language proficiency (Python, C++, Rust, TypeScript)",
        "Proven track record of managing large contributor communities"
      ],
      "weaknesses": [
        "Potential over-engineering tendencies given their background in complex systems",
        "Limited evidence of rapid UI/UX prototyping in their recent GitHub activity"
      ],
      "selection_verdict": "Highly recommended. This team is overqualified for most hackathons and will likely deliver a highly polished, technically robust, and well-documented project. They are a 'must-select' for any event aiming for high-quality technical output.",
      "members": [
        {
          "name": "Franck Nijhof",
          "summary": "A world-class open-source maintainer and lead engineer for Home Assistant with over a decade of experience. He specializes in building scalable IoT ecosystems and high-impact developer tooling.",
          "skills": [
            "Python",
            "Home Assistant",
            "Docker",
            "GitHub Actions",
            "Jinja",
            "Shell",
            "Open Source Governance"
          ],
          "projects": [
            "Home Assistant (Lead Maintainer)",
            "Home Assistant Community Add-ons"
          ],
          "education": "Software Engineering, Saxion University of Applied Sciences",
          "experience": "Lead Engineer & Open Sourcerer at Open Home Foundation / Nabu Casa (10+ years)",
          "qualities": [
            "Community leadership",
            "Technical mentorship",
            "Infrastructure automation"
          ],
          "github_highlights": [
            "Prolific contributor to Home Assistant ecosystem",
            "Extensive library of GitHub Actions for automation",
            "High-impact maintainer of widely used OSS projects"
          ],
          "hackathon_ready": true
        },
        {
          "name": "Alfi Maulana",
          "summary": "A robotics and embedded systems engineer with a strong focus on C++ and ROS2 ...",
          "skills": [
            "C++",
            "TypeScript",
            "Python",
            "Rust",
            "ROS2",
            "CMake",
            "CI/CD"
          ],
          "projects": [
            "ROS2 open-source libraries",
            "Automated CI/CD toolchain for robotics"
          ],
          "education": "B.Eng. Electrical Engineering, Institut Teknologi Sepuluh Nopember (ITS)",
          "experience": "Robotics & C++ Engineer (Independent/Open Source) (4+ years)",
          "qualities": [
            "Embedded systems expertise",
            "Tooling automation",
            "Cross-platform development"
          ],
          "github_highlights": [
            "6,450+ contributions",
            "Maintainer of ROS2-related libraries",
            "Active in C++ and Rust open-source development"
          ],
          "hackathon_ready": true
        }
      ]
    }
  }
]
```

#### Response Schema — `TeamSummaryResponse`

| Field         | Type             | Description                                   |
| ------------- | ---------------- | --------------------------------------------- |
| `teamId`      | `string`         | Unique team identifier                        |
| `teamName`    | `string \| null` | Display name of the team                      |
| `hackathonId` | `string \| null` | Hackathon the team belongs to                 |
| `summary`     | `object \| null` | Parsed LLM summary (see Summary Object below) |

#### Error Responses

| Status | Description                       |
| ------ | --------------------------------- |
| `422`  | Invalid or missing `hackathon_id` |

---

### `GET /summary/{team_id}`

Retrieves the stored summary for a single team by its ID.

#### Path Parameters

| Parameter | Type     | Required | Description                   |
| --------- | -------- | -------- | ----------------------------- |
| `team_id` | `string` | ✅       | Unique identifier of the team |

#### Response — `200 OK`

Returns a single `TeamSummaryResponse` object.

```json
{
  "teamId": "team_abc123",
  "teamName": "AlgoNova",
  "hackathonId": "hack_2024",
  "summary": {
    "team_name": "AlgoNova",
    "team_summary": "A technically strong team with deep ML expertise...",
    "strengths": ["Strong GitHub activity", "Diverse skill set"],
    "weaknesses": ["Limited hackathon experience"],
    "selection_verdict": "Highly recommended due to strong technical foundation.",
    "members": [...]
  }
}
```

#### Error Responses

| Status | Description                              |
| ------ | ---------------------------------------- |
| `404`  | No summary found for the given `team_id` |
| `422`  | Invalid or missing `team_id`             |

---

## Summary Object Schema

This is the structure of the `summary` field returned in all responses. It is produced by the Gemini LLM and stored as JSON.

### Team-level fields

| Field               | Type              | Description                                       |
| ------------------- | ----------------- | ------------------------------------------------- |
| `team_name`         | `string`          | Name of the team                                  |
| `team_summary`      | `string`          | 3–4 sentence overall analysis of the team         |
| `strengths`         | `string[]`        | Top team-level strengths                          |
| `weaknesses`        | `string[]`        | Gaps or weaknesses in the team                    |
| `selection_verdict` | `string`          | LLM recommendation on whether to select this team |
| `members`           | `MemberSummary[]` | Per-member breakdown (see below)                  |

### Member-level fields — `MemberSummary`

| Field               | Type             | Description                                            |
| ------------------- | ---------------- | ------------------------------------------------------ |
| `name`              | `string`         | Member's name                                          |
| `summary`           | `string`         | 2–3 sentence professional summary                      |
| `skills`            | `string[]`       | All technical and soft skills extracted                |
| `projects`          | `string[]`       | Notable projects with brief descriptions               |
| `education`         | `string \| null` | Education background                                   |
| `experience`        | `string \| null` | Work or internship experience summary                  |
| `qualities`         | `string[]`       | Stand-out personal or professional qualities           |
| `github_highlights` | `string[]`       | Notable GitHub activity, top repos, languages          |
| `hackathon_ready`   | `boolean`        | `true` if the member seems well-suited for a hackathon |

---

## Notes

**Summaries are idempotent** — if a team already has a summary in the database, the pipeline skips it. Re-running the pipeline will not overwrite existing summaries unless the row is manually deleted.

**Data sources** — the LLM only sees data that has already been processed and stored by the pipeline. If a participant has no resume or no GitHub username, those fields will be marked as `Not available` in the prompt, and the LLM will do its best with partial data. This may lower the `confidence` field in the comparison endpoint.

**Model fallback** — summaries are generated using a chain of Gemini models ordered by quota availability. If one model is rate-limited or times out, the service automatically switches to the next model and retries without failing the request.

**Storage format** — summaries are stored as a JSON string in the `summaryText` column. The GET endpoints parse and return this as a structured object — you never need to parse it yourself.

<br/><br/><br/>

---

# Compare API Documentation

## Overview

The Compare API takes two teams that already have stored summaries and runs an AI-powered head-to-head comparison between them. It analyses both teams across multiple dimensions — skills, experience, projects, GitHub activity, and more — then provides a structured breakdown with a recommendation on which team to select.

Unlike the Summary API which runs as part of the pipeline, the Compare endpoint is called **on demand** — any time you want to compare two specific teams.

---

## How It Works

```
GET /compare/?team=teamId1&compare=teamId2
  └── Fetch TeamSummary rows for both teams from DB
  └── Parse stored JSON summaries
  └── Format both summaries into a single structured prompt
  └── Call Gemini LLM → returns structured comparison
  └── Return CompareResponse to client
```

The LLM receives both team summaries formatted side by side:

```
=== TEAM A ===
TEAM: AlgoNova
Overall: A technically strong team with deep ML expertise...
Strengths: Strong GitHub activity, Diverse skill set
Weaknesses: Limited hackathon experience
Verdict: Highly recommended due to strong technical foundation.

  Member: Mahir
    Summary:    Full-stack developer with strong ML background...
    Skills:     Python, TypeScript, React, FastAPI
    Projects:   Oceanography LLM, 3D Portfolio Website
    Education:  undergraduate
    Experience: 1 year internship in web development
    Qualities:  Fast learner, Strong problem solver
    GitHub:     12 original repos, Active open source contributor
    Hackathon ready: True

=== TEAM B ===
TEAM: NodeNexus
...
```

The LLM then evaluates both teams across 9 dimensions, picks an edge winner per dimension, writes an overall summary, and gives a recommendation — without completely dismissing either team.

The same **model fallback chain** used in the Summary service applies here — if a model hits quota limits or times out, it switches to the next model automatically.

---

## Base URL

```
http://localhost:8000/compare
```

---

## Endpoints

---

### `GET /compare/`

Compares two teams using their stored LLM summaries and returns a structured analysis.

#### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `team` | `string` | ✅ | Team A — the primary team to compare |
| `compare` | `string` | ✅ | Team B — the team to compare against |

Both parameters must be valid team IDs that already have a summary stored in the database. If either team has not been processed by the pipeline yet, a `404` is returned.

#### Example Request

```
GET /compare/?team=team_abc123&compare=team_xyz456
```

#### Response — `200 OK`

Returns a `CompareResponse` object.

```json
{
  "team_a_id": "team_abc123",
  "team_b_id": "team_xyz456",
  "team_a_name": "AlgoNova",
  "team_b_name": "NodeNexus",
  "dimensions": [
    {
      "dimension": "Technical Skills",
      "team_a": "AlgoNova has a broad skill set spanning ML, full-stack, and cloud technologies with Python and TypeScript as core strengths.",
      "team_b": "NodeNexus demonstrates strong backend expertise in Node.js and databases but has narrower frontend coverage.",
      "edge": "team_a"
    },
    {
      "dimension": "Experience",
      "team_a": "Members have internship experience in web development and research, totalling roughly 1–2 years collectively.",
      "team_b": "NodeNexus members have slightly more industry exposure with one member having a part-time role at a startup.",
      "edge": "team_b"
    },
    {
      "dimension": "Education",
      "team_a": "All members are undergraduate students at reputable institutions with strong academic records.",
      "team_b": "Similar educational background — undergraduate level with one postgraduate member.",
      "edge": "tie"
    },
    {
      "dimension": "Projects",
      "team_a": "AlgoNova has diverse projects including an LLM application, a 3D portfolio, and a collaborative coding platform.",
      "team_b": "NodeNexus projects are backend-heavy with a strong focus on APIs and data pipelines.",
      "edge": "team_a"
    },
    {
      "dimension": "GitHub Activity",
      "team_a": "High activity with 12+ original repos, consistent commit history, and open source contributions.",
      "team_b": "Moderate GitHub presence with fewer original repos but well-maintained projects.",
      "edge": "team_a"
    },
    {
      "dimension": "Hackathon Readiness",
      "team_a": "All members flagged as hackathon ready with prior participation noted in resumes.",
      "team_b": "Two of three members are hackathon ready; one member lacks relevant experience.",
      "edge": "team_a"
    },
    {
      "dimension": "Team Strengths",
      "team_a": "Strong cross-functional coverage, active GitHub presence, and ML/AI expertise.",
      "team_b": "Solid backend engineering depth and good collaboration history.",
      "edge": "team_a"
    },
    {
      "dimension": "Team Weaknesses",
      "team_a": "Limited industry experience and some gaps in DevOps knowledge.",
      "team_b": "Narrower skill coverage and lower hackathon participation history.",
      "edge": "tie"
    },
    {
      "dimension": "Motivation & Qualities",
      "team_a": "Members demonstrate curiosity and initiative through diverse side projects and research interests.",
      "team_b": "Focused and goal-oriented team with a clear product vision but less breadth of interests.",
      "edge": "team_a"
    }
  ],
  "overall_summary": "Both teams are technically capable and show genuine potential. AlgoNova has broader technical coverage and stronger GitHub activity, while NodeNexus brings focused backend depth and some industry exposure. The gap is not large — both teams would add value to the hackathon.",
  "recommendation": "AlgoNova is the stronger pick given their broader skill set, higher GitHub activity, and stronger hackathon readiness across all members. That said, NodeNexus should not be dismissed — their backend depth and industry exposure make them a competitive alternative if AlgoNova is unavailable.",
  "confidence": "high"
}
```

---

## Response Schema — `CompareResponse`

| Field | Type | Description |
|---|---|---|
| `team_a_id` | `string` | ID of Team A (from `team` query param) |
| `team_b_id` | `string` | ID of Team B (from `compare` query param) |
| `team_a_name` | `string \| null` | Display name of Team A |
| `team_b_name` | `string \| null` | Display name of Team B |
| `dimensions` | `DimensionComparison[]` | Per-dimension breakdown (see below) |
| `overall_summary` | `string` | Neutral 3–4 sentence holistic analysis of both teams |
| `recommendation` | `string` | Which team to select and why, without discarding the other |
| `confidence` | `"high" \| "medium" \| "low"` | How confident the LLM is based on data richness |

---

## Dimension Schema — `DimensionComparison`

Each entry in the `dimensions` array represents one comparison axis.

| Field | Type | Description |
|---|---|---|
| `dimension` | `string` | Name of the comparison dimension |
| `team_a` | `string` | Analysis of Team A on this dimension |
| `team_b` | `string` | Analysis of Team B on this dimension |
| `edge` | `"team_a" \| "team_b" \| "tie"` | Which team has the advantage on this dimension |

### Dimensions evaluated

| Dimension | What it looks at |
|---|---|
| Technical Skills | Languages, frameworks, tools across all members |
| Experience | Internships, part-time roles, research experience |
| Education | Highest education level across members |
| Projects | Quality, diversity, and complexity of projects |
| GitHub Activity | Repo count, stars, forks, commit consistency, open source |
| Hackathon Readiness | Prior hackathon participation, speed, adaptability |
| Team Strengths | Top collective advantages of the team |
| Team Weaknesses | Gaps, blind spots, or missing skills |
| Motivation & Qualities | Personal drive, curiosity, leadership, initiative |

---

## Confidence Field

The `confidence` field reflects how much data the LLM had to work with:

| Value | Meaning |
|---|---|
| `high` | Both teams have rich resume and GitHub data |
| `medium` | One or both teams have partial data (missing resume or GitHub) |
| `low` | Significant data gaps — analysis may be less reliable |

---

## Error Responses

| Status | Condition | Detail |
|---|---|---|
| `400` | `team` and `compare` are the same ID | `"team and compare must be different team IDs."` |
| `404` | Team A has no summary in DB | `"No summary found for team {id}. Run the pipeline first."` |
| `404` | Team B has no summary in DB | `"No summary found for team {id}. Run the pipeline first."` |
| `500` | Stored summary JSON is corrupted | `"Failed to parse stored team summaries. Data may be corrupted."` |
| `500` | All LLM models exhausted | `"LLM comparison failed. All models exhausted."` |
| `422` | Missing or invalid query parameters | FastAPI validation error |

---

## Notes

**Prerequisites** — both teams must have summaries stored before calling this endpoint. Run the pipeline first via `POST /pipeline/run/{hackathon_id}`. If either team is missing a summary a `404` is returned with a clear message.

**On-demand** — unlike summary generation which is part of the pipeline, comparison is triggered manually per request. Each call makes a fresh LLM request — results are not cached or stored.

**Recommendation is not a hard decision** — the LLM is instructed to suggest one team while acknowledging the other's strengths. It never completely dismisses a team. Use the `dimensions` breakdown and `overall_summary` for deeper analysis alongside the `recommendation`.

**Order matters for labelling** — the team passed as `team` is always `team_a` and the team passed as `compare` is always `team_b` in the response. The `edge` field uses `"team_a"` and `"team_b"` as identifiers — map these back to `team_a_name` and `team_b_name` for display.

**Model fallback** — if the primary Gemini model hits a quota limit or times out, the service automatically switches to the next model in the chain and retries. This is transparent to the client — you will still receive a `200 OK` if any model succeeds.

---
<br><br>

# Agent API Documentation

## Overview

The Agent API provides a conversational AI interface that lets users query the hackathon database using natural language. Instead of writing SQL or navigating the API manually, users can ask plain English questions like *"Tell me about team AlgoNova"* or *"Who has the highest composite score?"* and receive detailed, human-readable responses.

The agent is scoped to a specific hackathon — it can only access data belonging to the hackathon ID provided in the request. It cannot query data from other hackathons.

---

## How It Works

```
POST /agent/chat
  └── Look up or create session in memory
  └── Append user message to conversation history
  └── Create LangGraph ReAct agent scoped to hackathon
  └── Agent thinks → generates SQL → calls execute_sql tool
  └── execute_sql runs query against NeonDB
  └── Agent reads results → formulates human-readable response
  └── Stream response tokens to client via SSE
  └── Save completed response to session history
```

### The ReAct Loop

The agent uses a **Reason + Act** loop internally:

```
User: "Tell me about team AlgoNova"
  ↓
Agent thinks: "I need to query the team and participant tables"
  ↓
Calls execute_sql("SELECT ... FROM team WHERE teamName ILIKE 'AlgoNova'")
  ↓
Gets raw DB rows back
  ↓
Agent thinks: "Now I can answer the question"
  ↓
Streams: "AlgoNova is a team of 4 members with strong ML expertise..."
```

For complex questions the agent may call `execute_sql` multiple times before answering — for example joining team data with GitHub profiles and member scores in separate queries.

### Model Fallback Chain

If the primary model hits a quota limit or times out, the agent automatically switches to the next model in the chain and retries the entire request. This is transparent to the client.

### Session History

Every conversation is tracked by a `session_id`. The full message history is passed to the agent on every request, enabling follow-up questions with full context.

---

## Base URL

```
http://localhost:8000/agent
```

---

## Endpoints

---

### `POST /agent/chat`

Sends a message to the conversational agent and streams the response via SSE.

#### Request Body

```json
{
  "hackathon_id": "hack_abc123",
  "session_id": null,
  "message": "Tell me about team AlgoNova"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `hackathon_id` | `string` | ✅ | Scopes the conversation to this hackathon. Agent will only query data belonging to this hackathon. |
| `session_id` | `string \| null` | ❌ | Session ID from a previous response. Send `null` or omit to start a new conversation. |
| `message` | `string` | ✅ | The user's natural language question. Min length 1. |

#### SSE Event Stream

The response is a **Server-Sent Events (SSE)** stream. Each event is a JSON object with a `type` field.

**Event order:**
```
1. meta event    — always first, contains session_id
2. token events  — repeated, one per text chunk
3. done event    — signals stream is complete
```

**On error:**
```
1. meta event    — always first
2. error event   — stream ends
```

---

#### Event: `meta`

Always the first event. Contains the `session_id` — save this and reuse it on follow-up requests.

```
data: {"type": "meta", "session_id": "550e8400-e29b-41d4-a716-446655440000"}
```

| Field | Type | Description |
|---|---|---|
| `type` | `"meta"` | Event type identifier |
| `session_id` | `string` | UUID for this conversation session — reuse on follow-ups |

---

#### Event: `token`

Streamed text chunks from the LLM. Concatenate all `data` values in order to reconstruct the full response.

```
data: {"type": "token", "data": "AlgoNova is a team of"}
data: {"type": "token", "data": " 4 members with strong"}
data: {"type": "token", "data": " ML expertise..."}
```

| Field | Type | Description |
|---|---|---|
| `type` | `"token"` | Event type identifier |
| `data` | `string` | Text fragment — part of the full response |

---

#### Event: `done`

Signals that the stream is complete. No more token events will follow.

```
data: {"type": "done", "data": ""}
```

| Field | Type | Description |
|---|---|---|
| `type` | `"done"` | Event type identifier |
| `data` | `""` | Always empty string |

---

#### Event: `error`

Sent if something goes wrong. Stream ends after this event.

```
data: {"type": "error", "data": "All models exhausted. Try again later."}
```

| Field | Type | Description |
|---|---|---|
| `type` | `"error"` | Event type identifier |
| `data` | `string` | Error message describing what went wrong |

---

#### Example — First message

```bash
curl -X POST http://127.0.0.1:8000/agent/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"hackathon_id": "hack_abc123", "message": "Tell me about team AlgoNova"}' \
  --no-buffer
```

Response:
```
data: {"type": "meta", "session_id": "550e8400-e29b-41d4-a716-446655440000"}

data: {"type": "token", "data": "AlgoNova is a team of 4 members"}
data: {"type": "token", "data": " participating in this hackathon..."}

data: {"type": "done", "data": ""}
```

---

#### Example — Follow-up message

```bash
curl -X POST http://127.0.0.1:8000/agent/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"hackathon_id": "hack_abc123", "session_id": "550e8400-e29b-41d4-a716-446655440000", "message": "Who has the highest composite score?"}' \
  --no-buffer
```

The agent remembers context from the previous turn — it knows you were asking about AlgoNova and will scope its answer accordingly.

---

#### Error Responses (HTTP)

| Status | Condition | Detail |
|---|---|---|
| `400` | `session_id` provided belongs to a different `hackathon_id` | `"Session X belongs to hackathon Y, not Z."` |
| `422` | Missing required fields or validation failure | FastAPI validation error |

---

### `DELETE /agent/chat/{session_id}`

Clears the conversation history for a session. Use this when the user wants to start a completely fresh conversation.

#### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `session_id` | `string` | ✅ | The session ID to clear |

#### Example

```bash
curl -X DELETE http://127.0.0.1:8000/agent/chat/550e8400-e29b-41d4-a716-446655440000
```

#### Response — `200 OK`

```json
{
  "status": "ok",
  "message": "Session 550e8400-e29b-41d4-a716-446655440000 cleared."
}
```

If the session does not exist:

```json
{
  "status": "ok",
  "message": "Session not found — nothing to clear."
}
```

---

### `GET /agent/sessions`

Returns all active session IDs and their message counts. Useful for debugging.

#### Example

```bash
curl http://127.0.0.1:8000/agent/sessions
```

#### Response — `200 OK`

```json
{
  "sessions": {
    "550e8400-e29b-41d4-a716-446655440000": {
      "hackathon_id": "hack_abc123",
      "message_count": 6
    },
    "b3f8c1d2-1234-5678-abcd-ef0123456789": {
      "hackathon_id": "hack_xyz789",
      "message_count": 2
    }
  }
}
```

| Field | Type | Description |
|---|---|---|
| `hackathon_id` | `string` | Hackathon this session is scoped to |
| `message_count` | `integer` | Total messages in history (user + assistant combined) |

---

## Conversation Flow

### Starting a conversation

```
1. Send POST /agent/chat with hackathon_id and message, no session_id
2. Read the meta event → save the session_id
3. Read token events → render streaming response to user
4. Wait for done event → conversation turn complete
```

### Continuing a conversation

```
1. Send POST /agent/chat with same hackathon_id, session_id, and new message
2. Agent has full history → understands follow-up context
3. Read token events → render streaming response
4. Wait for done event
```

### Ending a conversation

```
1. Send DELETE /agent/chat/{session_id}
2. Session history cleared from memory
3. Next message with null session_id starts a fresh conversation
```

---

## What You Can Ask

The agent has read access to these tables scoped to your hackathon:

| Table | What you can ask |
|---|---|
| `team` | Team names, list of all teams, team details |
| `participant` | Member names, GitHub usernames, emails, LinkedIn |
| `githubProfile` | Total repos, stars, forks, activity scores |
| `githubRepo` | Individual repos, languages, stars |
| `resume` | Resume scores, raw text analysis |
| `memberScore` | gI (GitHub score), rI (Resume score), cI (Composite score) |
| `teamFeature` | ML feature vectors computed per team |
| `teamSummary` | AI-generated team and member summaries |

### Example questions

```
"List all teams in this hackathon"
"Tell me about team AlgoNova"
"Who has the highest composite score?"
"Which team has the most GitHub stars?"
"Show me all participants who are hackathon ready"
"Compare the GitHub activity of AlgoNova and NodeNexus"
"Which teams have not been summarised yet?"
"Who are the members of team DataStream?"
"What programming languages does team BioCode use?"
```

---

## Score Reference

When the agent mentions scores, they mean:

| Score | Full name | Range | What it measures |
|---|---|---|---|
| `gI` | GitHub Score | 0–1 | Activity, repos, languages, contributions |
| `rI` | Resume Score | 0–1 | Skills, projects, experience, education |
| `cI` | Composite Score | 0–1 | Weighted combination of gI and rI |

---

## Notes

**Session persistence** — sessions are stored in server memory. They are lost on server restart. If a session is lost, start a new conversation by omitting `session_id`.

**Hackathon scoping** — the agent is strictly scoped to the provided `hackathon_id`. Every SQL query it generates automatically filters by this hackathon. It cannot access data from other hackathons even if asked.

**Session and hackathon mismatch** — if you send a `session_id` that was created for a different `hackathon_id`, the server returns a `400` error. Each session is permanently tied to the hackathon it was created for.

**Streaming** — the `--no-buffer` flag is required when testing with curl. Without it, curl buffers the response and you won't see tokens as they stream in.

**Read-only** — the agent can only execute `SELECT` queries. Any attempt to modify data (INSERT, UPDATE, DELETE) is blocked at the tool level before reaching the database.
