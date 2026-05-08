"""Development DB reset utility.

Drops and recreates all tables using current SQLAlchemy models.
Use only in local/dev environments.
"""

from backend.database import Base, engine


def reset_db() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Database reset complete: dropped and recreated all tables.")


if __name__ == "__main__":
    reset_db()
