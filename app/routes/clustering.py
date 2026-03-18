from fastapi import APIRouter
from pydantic import BaseModel, field_validator, model_validator, Field
from typing import Annotated

from app.services.clustering_service import run_clustering


router = APIRouter(prefix="/teams", tags=["Teams"])


# ----------------------------------------------------------------
# Request models
# ----------------------------------------------------------------

class WeightsConfig(BaseModel):
    github: Annotated[float, Field(default=0.7, ge=0, le=1, strict=True,
                                   title='Github weight', description='Enter a decimal value ranging from 0 to 1')]
    resume: Annotated[float, Field(default=0.3, ge=0, le=1, strict=True, title='Resume weight',
                                   description='Enter a decimal value ranging from 0 to 1')]

    @model_validator(mode="after")
    def weights_must_sum_to_one(self):
        total = round(self.github + self.resume, 6)
        if total != 1.0:
            raise ValueError(f"Weights must sum to 1.0, got {total}")
        return self


class ClusterRequest(BaseModel):
    filter_mode: Annotated[str, Field( default="both", title="Filter Mode", description="Add Custom Filters")]
    weights:     WeightsConfig = WeightsConfig()

    @field_validator("filter_mode")
    @classmethod
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
