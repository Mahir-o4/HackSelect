from prisma import Prisma


async def run_autoselect(
    hackathon_id:    str,
    max_teams:       int,
    beginner_pct:    float,
    intermediate_pct: float,
    advanced_pct:    float,
) -> dict:
    """
    Auto-selects teams based on level quotas and teamScore ranking.

    Quota per level is computed as floor(max_teams * pct).
    If a level has fewer teams than its quota, the shortfall is
    redistributed to adjacent levels (see _fill_shortfall).

    Returns:
        {
            "selected":      [ { teamId, teamName, level, teamScore }, ... ],
            "total_selected": int,
            "breakdown":     { "Beginner": int, "Intermediate": int, "Advanced": int }
        }
    """

    db = Prisma()
    await db.connect()

    # Fetch all teams for this hackathon with their result
    teams = await db.team.find_many(
        where={"hackathonId": hackathon_id},
        include={"teamResult": True}
    )

    await db.disconnect()

    if not teams:
        return {
            "selected":       [],
            "total_selected": 0,
            "breakdown":      {},
            "message":        "No teams found for this hackathon.",
        }

    # Filter to only teams that have been clustered
    clustered = [t for t in teams if t.teamResult is not None]

    if not clustered:
        return {
            "selected":       [],
            "total_selected": 0,
            "breakdown":      {},
            "message":        "No clustered teams found. Run clustering first.",
        }

    # ----------------------------------------------------------------
    # Group teams by level, sorted by teamScore descending
    # ----------------------------------------------------------------

    buckets: dict[str, list] = {
        "Beginner":     [],
        "Intermediate": [],
        "Advanced":     [],
    }

    for team in clustered:
        level = team.teamResult.level
        if level in buckets:
            buckets[level].append({
                "teamId":    team.teamId,
                "teamName":  team.teamName,
                "level":     level,
                "teamScore": team.teamResult.teamScore or 0.0,
            })

    for level in buckets:
        buckets[level].sort(key=lambda t: t["teamScore"], reverse=True)

    # ----------------------------------------------------------------
    # Compute initial quotas using largest remainder method
    # Ensures quotas always sum exactly to max_teams
    # ----------------------------------------------------------------

    level_pcts = {
        "Beginner":     beginner_pct,
        "Intermediate": intermediate_pct,
        "Advanced":     advanced_pct,
    }

    # Step 1 — floor each quota
    quotas    = {level: int(max_teams * pct) for level, pct in level_pcts.items()}
    remainder = max_teams - sum(quotas.values())

    # Step 2 — distribute leftover slots to levels with largest fractional parts
    fractions = sorted(
        level_pcts.keys(),
        key=lambda level: (max_teams * level_pcts[level]) % 1,
        reverse=True
    )
    for i in range(remainder):
        quotas[fractions[i]] += 1

    # ----------------------------------------------------------------
    # Fill shortfalls from adjacent levels
    # ----------------------------------------------------------------

    quotas = _fill_shortfall(quotas, buckets, max_teams)

    # ----------------------------------------------------------------
    # Select top N teams per level
    # ----------------------------------------------------------------

    selected = []
    breakdown = {}

    for level, quota in quotas.items():
        picks = buckets[level][:quota]
        selected.extend(picks)
        breakdown[level] = len(picks)

    # ----------------------------------------------------------------
    # Persist selected = True for selected, False for rest
    # ----------------------------------------------------------------

    selected_ids = {t["teamId"] for t in selected}
    all_team_ids = {t.teamId for t in teams}

    db = Prisma()
    await db.connect()

    # Bulk update selected teams
    if selected_ids:
        await db.teamresult.update_many(
            where={"teamId": {"in": list(selected_ids)}},
            data={"selected": True}
        )

    # Bulk update unselected teams
    unselected_ids = all_team_ids - selected_ids
    if unselected_ids:
        await db.teamresult.update_many(
            where={"teamId": {"in": list(unselected_ids)}},
            data={"selected": False}
        )

    await db.disconnect()

    return {
        "selected":       selected,
        "total_selected": len(selected),
        "breakdown":      breakdown,
        "message":        f"Auto-selected {len(selected)} teams.",
    }


async def save_selection(hackathon_id: str, selected_team_ids: list[str]) -> dict:
    """
    Saves the final manually reviewed selection.
    Sets selected = True for all teams in selected_team_ids,
    and selected = False for all others in the hackathon.
    """

    db = Prisma()
    await db.connect()

    # Fetch all teams for this hackathon to get their IDs
    teams = await db.team.find_many(
        where={"hackathonId": hackathon_id}
    )

    all_team_ids    = {t.teamId for t in teams}
    selected_ids    = set(selected_team_ids)
    unselected_ids  = all_team_ids - selected_ids

    # Set selected = True
    if selected_ids:
        await db.teamresult.update_many(
            where={"teamId": {"in": list(selected_ids)}},
            data={"selected": True}
        )

    # Set selected = False for everyone else
    if unselected_ids:
        await db.teamresult.update_many(
            where={"teamId": {"in": list(unselected_ids)}},
            data={"selected": False}
        )

    await db.disconnect()

    return {
        "total_selected":   len(selected_ids),
        "total_unselected": len(unselected_ids),
        "message":          f"Selection saved. {len(selected_ids)} teams selected.",
    }


# ----------------------------------------------------------------
# Shortfall redistribution helper
# ----------------------------------------------------------------

def _fill_shortfall(
    quotas:    dict[str, int],
    buckets:   dict[str, list],
    max_teams: int,
) -> dict[str, int]:
    """
    If a level has fewer available teams than its quota,
    redistribute the shortfall to adjacent levels.

    Priority for redistribution:
        Beginner   shortfall → Intermediate → Advanced
        Advanced   shortfall → Intermediate → Beginner
        Intermediate shortfall → Advanced   → Beginner
    """

    adjacency = {
        "Beginner":     ["Intermediate", "Advanced"],
        "Advanced":     ["Intermediate", "Beginner"],
        "Intermediate": ["Advanced",     "Beginner"],
    }

    adjusted = dict(quotas)

    for level, order in adjacency.items():
        available = len(buckets[level])
        if adjusted[level] > available:
            shortfall          = adjusted[level] - available
            adjusted[level]    = available

            # Distribute shortfall to adjacent levels
            for neighbor in order:
                neighbor_available = len(buckets[neighbor])
                neighbor_capacity  = neighbor_available - adjusted[neighbor]

                if neighbor_capacity <= 0:
                    continue

                fill            = min(shortfall, neighbor_capacity)
                adjusted[neighbor] += fill
                shortfall          -= fill

                if shortfall == 0:
                    break

    # Final cap — never exceed max_teams total
    total = sum(adjusted.values())
    if total > max_teams:
        excess = total - max_teams
        # Trim from lowest priority level first (Beginner)
        for level in ["Beginner", "Intermediate", "Advanced"]:
            trim = min(excess, adjusted[level])
            adjusted[level] -= trim
            excess           -= trim
            if excess == 0:
                break

    return adjusted