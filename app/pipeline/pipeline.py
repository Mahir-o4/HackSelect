def run_pipeline(teams):
    print("Pipeline started...\n")

    for team in teams:
        print(f"Processing Team {team['team_id']} ({team['team_name']})")

        for member in team["members"]:
            print("  Member:", member["name"],
                  "| GitHub:", member["github"])

    print("\nPipeline finished.")

    return teams