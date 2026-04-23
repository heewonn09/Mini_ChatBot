from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from backend.config import get_settings

settings = get_settings()


def _build_engine(database_url: str):
    is_sqlite = database_url.startswith("sqlite")
    return create_engine(
        database_url,
        echo=settings.database_echo,
        connect_args={"check_same_thread": False} if is_sqlite else {},
        pool_pre_ping=True,  # Verify connections before using them
        pool_recycle=3600,   # Recycle connections every hour
    )


def _create_engine_with_fallback():
    primary_engine = _build_engine(settings.database_url)
    try:
        with primary_engine.connect():
            pass
        return primary_engine
    except Exception:
        if settings.database_url.startswith("sqlite"):
            raise
        fallback_url = "sqlite:///./mini_chatbot.db"
        return _build_engine(fallback_url)


# Create SQLAlchemy engine
engine = _create_engine_with_fallback()

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db() -> Session:
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
