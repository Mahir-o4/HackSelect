import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from sse_starlette.sse import EventSourceResponse

from app.pipeline.pipeline import run_pipeline
from app.services.clustering_service import run_clustering


app = FastAPI(title="Hackathon Screening API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # tighten this before production
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----------------------------------------------------------------
# Request models
# ----------------------------------------------------------------

class WeightsConfig(BaseModel):
    github: float = 0.7
    resume: float = 0.3

    @validator("resume", always=True)
    def weights_must_sum_to_one(cls, resume, values):
        github = values.get("github", 0.0)
        total  = round(github + resume, 6)
        if total != 1.0:
            raise ValueError(f"Weights must sum to 1.0, got {total}")
        return resume


class ClusterRequest(BaseModel):
    filter_mode: str  = "both"      # "both" | "github" | "resume"
    weights:     WeightsConfig = WeightsConfig()

    @validator("filter_mode")
    def valid_filter_mode(cls, v):
        allowed = {"both", "github", "resume"}
        if v not in allowed:
            raise ValueError(f"filter_mode must be one of {allowed}")
        return v


# ----------------------------------------------------------------
# Routes
# ----------------------------------------------------------------

@app.post("/pipeline/run/{hackathon_id}")
async def pipeline_run(hackathon_id: str):
    """
    SSE endpoint — streams real-time pipeline progress to the client.
    Each event is a JSON object: { stage, status, message }

    Stages: init → github → resume → scoring → features → persistence → complete
    """

    async def event_generator():
        async for progress in run_pipeline(hackathon_id):
            # Serialize each event as SSE data
            yield {"data": json.dumps(progress)}

    return EventSourceResponse(event_generator())


@app.post("/teams/cluster/{hackathon_id}")
async def cluster_teams_route(hackathon_id: str, body: ClusterRequest):
    """
    Reads stored team features from DB, recomputes Cᵢ with the
    provided weights, runs KMeans with the selected feature set,
    and upserts TeamResult rows.

    filter_mode:
        "both"   — uses all 16 features, weights applied to Cᵢ
        "github" — uses GitHub-only features, resume features excluded
        "resume" — uses resume-only features, GitHub features excluded
    """

    result = await run_clustering(
        hackathon_id=hackathon_id,
        filter_mode=body.filter_mode,
        w_g=body.weights.github,
        w_r=body.weights.resume,
    )

    return {
        "status":    "ok",
        "message":   result["message"],
        "clustered": result["clustered"],
    }