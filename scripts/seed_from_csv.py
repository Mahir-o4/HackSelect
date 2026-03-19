import asyncio
import csv
from prisma import Prisma


CSV_PATH = "data/test_dataset.csv"


async def main():
    db = Prisma()

    print("🔌 Connecting to database...")
    await db.connect()
    print("✅ Connected!\n")

    teams_cache = {}

    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        for row in reader:
            team_id = row["Team Id"].strip()
            team_name = row["team name"].strip()

            # --- Create team if not already created ---
            if team_id not in teams_cache:
                team = await db.team.create(
                    data={
                        "teamId": team_id,
                        "teamName": team_name,
                    }
                )

                teams_cache[team_id] = team
                print(f"🏷️ Created Team: {team_name}")

            # --- Create participant ---
            participant = await db.participant.create(
                data={
                    "name": row["participants"].strip(),
                    "githubUsername": row["github username"].strip() or None,
                    "linkedInURL": row["linkedIn url"].strip() or None,
                    "resumeURL": row["resume"].strip() or None,
                    "phNumber": row["ph number"].strip() or None,
                    "email": row["gmail"].strip() or None,
                    "teamId": team_id,
                }
            )

            print(f"   👤 Added Participant: {participant.name}")

    print("\n🎉 Seeding complete!")

    await db.disconnect()
    print("🔌 Disconnected.")


if __name__ == "__main__":
    asyncio.run(main())