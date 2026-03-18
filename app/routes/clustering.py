from fastapi import APIRouter
from pydantic import BaseModel, validator

from app.services.clustering_service import run_clustering


router = APIRouter(prefix="/teams", tags=["Teams"])


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
    filter_mode: str           = "both"
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

@router.post("/cluster/{hackathon_id}")
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