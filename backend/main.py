from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from backend.config import get_settings
from backend.database import engine, Base
from backend.routers import users, behaviors, analysis, ui, webhooks
from backend.models.behavior import User, BehaviorLog

# Get settings
settings = get_settings()

# Configure logging
logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

# Create tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="AI-powered behavior pattern analysis chatbot",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users.router)
app.include_router(behaviors.router)
app.include_router(analysis.router)
app.include_router(ui.router)
app.include_router(webhooks.router)


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": settings.app_name,
        "version": "1.0.0",
        "environment": settings.app_env,
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.on_event("startup")
async def startup_event():
    """Startup event"""
    logger.info(f"Starting {settings.app_name}")
    logger.info(f"Environment: {settings.app_env}")


@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event"""
    logger.info(f"Shutting down {settings.app_name}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.app_env == "development",
    )
