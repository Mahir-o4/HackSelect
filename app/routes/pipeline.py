import json
from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from app.pipeline.pipeline import run_pipeline


router = APIRouter(prefix="/pipeline", tags=["Pipeline"])


@router.post("/run/{hackathon_id}")
async def pipeline_run(hackathon_id: str):
    """
    SSE endpoint — streams real-time pipeline progress to the client.
    Each event is a JSON object: { stage, status, message }

    Stages: init → github → resume → scoring → features → persistence → complete
    """

    async def event_generator():
        async for progress in run_pipeline(hackathon_id):
            yield {"data": json.dumps(progress)}

    return EventSourceResponse(event_generator())