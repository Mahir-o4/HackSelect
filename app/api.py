from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.summary import router as summary_router

app = FastAPI(title="Hackathon Screening API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(summary_router)


@app.get("/health")
async def health():
    return {"status": "ok"}