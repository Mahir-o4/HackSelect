from scripts.load_csv import load_teams_from_csv
from app.pipeline.pipeline import run_pipeline
from dotenv import load_dotenv

load_dotenv()

teams = load_teams_from_csv("data/test_dataset.csv")

results = run_pipeline(teams)