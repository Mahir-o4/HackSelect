import csv
from collections import defaultdict
import json

"""
teams layout 
[
    {
        "team_id",
        "team_name",
        "members": [
            {
                "name",
                "github",
                "resume_url",
                "linkedin",
                "email",
                "phone"
            }, 
            {
                ...
            }
        ]
    }
    
]
"""

def load_teams_from_csv(file_path):
    teams = {}

    with open(file_path, newline='', encoding="utf-8") as f:
        reader = csv.DictReader(f)

        for row in reader:
            team_id = row["Team Id"].strip()

            # Create team entry if not exists
            if team_id not in teams:
                teams[team_id] = {
                    "team_id": team_id,
                    "team_name": row["team name"].strip(),
                    "members": []
                }

            member = {
                "name": row["participants"].strip(),
                "github": row["github username"].strip(),
                "resume_url": row["resume"].strip(),
                "linkedin": row["linkedIn url"].strip(),
                "email": row["gmail"].strip(),
                "phone": row["ph number"].strip()
            }

            teams[team_id]["members"].append(member)

    return list(teams.values())



if __name__ == "__main__":
    teams = load_teams_from_csv("data/test_dataset.csv")


    with open("data/teams.json", "w", encoding="utf-8") as f:
        json.dump(teams, f, indent=2)