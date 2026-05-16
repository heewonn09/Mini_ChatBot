import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool

from alembic import context

# Make sure 'backend' package is importable
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Pull DATABASE_URL from environment (falls back to alembic.ini value)
db_url = os.environ.get("DATABASE_URL")
if db_url:
    config.set_main_option("sqlalchemy.url", db_url)

# Import all models so autogenerate can detect them
from backend.models.base import Base  # noqa: E402
from backend.models.behavior import User, BehaviorLog  # noqa: E402, F401
from backend.models.chat import ChatSession, ChatHistory  # noqa: E402, F401
from backend.models.preferences import UserPreferences  # noqa: E402, F401
from backend.models.audit import AuditLog  # noqa: E402, F401

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,  # required for SQLite ALTER TABLE support
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,  # required for SQLite ALTER TABLE support
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
