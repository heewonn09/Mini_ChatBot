from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
import logging

from backend.config import get_settings
from backend.database import engine, create_tables
from backend.redis_client import redis_store
from backend.routers import users, behaviors, analysis, ui, auth
from backend.models.behavior import User, BehaviorLog  # noqa: F401 – ensures tables are registered
from backend.models.chat import ChatHistory  # noqa: F401

settings = get_settings()

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s (env=%s)...", settings.app_name, settings.app_env)
    create_tables()
    tables = inspect(engine).get_table_names()
    logger.info("Active tables: %s", tables)
    yield
    logger.info("Shutting down %s", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    description="AI-powered behavior pattern analysis chatbot",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(auth.router)
app.include_router(behaviors.router)
app.include_router(analysis.router)
app.include_router(ui.router)


@app.get("/")
def root():
    return {
        "message": settings.app_name,
        "version": "1.0.0",
        "environment": settings.app_env,
    }


def _health_snapshot():
    checks = {
        "database": "unhealthy",
        "redis": "unhealthy",
    }

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        checks["database"] = "healthy"
    except Exception as exc:  # pragma: no cover - defensive runtime guard
        logger.warning("Health DB check failed: %s", exc)

    try:
        if redis_store.client is None:
            checks["redis"] = "degraded"
        else:
            redis_store.client.ping()
            checks["redis"] = "healthy"
    except Exception as exc:  # pragma: no cover - defensive runtime guard
        logger.warning("Health Redis check failed: %s", exc)

    overall = "healthy" if checks["database"] == "healthy" else "unhealthy"
    if overall == "healthy" and checks["redis"] == "degraded":
        overall = "degraded"

    status_code = 200 if overall in {"healthy", "degraded"} else 503
    return {
        "status": overall,
        "checks": checks,
    }, status_code


@app.get("/health")
def health_check():
    payload, status_code = _health_snapshot()
    return JSONResponse(content=payload, status_code=status_code)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=settings.app_env == "development")
