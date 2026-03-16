from prisma import Prisma


async def persist_results(
    github_data,
    gi_scores,
    team_features,
    clusters
):
    db = Prisma()
    await db.connect()

    # -------------------------
    # Save GithubProfile
    # -------------------------
    github_rows = []

    for pid, stats in github_data.items():
        github_rows.append({
            "participantId": pid,
            "totalRepos": stats["total_repos"],
            "originalRepos": stats["original_repos"],
            "totalStars": stats["total_stars"],
            "uniqueLanguages": stats["unique_languages"],
            "activityRaw": stats["activity_raw"],
        })

    if github_rows:
        await db.githubprofile.create_many(data=github_rows)

    # -------------------------
    # Save MemberScore
    # -------------------------
    score_rows = []

    for pid, gi in gi_scores.items():
        score_rows.append({
            "participantId": pid,
            "gI": gi
        })

    if score_rows:
        await db.memberscore.create_many(data=score_rows)

    # -------------------------
    # Save TeamFeature
    # -------------------------
    feature_rows = []

    for team_id, feat in team_features.items():
        feature_rows.append({
            "teamId": team_id,
            "f1": feat["F1_mean"],
            "f2": feat["F2_max"],
            "f3": feat["F3_variance"],
            "f4": feat["F4_size"],
            "f5": feat["F5_sum"],
        })

    if feature_rows:
        await db.teamfeature.create_many(data=feature_rows)

    # -------------------------
    # Save TeamResult
    # -------------------------
    result_rows = []

    for team_id, res in clusters.items():
        result_rows.append({
            "teamId": team_id,
            "clusterLabel": res["cluster"],
            "level": res["level"],
            "teamScore": res["score"],
            "selected": res["selected"],
        })

    if result_rows:
        await db.teamresult.create_many(data=result_rows)

    await db.disconnect()