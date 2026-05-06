import os
from datetime import datetime, timedelta

from backend.auth import hash_password
from backend.database import SessionLocal, create_tables
from backend.models.behavior import BehaviorLog, User
from backend.models.chat import ChatHistory


def run_seed():
    create_tables()
    db = SessionLocal()
    try:
        email = os.getenv("DEMO_EMAIL", "demo@mindflow.local")
        username = os.getenv("DEMO_USERNAME", "demo_user")
        password = os.getenv("DEMO_PASSWORD", "demo12345")

        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(username=username, email=email, password_hash=hash_password(password))
            db.add(user)
            db.commit()
            db.refresh(user)

        if not db.query(BehaviorLog).filter(BehaviorLog.user_id == user.id).first():
            for i in range(10):
                db.add(BehaviorLog(
                    user_id=user.id,
                    text=f"Demo log #{i+1}",
                    emotion=["focused", "happy", "stressed"][i % 3],
                    tag=["Study", "Exercise", "Break"][i % 3],
                    intensity=6 + (i % 3),
                    created_at=datetime.utcnow() - timedelta(days=i),
                ))
        if not db.query(ChatHistory).filter(ChatHistory.user_id == user.id).first():
            db.add(ChatHistory(user_id=user.id, role="assistant", message="Welcome back!"))
        db.commit()
        print(f"Seed done: {email} / {password}")
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
