from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.pipeline import router as pipeline_router
from app.routes.clustering import router as clustering_router
from app.routes.summary import router as summary_router
from app.routes.selection import router as selection_router
from app.routes.compare import router as compare_router
from app.routes.agent import router as agent_router
from app.routes.ppt_classify import router as ppt_router


app = FastAPI(title="Hackathon Screening API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # tighten this before production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pipeline_router)
app.include_router(clustering_router)
app.include_router(summary_router)
app.include_router(selection_router)
app.include_router(compare_router)
app.include_router(agent_router)
app.include_router(ppt_router)


@app.get("/health")
async def health():
    return {"status": "Arrey Bhaiyaa ALLL IZZ WELL"}