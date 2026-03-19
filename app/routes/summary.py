from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from typing import Annotated, Any
from prisma import Prisma
import json


router = APIRouter(prefix="/summary", tags=["Summary"])

# ----------------------------------------------------------------
# Type aliases for path parameters
# ----------------------------------------------------------------

HackathonId = Annotated[str, Field(
    min_length=1, description="Unique hackathon identifier")]
TeamId = Annotated[str, Field(
    min_length=1, description="Unique team identifier")]


# ----------------------------------------------------------------
# Response models
# ----------------------------------------------------------------

class TeamSummaryResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    teamId:      str
    teamName:    str | None
    hackathonId: str | None
    summary:     dict[str, Any] | None


@router.get("/all/{hackathon_id}", response_model=list[TeamSummaryResponse])
async def get_all_summaries(hackathon_id: HackathonId):
    """Return all stored team summaries for a hackathon"""

    db = Prisma()
    await db.connect()

    try:
        hackathon = await db.hackathon.find_unique(
            where={"id": hackathon_id}
        )

        if not hackathon :
            raise HTTPException(
                status_code=404,
                detail=f"Hackathon: {hackathon_id} does not exist."
            )

        rows = await db.teamsummary.find_many(
            where={"team": {"hackathonId": hackathon_id}},
            include={"team": True}
        )

        if not rows:
            raise HTTPException(
                status_code=404,
                detail=f"Hackathon: {hackathon_id} exists but no summaries found. Upload teams first."
            )

    finally:
        await db.disconnect()

    return [
        TeamSummaryResponse(
            teamId=r.teamId,
            teamName=r.team.teamName if r.team else None,
            hackathonId=r.team.hackathonId if r.team else None,
            summary=json.loads(r.summaryText) if r.summaryText else None,
        )
        for r in rows
    ]


@router.get("/{team_id}", response_model=TeamSummaryResponse)
async def get_team_summary(team_id: TeamId):
    """Return summary for a single team by ID"""

    db = Prisma()
    await db.connect()

    try:
        row = await db.teamsummary.find_unique(
            where={"teamId": team_id},
            include={"team": True},
        )
    finally:
        await db.disconnect()

    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"No summary found for team {team_id}"
        )

    return TeamSummaryResponse(
        teamId=row.teamId,
        teamName=row.team.teamName if row.team else None,
        hackathonId=row.team.hackathonId if row.team else None,
        summary=json.loads(row.summaryText) if row.summaryText else None,
    )
