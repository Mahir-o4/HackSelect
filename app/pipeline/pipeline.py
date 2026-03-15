from app.services.github_service import get_github_metrics

def run_pipeline(teams):
    print("Pipeline started...\n")

    for team in teams:
        print(f"Processing Team {team['team_id']} ({team['team_name']})")

        for member in team["members"]:
            stats = get_github_metrics(member["github"])
            print(member["name"], stats)

    print("\nPipeline finished.")

    return teams