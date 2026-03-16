import asyncio
from app.pipeline.pipeline import run_pipeline
from dotenv import load_dotenv

load_dotenv()


asyncio.run(run_pipeline())