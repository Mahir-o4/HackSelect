from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from typing import Annotated, Literal, Any
from prisma import Prisma
import json

from app.services.compare_service import CompareService

router = APIRouter(prefix="/compare", tags=["Compare"])

compare_service = CompareService()


# ----------------------------------------------------------------
# Type aliases
# ----------------------------------------------------------------

TeamId = Annotated[str, Field(min_length=1, description="Unique team identifier")]


# ----------------------------------------------------------------
# Response models
# ----------------------------------------------------------------

class DimensionComparison(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dimension: str
    team_a:    str
    team_b:    str
    edge:      str


class CompareResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    team_a_id:       str
    team_b_id:       str
    team_a_name:     str | None
    team_b_name:     str | None
    dimensions:      list[DimensionComparison]
    overall_summary: str
    recommendation:  str
    confidence:      Literal["high", "medium", "low"]


# ----------------------------------------------------------------
# Routes
# ----------------------------------------------------------------

@router.get("/", response_model=CompareResponse)
async def compare_teams(
    team:    str = Query(..., min_length=1, description="Team A ID to compare"),
    compare: str = Query(..., min_length=1, description="Team B ID to compare against"),
):
    """
    Compares two teams using their stored summaries.
    Analyses both teams across multiple dimensions and recommends one
    without fully discarding the other.
    """

    if team == compare:
        raise HTTPException(
            status_code=400,
            detail="team and compare must be different team IDs."
        )

    db = Prisma()
    await db.connect()

    try:
        row_a = await db.teamsummary.find_unique(
            where={"teamId": team},
            include={"team": True},
        )
        row_b = await db.teamsummary.find_unique(
            where={"teamId": compare},
            include={"team": True},
        )
    finally:
        await db.disconnect()

    # Validate both teams exist and have summaries
    if not row_a:
        raise HTTPException(
            status_code=404,
            detail=f"No summary found for team {team}. Maybe team does not exist."
        )
    if not row_b:
        raise HTTPException(
            status_code=404,
            detail=f"No summary found for team {compare}. Maybe team does not exist."
        )

    # Parse stored JSON summaries
    try:
        summary_a = json.loads(row_a.summaryText)
        summary_b = json.loads(row_b.summaryText)
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(
            status_code=500,
            detail="Failed to parse stored team summaries. Data may be corrupted."
        )

    team_a_name = row_a.team.teamName if row_a.team else team
    team_b_name = row_b.team.teamName if row_b.team else compare

    print(f"[compare] Comparing '{team_a_name}' vs '{team_b_name}'...")

    result = await compare_service.compare_teams(
        team_a_name=team_a_name,
        team_a_summary=summary_a,
        team_b_name=team_b_name,
        team_b_summary=summary_b,
    )

    if not result:
        raise HTTPException(
            status_code=500,
            detail="LLM comparison failed. All models exhausted."
        )

    return CompareResponse(
        team_a_id       = team,
        team_b_id       = compare,
        team_a_name     = team_a_name,
        team_b_name     = team_b_name,
        dimensions      = result["dimensions"],
        overall_summary = result["overall_summary"],
        recommendation  = result["recommendation"],
        confidence      = result["confidence"],
    )