from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from backend.config import get_settings
from backend.database import engine, Base, create_tables   # create_tables 추가
from backend.routers import users, behaviors, analysis, ui, auth

# ✅ 올바른 모델 import (중요!)
from backend.models.behavior import User, BehaviorLog
from backend.models.chat import ChatHistory

settings = get_settings()

# Configure logging
logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="AI-powered behavior pattern analysis chatbot",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
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


@app.get("/health")
def health_check():
    return {"status": "healthy"}


# ==================== Startup ====================
@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting {settings.app_name}...")
    logger.info(f"Environment: {settings.app_env}")
    
    # ✅ 테이블 생성 (MySQL이 제대로 연결되었을 때 실행)
    create_tables()
    
    # 테이블 존재 여부 확인 로그
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    logger.info(f"Created tables: {tables}")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info(f"Shutting down {settings.app_name}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=settings.app_env == "development")