from prisma import Prisma


class PersistenceService:

    def __init__(self):
        self.db = Prisma()

    async def connect(self):
        await self.db.connect()

    async def disconnect(self):
        await self.db.disconnect()

    # ---------------------------
    # Github Profiles
    # ---------------------------

    async def save_github_profiles(self, github_data):
        """
        github_data: { pid -> { "profile": {...}, "repos": [...] } }
        Unpacks the "profile" key to match GithubProfile schema.
        """

        if not github_data:
            return

        rows = [
            {
                "participantId":  pid,
                "totalRepos":     p["total_repos"],
                "originalRepos":  p["original_repos"],
                "totalStars":     p["total_stars"],
                "totalForks":     p["total_forks"],
                "uniqueLanguages": p["unique_languages"],
                "activityRaw":    p["activity_raw"],
                "activityScore":  p["activity_score"],
                "pushEvents":     p["pushes"],
                "prEvents":       p["prs"],
                "issueEvents":    p["issues"],
                "createEvents":   p["creates"],
                "recentUpdates":  p["recent_updates"],
            }
            for pid, data in github_data.items()
            for p in (data["profile"],)      # unpack profile cleanly
        ]

        await self.db.githubprofile.create_many(
            data=rows,
            skip_duplicates=True
        )

    # ---------------------------
    # Github Repos
    # ---------------------------

    async def save_github_repos(self, github_data):
        """
        github_data: { pid -> { "profile": {...}, "repos": [...] } }
        Persists individual repo rows to GithubRepo table.
        """

        if not github_data:
            return

        rows = [
            {
                "repoId":       r["repo_id"],
                "name":         r["name"],
                "isFork":       r["is_fork"],
                "stars":        r["stars"],
                "forks":        r["forks"],
                "language":     r["language"],
                "pushedAt":     r["pushed_at"],
                "participantId": pid,
            }
            for pid, data in github_data.items()
            for r in data["repos"]
        ]

        if not rows:
            return

        await self.db.githubrepo.create_many(
            data=rows,
            skip_duplicates=True
        )

    # ---------------------------
    # Member Scores
    # ---------------------------

    async def save_member_scores(self, member_scores):
        """
        member_scores: { pid -> { "g_i", "r_i", "c_i", "activity_score" } }
        Persists gI, rI, cI to MemberScore table.
        """

        if not member_scores:
            return

        rows = [
            {
                "participantId": pid,
                "gI": s["g_i"],
                "rI": s["r_i"],     # None until resume pipeline is active
                "cI": s["c_i"],
            }
            for pid, s in member_scores.items()
        ]

        await self.db.memberscore.create_many(
            data=rows,
            skip_duplicates=True
        )

    # ---------------------------
    # Team Features
    # ---------------------------

    async def save_team_features(self, team_features):
        """
        team_features: { tid -> { F1 … F17 } }
        F13 is absent from the feature dict — persisted as null automatically.
        """

        if not team_features:
            return

        rows = [
            {
                "teamId": tid,
                "f1":  f["F1"],
                "f2":  f["F2"],
                "f3":  f["F3"],
                "f4":  f["F4"],
                "f5":  f["F5"],
                "f6":  f["F6"],
                "f7":  f["F7"],
                "f8":  f["F8"],
                "f9":  f["F9"],
                "f10": f["F10"],
                "f11": f["F11"],
                "f12": f["F12"],
                # f13 not set — remains null in DB
                "f14": f["F14"],
                "f15": f["F15"],
                "f16": f["F16"],
                "f17": f["F17"],
            }
            for tid, f in team_features.items()
        ]

        await self.db.teamfeature.create_many(
            data=rows,
            skip_duplicates=True
        )

    # ---------------------------
    # Team Results
    # ---------------------------

    async def save_team_results(self, clusters):
        """
        clusters: { tid -> { "cluster", "level", "score", "selected" } }
        """

        if not clusters:
            return

        rows = [
            {
                "teamId":       tid,
                "clusterLabel": r["cluster"],
                "level":        r["level"],
                "teamScore":    r["score"],
                "selected":     r["selected"],
            }
            for tid, r in clusters.items()
        ]

        await self.db.teamresult.create_many(
            data=rows,
            skip_duplicates=True
        )

    async def save_resumes(self, resume_data: dict):
        if not resume_data:
            return

        rows = [
            {
                "participantId": pid,
                "rawText":       data["raw_text"],
                "resumeScore":   data["resume_score"],
                "parsedJSON":    data["parsed_json"],
            }
            for pid, data in resume_data.items()
        ]

        await self.db.resume.create_many(
            data=rows,
            skip_duplicates=True
        )
