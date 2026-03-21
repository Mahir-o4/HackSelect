from prisma import Prisma
from datetime import datetime, timezone


async def run_distribution(hackathon_id: str) -> dict:
    """
    Distributes classified PPT submissions to judges based on
    specialisation matching and even load distribution.

    Algorithm:
        1. Load all classified PPTs for selected teams in this hackathon
        2. Load all judges with their specialisations
        3. For each PPT find the least loaded judge whose specialisations
           overlap with the PPT's categories (primary match)
        4. If no match exists (shortfall) assign to the globally least
           loaded judge regardless of specialisation — isPrimaryMatch = False
        5. Upsert PptAssignment rows — safe to re-run

    Only processes PPTs where classifiedAt is not null.
    """

    db = Prisma()
    await db.connect()

    # Only distribute classified PPTs for selected teams
    ppts = await db.pptsubmission.find_many(
        where={
            "classifiedAt": {"not": None},
            "team": {
                "hackathonId": hackathon_id,
                "teamResult":  {"selected": True},
            }
        },
        include={"team": True}
    )

    judges = await db.judge.find_many(
        where={"hackathonId": hackathon_id}
    )

    await db.disconnect()

    if not ppts:
        return {
            "assigned":        0,
            "primary_matches": 0,
            "shortfalls":      0,
            "unassigned":      0,
            "message":         "No classified PPTs found for selected teams. Run classification first.",
        }

    if not judges:
        return {
            "assigned":        0,
            "primary_matches": 0,
            "shortfalls":      0,
            "unassigned":      len(ppts),
            "message":         "No judges found. Add judges before distributing.",
        }

    # ----------------------------------------------------------------
    # Build lookups
    # ----------------------------------------------------------------

    judge_load  = {j.id: 0 for j in judges}
    judge_specs = {j.id: set(j.specialisations) for j in judges}

    # ----------------------------------------------------------------
    # Assign each PPT to a judge
    # ----------------------------------------------------------------

    assignments      = []
    primary_matches  = 0
    shortfalls       = 0
    unassigned       = 0
    now              = datetime.now(timezone.utc)

    for ppt in ppts:
        ppt_categories = set(ppt.categories)

        # Try primary match first
        judge_id   = _find_best_judge(ppt_categories, judge_specs, judge_load, require_match=True)
        is_primary = True

        if not judge_id:
            # Shortfall — assign to least loaded regardless of specialisation
            judge_id   = _find_best_judge(ppt_categories, judge_specs, judge_load, require_match=False)
            is_primary = False

        if not judge_id:
            unassigned += 1
            continue

        judge_load[judge_id] += 1

        assignments.append({
            "ppt_id":          ppt.id,
            "judge_id":        judge_id,
            "hackathon_id":    hackathon_id,
            "is_primary_match": is_primary,
            "assigned_at":     now,
        })

        if is_primary:
            primary_matches += 1
        else:
            shortfalls += 1

    # ----------------------------------------------------------------
    # Upsert assignments — pptId is @unique so re-running is safe
    # ----------------------------------------------------------------

    db = Prisma()
    await db.connect()

    for a in assignments:
        await db.pptassignment.upsert(
            where={"pptId": a["ppt_id"]},
            data={
                "create": {
                    "pptId":          a["ppt_id"],
                    "judgeId":        a["judge_id"],
                    "hackathonId":    a["hackathon_id"],
                    "isPrimaryMatch": a["is_primary_match"],
                    "assignedAt":     a["assigned_at"],
                },
                "update": {
                    "judgeId":        a["judge_id"],
                    "isPrimaryMatch": a["is_primary_match"],
                    "assignedAt":     a["assigned_at"],
                },
            }
        )

    await db.disconnect()

    total = primary_matches + shortfalls

    return {
        "assigned":        total,
        "primary_matches": primary_matches,
        "shortfalls":      shortfalls,
        "unassigned":      unassigned,
        "message": (
            f"Distributed {total} PPTs — "
            f"{primary_matches} primary matches, "
            f"{shortfalls} shortfall reassignments."
            + (f" {unassigned} could not be assigned." if unassigned else "")
        ),
    }


async def get_assignments(hackathon_id: str) -> list:
    """
    Returns all assignments for a hackathon with judge and team info.
    Used for the organizer's distribution overview page.
    """

    db = Prisma()
    await db.connect()

    assignments = await db.pptassignment.find_many(
        where={"hackathonId": hackathon_id},
        include={
            "judge": True,
            "ppt":   {"include": {"team": True}},
        }
    )

    await db.disconnect()

    return [
        {
            "assignmentId":    a.id,
            "judgeId":         a.judgeId,
            "judgeName":       a.judge.name,
            "judgeEmail":      a.judge.email,
            "specialisations": a.judge.specialisations,
            "teamId":          a.ppt.teamId,
            "teamName":        a.ppt.team.teamName if a.ppt.team else None,
            "pptId":           a.pptId,
            "fileUrl":         a.ppt.fileUrl,
            "categories":      a.ppt.categories,
            "score":           a.ppt.score,
            "isPrimaryMatch":  a.isPrimaryMatch,
            "assignedAt":      a.assignedAt.isoformat(),
        }
        for a in assignments
    ]


async def get_judge_assignments(judge_id: str) -> list:
    """
    Returns all PPTs assigned to a specific judge.
    Used for the judge's shareable personal view page.
    """

    db = Prisma()
    await db.connect()

    assignments = await db.pptassignment.find_many(
        where={"judgeId": judge_id},
        include={
            "ppt": {"include": {"team": True}},
        }
    )

    await db.disconnect()

    return [
        {
            "assignmentId":  a.id,
            "teamId":        a.ppt.teamId,
            "teamName":      a.ppt.team.teamName if a.ppt.team else None,
            "pptId":         a.pptId,
            "fileUrl":       a.ppt.fileUrl,
            "categories":    a.ppt.categories,
            "score":         a.ppt.score,
            "isPrimaryMatch": a.isPrimaryMatch,
            "assignedAt":    a.assignedAt.isoformat(),
        }
        for a in assignments
    ]


# ----------------------------------------------------------------
# Internal helper
# ----------------------------------------------------------------

def _find_best_judge(
    ppt_categories: set,
    judge_specs:    dict[str, set],
    judge_load:     dict[str, int],
    require_match:  bool,
) -> str | None:
    """
    Find the best available judge for a PPT.

    If require_match=True  — only consider judges with overlapping specialisations
    If require_match=False — consider all judges (shortfall fallback)

    Picks the candidate with lowest load.
    Ties broken by highest specialisation overlap (most relevant judge wins).
    """

    candidates = []

    for judge_id, specs in judge_specs.items():
        overlap = len(specs & ppt_categories)

        if require_match and overlap == 0:
            continue

        candidates.append({
            "judge_id": judge_id,
            "load":     judge_load[judge_id],
            "overlap":  overlap,
        })

    if not candidates:
        return None

    # Sort: load ascending, overlap descending
    candidates.sort(key=lambda c: (c["load"], -c["overlap"]))
    return candidates[0]["judge_id"]