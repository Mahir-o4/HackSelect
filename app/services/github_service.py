import os
import requests
from datetime import datetime, timedelta


TOKEN = os.getenv("GITHUB_TOKEN")
HEADERS = {"Authorization": f"Bearer {TOKEN}"} if TOKEN else {}


def get_github_metrics(username):

    repos_url = f"https://api.github.com/users/{username}/repos?per_page=100"
    events_url = f"https://api.github.com/users/{username}/events/public"

    repos = requests.get(repos_url, headers=HEADERS).json()
    events = requests.get(events_url, headers=HEADERS).json()

    if isinstance(repos, dict):  # error case
        return None

    total_repos = len(repos)
    original_repos = sum(1 for r in repos if not r["fork"])
    total_stars = sum(r["stargazers_count"] for r in repos)

    languages = {r["language"] for r in repos if r["language"]}
    unique_languages = len(languages)

    cutoff = datetime.utcnow() - timedelta(days=180)

    recent_updates = sum(
        datetime.strptime(r["pushed_at"], "%Y-%m-%dT%H:%M:%SZ") > cutoff
        for r in repos
    )

    pushes = sum(e["type"] == "PushEvent" for e in events)
    prs = sum(e["type"] == "PullRequestEvent" for e in events)
    issues = sum(e["type"] == "IssuesEvent" for e in events)
    creates = sum(e["type"] == "CreateEvent" for e in events)

    activity_raw = (
        5 * pushes +
        3 * prs +
        2 * issues +
        1 * creates +
        2 * recent_updates
    )

    return {
        "total_repos": total_repos,
        "original_repos": original_repos,
        "total_stars": total_stars,
        "unique_languages": unique_languages,
        "activity_raw": activity_raw
    }