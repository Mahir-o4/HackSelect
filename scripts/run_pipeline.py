from scripts.load_csv import load_teams_from_csv
from app.pipeline.pipeline import run_pipeline


teams = load_teams_from_csv("data/test_dataset.csv")

results = run_pipeline(teams)