import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import inspect, text

from backend.config import get_settings
from backend.database import engine, create_tables
from backend.middleware.logging import configure_json_logging, RequestLoggingMiddleware
from backend.routers import users, behaviors, analysis, ui, auth
from backend.routers import community as community_router
from backend.models.behavior import User, BehaviorLog  # noqa: F401
from backend.models.chat import ChatHistory  # noqa: F401
from backend.services.scheduler import start_scheduler, stop_scheduler

settings = get_settings()

configure_json_logging(settings.log_level)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s (env=%s)", settings.app_name, settings.app_env)
    create_tables()
    tables = inspect(engine).get_table_names()
    logger.info("Active tables: %s", tables)
    start_scheduler()
    yield
    stop_scheduler()
    logger.info("Shutting down %s", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    description="AI-powered behavior pattern analysis chatbot",
    version="1.0.0",
    lifespan=lifespan,
)

# ── Middleware (order matters: first added = outermost) ──────────────────────
app.add_middleware(RequestLoggingMiddleware)
_DEV_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]
_EXTRA_ORIGINS = [o.strip() for o in (settings.allowed_origins or "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_DEV_ORIGINS + _EXTRA_ORIGINS,
    allow_origin_regex=r"https://.*\.(vercel\.app|onrender\.com)",
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
)

# ── Global exception handler ─────────────────────────────────────────────────
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    error_id = str(uuid.uuid4())[:8]
    logger.error(
        "Unhandled exception [%s] %s %s: %s",
        error_id,
        request.method,
        request.url.path,
        exc,
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error_id": error_id},
    )

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(behaviors.router)
app.include_router(analysis.router)
app.include_router(ui.router)
app.include_router(community_router.router)


@app.get("/")
def root():
    return {
        "message": settings.app_name,
        "version": "1.0.0",
        "environment": settings.app_env,
    }


@app.get("/health")
def health_check():
    from backend.redis_client import redis_store

    # DB ping
    db_ok = False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    # Redis ping
    redis_ok = False
    try:
        if redis_store.client:
            redis_store.client.ping()
            redis_ok = True
    except Exception:
        pass

    overall = "healthy" if db_ok else "degraded"
    return {
        "status": overall,
        "db": "ok" if db_ok else "error",
        "redis": "ok" if redis_ok else "unavailable",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.app_env == "development",
    )
