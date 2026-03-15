from app.services.github_service import get_github_metrics
from app.services.scoring_service import compute_dataset_maxima, compute_gi

def run_pipeline(teams):
    print("Pipeline started...\n")

    all_metrics = []
    for team in teams:
        print(f"Processing Team {team['team_id']} ({team['team_name']})")

        for member in team["members"]:
            stats = get_github_metrics(member["github"])
            member["metrics"]= stats
            all_metrics.append(stats)
            
            maxima = compute_dataset_maxima(all_metrics)
            member["G_i"] = compute_gi(member["metrics"], maxima)

            print(member["name"], member["G_i"])

    print("\nPipeline finished.")

    return teams