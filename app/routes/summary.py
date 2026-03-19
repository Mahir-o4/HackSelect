from fastapi import APIRouter, HTTPException
from prisma import Prisma
import json

from app.services.summary_service import SummaryService

router = APIRouter(prefix="/summary", tags=["Summary"])

summary_service = SummaryService()


def _build_lookup_maps(resume_rows, repo_rows):
    """Build resume and repo lookup maps from DB rows"""

    resume_map = {
        r.participantId: r.rawText
        for r in resume_rows
        if r.rawText
    }

    repo_map: dict[int, list] = {}
    for r in repo_rows:
        repo_map.setdefault(r.participantId, []).append({
            "name":     r.name,
            "language": r.language,
            "stars":    r.stars  or 0,
            "is_fork":  r.isFork or False,
        })

    return resume_map, repo_map


def _build_members(team, resume_map, repo_map):
    """Build member list for a single team ready to feed to LLM"""

    members = []
    for p in team.participant:
        pid = p.participantId
        members.append({
            "name":            p.name,
            "resume_raw_text": resume_map.get(pid),
            "repos":           repo_map.get(pid, []),
        })

    return members


# ----------------------------------------------------------------
# Routes
# ----------------------------------------------------------------

@router.post("/generate")
async def generate_summaries():
    """
    For every team:
      1. Fetch resume rawText and githubRepo rows
      2. Feed to LLM via SummaryService
      3. Store result in teamSummary table as JSON
    Skips teams that already have a summary.
    """

    db = Prisma()
    await db.connect()

    try:
        teams       = await db.team.find_many(
            include={
                "participant": True,
                "teamSummary": True,
            }
        )
        resume_rows = await db.resume.find_many()
        repo_rows   = await db.githubrepo.find_many()

    finally:
        await db.disconnect()

    if not teams:
        raise HTTPException(status_code=404, detail="No teams found.")

    resume_map, repo_map = _build_lookup_maps(resume_rows, repo_rows)

    generated = []
    skipped   = []
    failed    = []

    db = Prisma()
    await db.connect()

    try:
        for team in teams:

            # Skip if summary already exists
            if team.teamSummary:
                skipped.append(team.teamId)
                continue

            members = _build_members(team, resume_map, repo_map)

            if not members:
                skipped.append(team.teamId)
                continue

            print(f"  [summary] Generating for {team.teamName or team.teamId}...")

            result = summary_service.summarize_team(
                team_name=team.teamName or team.teamId,
                members=members,
            )

            if not result:
                failed.append(team.teamId)
                continue

            await db.teamsummary.upsert(
                where={"teamId": team.teamId},
                data={
                    "create": {
                        "teamId":      team.teamId,
                        "summaryText": json.dumps(result),
                    },
                    "update": {
                        "summaryText": json.dumps(result),
                    }
                }
            )

            generated.append(team.teamId)
            print(f"  [summary] Saved — {team.teamName or team.teamId}")

    finally:
        await db.disconnect()

    return {
        "status":    "done",
        "generated": len(generated),
        "skipped":   len(skipped),
        "failed":    len(failed),
        "teams":     generated,
    }


@router.get("/all")
async def get_all_summaries():
    """Return all stored team summaries"""

    db = Prisma()
    await db.connect()

    try:
        rows = await db.teamsummary.find_many(
            include={"team": True}
        )
    finally:
        await db.disconnect()

    return [
        {
            "teamId":      r.teamId,
            "teamName":    r.team.teamName if r.team else None,
            "hackathonId": r.team.hackathonId if r.team else None,
            "summary":     json.loads(r.summaryText) if r.summaryText else None,
        }
        for r in rows
    ]


@router.get("/{team_id}")
async def get_team_summary(team_id: str):
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

    return {
        "teamId":      row.teamId,
        "teamName":    row.team.teamName if row.team else None,
        "hackathonId": row.team.hackathonId if row.team else None,
        "summary":     json.loads(row.summaryText) if row.summaryText else None,
    }