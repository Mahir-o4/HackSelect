import requests


class GithubService:

    def __init__(self, token: str):
        self.base_url = "https://api.github.com"
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json"
        }

    # ---------------------------
    # Public API
    # ---------------------------

    def get_user_metrics(self, username: str) -> dict | None:
        """
        Returns a dict with two keys:
            "profile"  — aggregated metrics for scoring / GithubProfile table
            "repos"    — list of per-repo dicts for GithubRepo table
        Returns None if the user could not be fetched.
        """

        repos = self._fetch_repos(username)
        if repos is None:
            return None

        events = self._fetch_events(username)

        profile  = self._compute_profile(repos, events)
        repo_list = self._extract_repos(repos)

        return {
            "profile": profile,
            "repos":   repo_list,
        }

    # ---------------------------
    # Internal helpers
    # ---------------------------

    def _fetch_repos(self, username):
        url = f"{self.base_url}/users/{username}/repos?per_page=100"
        r = requests.get(url, headers=self.headers)

        if r.status_code != 200:
            return None

        return r.json()

    def _fetch_events(self, username):
        url = f"{self.base_url}/users/{username}/events/public"
        r = requests.get(url, headers=self.headers)

        if r.status_code != 200:
            return []

        return r.json()

    def _compute_profile(self, repos, events):
        """
        Aggregate repo + event data into a flat profile dict.
        Matches the GithubProfile schema fields.
        """

        total_repos     = len(repos)
        original_repos  = sum(1 for r in repos if not r["fork"])
        total_stars     = sum(r["stargazers_count"] for r in repos)
        total_forks     = sum(r["forks_count"]      for r in repos)

        languages       = {r["language"] for r in repos if r["language"]}
        unique_languages = len(languages)

        # -------- Activity counts --------

        pushes  = sum(e["type"] == "PushEvent"          for e in events)
        prs     = sum(e["type"] == "PullRequestEvent"   for e in events)
        issues  = sum(e["type"] == "IssuesEvent"        for e in events)
        creates = sum(e["type"] == "CreateEvent"        for e in events)

        recent_updates = sum(
            e["type"] in ("PushEvent", "PullRequestEvent")
            for e in events[:20]
        )

        activity_raw = (
            5 * pushes         +
            3 * prs            +
            2 * issues         +
            1 * creates        +
            2 * recent_updates
        )

        return {
            "total_repos":      total_repos,
            "original_repos":   original_repos,
            "total_stars":      total_stars,
            "total_forks":      total_forks,
            "unique_languages": unique_languages,

            "pushes":           pushes,
            "prs":              prs,
            "issues":           issues,
            "creates":          creates,
            "recent_updates":   recent_updates,

            "activity_raw":     activity_raw,
            # activity_score is computed later in pipeline after
            # dataset-wide A_max is known
        }

    def _extract_repos(self, repos):
        """
        Extract per-repo fields needed for GithubRepo table
        and for F9 / F10 (total & max stars) in team features.
        """

        repo_list = []

        for r in repos:
            repo_list.append({
                "repo_id":  r["id"],
                "name":     r["name"],
                "is_fork":  r["fork"],
                "stars":    r["stargazers_count"],
                "forks":    r["forks_count"],
                "language": r.get("language"),
                "pushed_at": r.get("pushed_at"),
            })

        return repo_list