from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from typing import Annotated
from prisma import Prisma
from datetime import datetime, timezone

from app.services.ppt_classifier_service import PPTClassifierService

router = APIRouter(prefix="/ppt", tags=["PPT"])

ppt_classifier = PPTClassifierService()


# ----------------------------------------------------------------
# Type aliases
# ----------------------------------------------------------------

HackathonId = Annotated[str, Field(min_length=1, description="Unique hackathon identifier")]
TeamId      = Annotated[str, Field(min_length=1, description="Unique team identifier")]


# ----------------------------------------------------------------
# Response models
# ----------------------------------------------------------------

class PPTSubmissionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pptId:        str
    teamId:       str
    teamName:     str | None
    fileUrl:      str
    categories:   list[str]
    score:        float | None
    classifiedAt: datetime | None


class PPTProcessResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status:     str
    teamId:     str
    teamName:   str | None
    categories: list[str]
    score:      float


# ----------------------------------------------------------------
# Routes
# ----------------------------------------------------------------

@router.post("/process/{hackathon_id}", response_model=list[PPTProcessResponse])
async def process_all_ppts(hackathon_id: HackathonId):
    """
    For every PPT submission in the hackathon:
      1. Fetch fileUrl from PptSubmission
      2. Download PDF → extract text → classify + score via LLM
      3. Save categories and score back to PptSubmission
    Skips PPTs already classified.
    """

    db = Prisma()
    await db.connect()

    try:
        hackathon = await db.hackathon.find_unique(
            where={"id": hackathon_id}
        )

        if not hackathon:
            raise HTTPException(
                status_code=404,
                detail=f"Hackathon {hackathon_id} does not exist."
            )

        rows = await db.pptsubmission.find_many(
            where={"team": {"hackathonId": hackathon_id}},
            include={"team": True}
        )

    finally:
        await db.disconnect()

    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No PPT submissions found for hackathon {hackathon_id}."
        )

    results = []

    db = Prisma()
    await db.connect()

    try:
        for row in rows:

            # Skip if already classified
            if row.classifiedAt is not None:
                print(f"[PPT] Skipping {row.team.teamName or row.teamId} — already classified.")
                continue

            if not row.fileUrl:
                print(f"[PPT] Skipping {row.team.teamName or row.teamId} — no file URL.")
                continue

            print(f"[PPT] Processing {row.team.teamName or row.teamId}...")

            result = ppt_classifier.classify(row.fileUrl)

            if not result:
                print(f"[PPT] FAILED — {row.team.teamName or row.teamId}")
                continue

            await db.pptsubmission.update(
                where={"id": row.id},
                data={
                    "categories":   result["categories"],
                    "score":        result["total_score"],
                    "classifiedAt": datetime.now(timezone.utc),
                }
            )

            print(f"[PPT] Saved — {row.team.teamName or row.teamId} | "
                  f"categories: {result['categories']} | "
                  f"score: {result['total_score']}")

            results.append(PPTProcessResponse(
                status     = "ok",
                teamId     = row.teamId,
                teamName   = row.team.teamName if row.team else None,
                categories = result["categories"],
                score      = result["total_score"],
            ))

    finally:
        await db.disconnect()

    if not results:
        raise HTTPException(
            status_code=404,
            detail="No PPTs were processed — all already classified or failed."
        )

    return results


@router.get("/all/{hackathon_id}", response_model=list[PPTSubmissionResponse])
async def get_all_ppts(hackathon_id: HackathonId):
    """
    Returns all PPT submissions for a hackathon
    with their classification results.
    """

    db = Prisma()
    await db.connect()

    try:
        hackathon = await db.hackathon.find_unique(
            where={"id": hackathon_id}
        )

        if not hackathon:
            raise HTTPException(
                status_code=404,
                detail=f"Hackathon {hackathon_id} does not exist."
            )

        rows = await db.pptsubmission.find_many(
            where={"team": {"hackathonId": hackathon_id}},
            include={"team": True}
        )

    finally:
        await db.disconnect()

    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No PPT submissions found for hackathon {hackathon_id}."
        )

    return [
        PPTSubmissionResponse(
            pptId        = r.id,
            teamId       = r.teamId,
            teamName     = r.team.teamName if r.team else None,
            fileUrl      = r.fileUrl,
            categories   = r.categories,
            score        = r.score,
            classifiedAt = r.classifiedAt,
        )
        for r in rows
    ]


@router.get("/{team_id}", response_model=PPTSubmissionResponse)
async def get_team_ppt(team_id: TeamId):
    """
    Returns the PPT submission and classification
    result for a single team.
    """

    db = Prisma()
    await db.connect()

    try:
        row = await db.pptsubmission.find_unique(
            where={"teamId": team_id},
            include={"team": True}
        )

    finally:
        await db.disconnect()

    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"No PPT submission found for team {team_id}."
        )

    return PPTSubmissionResponse(
        pptId        = row.id,
        teamId       = row.teamId,
        teamName     = row.team.teamName if row.team else None,
        fileUrl      = row.fileUrl,
        categories   = row.categories,
        score        = row.score,
        classifiedAt = row.classifiedAt,
    )