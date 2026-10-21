import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import JWT_SECRET
from app.database import connect_db, close_db
from app.routes import donors, requests, donations, webhook
from app.services.workflow_service import initialize_workflow_indexes, worker_loop

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    await initialize_workflow_indexes()
    stop_event = asyncio.Event()
    worker_task = asyncio.create_task(worker_loop(stop_event))
    if not JWT_SECRET:
        logger.warning("JWT_SECRET is unset; QR/JWT operations should not be used in production until configured.")
    try:
        yield
    finally:
        stop_event.set()
        await worker_task
        await close_db()


app = FastAPI(
    title="Jeevansh API",
    description="Blood donor coordination backend for INNOTECH26",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    # Configure explicit frontend origins in production.
    allow_origins=[origin.strip() for origin in __import__("os").getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)

app.include_router(donors.router)
app.include_router(requests.router)
app.include_router(donations.router)
app.include_router(webhook.router)


@app.get("/")
async def root():
    return {"message": "Jeevansh API is running", "docs": "/docs"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}
