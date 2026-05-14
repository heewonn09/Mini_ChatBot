from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, Session
from backend.config import get_settings
from backend.models.base import Base  # noqa: F401  — re-exported for legacy callers

settings = get_settings()


def _build_engine(database_url: str):
    is_sqlite = database_url.startswith("sqlite")
    return create_engine(
        database_url,
        echo=settings.database_echo,
        connect_args={"check_same_thread": False} if is_sqlite else {},
        pool_pre_ping=True,
        pool_recycle=3600,
    )


def _create_engine_with_fallback():
    try:
        primary_engine = _build_engine(settings.database_url)
        with primary_engine.connect():
            pass
        return primary_engine
    except BaseException as e:
        # BaseException is intentional: pyo3/Rust-backed drivers (e.g. cryptography)
        # raise PanicException which is a BaseException, not Exception.
        import logging as _logging
        _logging.getLogger(__name__).warning("Primary DB unreachable (%s: %s)", type(e).__name__, e)
        if settings.database_url.startswith("sqlite"):
            raise
        _logging.getLogger(__name__).info("Falling back to SQLite")
        fallback_url = "sqlite:///./mini_chatbot.db"
        return _build_engine(fallback_url)


# Create SQLAlchemy engine
engine = _create_engine_with_fallback()

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ==================== 가장 중요한 부분 ====================
# 모든 모델을 여기서 import (테이블 생성을 위해)
from backend.models.behavior import User, BehaviorLog  # noqa: F401
from backend.models.chat import ChatHistory, ChatSession  # noqa: F401
from backend.models.preferences import UserPreferences  # noqa: F401
from backend.models.audit import AuditLog  # noqa: F401
# =========================================================

def get_db() -> Session:
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# 테이블 자동 생성 함수 (startup에서 호출용)
def create_tables():
    Base.metadata.create_all(bind=engine)
    run_schema_migrations()
    print(" All tables created successfully!")

def run_schema_migrations():
    """Lightweight runtime migration for development environments."""
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    if "users" not in tables:
        return

    columns = {col["name"] for col in inspector.get_columns("users")}
    if "password_hash" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)"))
            if "password" in columns:
                conn.execute(text("UPDATE users SET password_hash = password WHERE password_hash IS NULL"))

    # chat_history.session_id migration
    if "chat_history" in tables:
        chat_cols = {col["name"] for col in inspector.get_columns("chat_history")}
        if "session_id" not in chat_cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE chat_history ADD COLUMN session_id INTEGER REFERENCES chat_sessions(id)"))

    # chat_sessions new columns
    if "chat_sessions" in tables:
        cs_cols = {col["name"] for col in inspector.get_columns("chat_sessions")}
        with engine.begin() as conn:
            if "message_count" not in cs_cols:
                conn.execute(text("ALTER TABLE chat_sessions ADD COLUMN message_count INTEGER DEFAULT 0"))
            if "archived" not in cs_cols:
                conn.execute(text("ALTER TABLE chat_sessions ADD COLUMN archived BOOLEAN DEFAULT FALSE"))

    # Cross-DB index creation without raw IF NOT EXISTS syntax.
    index_specs = [
        ("behavior_logs", "idx_behavior_logs_user_created", "user_id, created_at"),
        ("chat_history", "idx_chat_history_session_created", "session_id, created_at"),
        ("audit_logs", "idx_audit_logs_user_created", "user_id, created_at"),
    ]
    for table_name, index_name, columns_sql in index_specs:
        if table_name not in tables:
            continue
        table_indexes = inspector.get_indexes(table_name)
        index_exists = any(index.get("name") == index_name for index in table_indexes)
        if index_exists:
            continue
        with engine.begin() as conn:
            conn.execute(text(f"CREATE INDEX {index_name} ON {table_name}({columns_sql})"))
