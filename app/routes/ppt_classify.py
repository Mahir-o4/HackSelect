import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from typing import Annotated
from prisma import Prisma
from datetime import datetime, timezone

from app.services.ppt_classifier_service import PPTClassifierService
from app.services.distribution_service import (
    run_distribution,
    get_assignments,
    get_judge_assignments,
)

router = APIRouter(prefix="/ppt", tags=["PPT"])

ppt_classifier = PPTClassifierService()


# ----------------------------------------------------------------
# Type aliases
# ----------------------------------------------------------------

HackathonId = Annotated[str, Field(min_length=1, description="Unique hackathon identifier")]
TeamId      = Annotated[str, Field(min_length=1, description="Unique team identifier")]
JudgeId     = Annotated[str, Field(min_length=1, description="Unique judge identifier")]


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


class DistributionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status:        str
    message:       str
    assigned:      int
    primaryMatches: int
    shortfalls:    int
    unassigned:    int


class RunPptResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status:         str
    message:        str
    classified:     int
    assigned:       int
    primaryMatches: int
    shortfalls:     int
    unassigned:     int


# ----------------------------------------------------------------
# Combined Route — classify + distribute in one call
# ----------------------------------------------------------------

@router.post("/run/{hackathon_id}", response_model=RunPptResponse)
async def run_ppt_pipeline(hackathon_id: HackathonId):
    """
    Single route that runs the full PPT pipeline:
      1. Classify all unclassified PPT submissions via LLM
      2. Distribute classified PPTs to judges

    Use this from the UI instead of calling /process and /distribute separately.
    Skips PPTs already classified. Re-running distribution overwrites previous assignments.
    """

    # ---- Step 1: Classify ----

    db = Prisma()
    await db.connect()

    try:
        hackathon = await db.hackathon.find_unique(where={"id": hackathon_id})
        if not hackathon:
            raise HTTPException(status_code=404, detail=f"Hackathon {hackathon_id} does not exist.")

        rows = await db.pptsubmission.find_many(
            where={"team": {"hackathonId": hackathon_id}},
            include={"team": True}
        )
    finally:
        await db.disconnect()

    classified = 0

    # Filter to only unclassified rows with a fileUrl
    to_classify = [
        r for r in rows
        if r.classifiedAt is None and r.fileUrl
    ]

    for r in rows:
        if r.classifiedAt is not None:
            print(f"[PPT Run] Skipping {r.team.teamName or r.teamId} — already classified.")

    if to_classify:

        # Semaphore caps concurrent Gemini calls
        ppt_sem = asyncio.Semaphore(5)

        async def classify_one(row):
            async with ppt_sem:
                print(f"[PPT Run] Classifying {row.team.teamName or row.teamId}...")
                result = await asyncio.to_thread(ppt_classifier.classify, row.fileUrl)
                return row, result

        classify_results = await asyncio.gather(*[classify_one(r) for r in to_classify])

        # Persist results sequentially — DB writes dont benefit from concurrency
        db = Prisma()
        await db.connect()

        try:
            for row, result in classify_results:
                if not result:
                    print(f"[PPT Run] Classification failed — {row.team.teamName or row.teamId}")
                    continue

                await db.pptsubmission.update(
                    where={"id": row.id},
                    data={
                        "categories":   result["categories"],
                        "score":        result["total_score"],
                        "classifiedAt": datetime.now(timezone.utc),
                    }
                )

                classified += 1
                print(f"[PPT Run] Classified — {row.team.teamName or row.teamId} → {result['categories']}")

        finally:
            await db.disconnect()

    # ---- Step 2: Distribute ----

    dist = await run_distribution(hackathon_id=hackathon_id)

    return RunPptResponse(
        status         = "ok",
        message        = (
            f"Classified {classified} PPTs. "
            f"Distributed {dist['assigned']} to judges "
            f"({dist['primary_matches']} primary, {dist['shortfalls']} shortfall)."
        ),
        classified     = classified,
        assigned       = dist["assigned"],
        primaryMatches = dist["primary_matches"],
        shortfalls     = dist["shortfalls"],
        unassigned     = dist["unassigned"],
    )


# ----------------------------------------------------------------
# Classification Routes  (teammate's, unchanged)
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
        hackathon = await db.hackathon.find_unique(where={"id": hackathon_id})
        if not hackathon:
            raise HTTPException(status_code=404, detail=f"Hackathon {hackathon_id} does not exist.")

        rows = await db.pptsubmission.find_many(
            where={"team": {"hackathonId": hackathon_id}},
            include={"team": True}
        )
    finally:
        await db.disconnect()

    if not rows:
        raise HTTPException(status_code=404, detail=f"No PPT submissions found for hackathon {hackathon_id}.")

    results = []

    db = Prisma()
    await db.connect()

    try:
        for row in rows:

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

            print(
                f"[PPT] Saved — {row.team.teamName or row.teamId} | "
                f"categories: {result['categories']} | "
                f"score: {result['total_score']}"
            )

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
    Returns all PPT submissions for a hackathon with classification results.
    """

    db = Prisma()
    await db.connect()

    try:
        hackathon = await db.hackathon.find_unique(where={"id": hackathon_id})
        if not hackathon:
            raise HTTPException(status_code=404, detail=f"Hackathon {hackathon_id} does not exist.")

        rows = await db.pptsubmission.find_many(
            where={"team": {"hackathonId": hackathon_id}},
            include={"team": True}
        )
    finally:
        await db.disconnect()

    if not rows:
        raise HTTPException(status_code=404, detail=f"No PPT submissions found for hackathon {hackathon_id}.")

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


@router.get("/team/{team_id}", response_model=PPTSubmissionResponse)
async def get_team_ppt(team_id: TeamId):
    """
    Returns the PPT submission and classification result for a single team.
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
        raise HTTPException(status_code=404, detail=f"No PPT submission found for team {team_id}.")

    return PPTSubmissionResponse(
        pptId        = row.id,
        teamId       = row.teamId,
        teamName     = row.team.teamName if row.team else None,
        fileUrl      = row.fileUrl,
        categories   = row.categories,
        score        = row.score,
        classifiedAt = row.classifiedAt,
    )


# ----------------------------------------------------------------
# Distribution Routes
# ----------------------------------------------------------------

@router.post("/distribute/{hackathon_id}", response_model=DistributionResponse)
async def distribute_ppts(hackathon_id: HackathonId):
    """
    Distribute classified PPTs to judges based on specialisation matching.
    Only processes PPTs for selected teams that have already been classified.
    Re-running overwrites previous assignments.

    Assignment logic:
      - Primary match: judge whose specialisations overlap with PPT categories
        (least loaded among matches wins, ties broken by most overlap)
      - Shortfall: if no judge covers a category, assign to globally least
        loaded judge — flagged with isPrimaryMatch = False
    """

    result = await run_distribution(hackathon_id=hackathon_id)

    return DistributionResponse(
        status         = "ok",
        message        = result["message"],
        assigned       = result["assigned"],
        primaryMatches = result["primary_matches"],
        shortfalls     = result["shortfalls"],
        unassigned     = result["unassigned"],
    )


@router.get("/assignments/{hackathon_id}")
async def list_assignments(hackathon_id: HackathonId):
    """
    Get all PPT assignments for a hackathon.
    Returns judge info, team info, score, and whether it was a
    primary match or shortfall reassignment.
    Used for the organizer's distribution overview.
    """

    assignments = await get_assignments(hackathon_id=hackathon_id)

    return {
        "status":      "ok",
        "total":       len(assignments),
        "assignments": assignments,
    }


@router.get("/assignments/judge/{judge_id}")
async def list_judge_assignments(judge_id: JudgeId):
    """
    Get all PPTs assigned to a specific judge.
    Used for the judge's personal shareable view page.
    """

    assignments = await get_judge_assignments(judge_id=judge_id)

    return {
        "status":      "ok",
        "total":       len(assignments),
        "assignments": assignments,
    }