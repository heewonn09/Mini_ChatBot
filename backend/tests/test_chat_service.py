from datetime import datetime, timedelta, timezone
from uuid import uuid4

from backend.models.behavior import BehaviorLog, User
from backend.models.chat import ChatHistory
from backend.services.chat_service import ChatService


class FakeAIService:
    def __init__(self, answer: str = "LLM 응답", should_raise: bool = False):
        self.answer = answer
        self.should_raise = should_raise
        self.calls = 0

    def generate_chat_response(self, **kwargs) -> str:
        self.calls += 1
        if self.should_raise:
            raise AssertionError("LLM should not be called for direct lookup questions")
        return self.answer


def _create_user(db, prefix: str) -> User:
    user = User(
        username=f"{prefix}_{uuid4().hex[:8]}",
        email=f"{prefix}_{uuid4().hex[:8]}@test.com",
        password_hash="hashed",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _add_log(
    db,
    user_id: int,
    hours_ago: int,
    emotion: str,
    tag: str,
    intensity: float,
    text: str,
) -> None:
    created_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(
        hours=hours_ago
    )
    db.add(
        BehaviorLog(
            user_id=user_id,
            text=text,
            emotion=emotion,
            tag=tag,
            intensity=intensity,
            created_at=created_at,
        )
    )
    db.commit()


def test_send_message_routes_simple_time_question_to_local_data(db):
    user = _create_user(db, "chat_local")
    _add_log(db, user.id, hours_ago=2, emotion="focused", tag="study", intensity=8, text="deep work")
    _add_log(db, user.id, hours_ago=3, emotion="focused", tag="study", intensity=7, text="reading")
    _add_log(db, user.id, hours_ago=14, emotion="sad", tag="social", intensity=6, text="scrolling")

    ai_service = FakeAIService(should_raise=True)
    chat_service = ChatService(db, ai_service)

    response = chat_service.send_message(
        user,
        "공부하기 가장 좋은 시간대가 언제인가요?",
        None,
    )

    assert "가장 집중 비율이 높은 시간대" in response.answer
    assert ai_service.calls == 0
    assert response.session_id > 0
    assert (
        db.query(ChatHistory)
        .filter(ChatHistory.user_id == user.id, ChatHistory.session_id == response.session_id)
        .count()
        == 2
    )


def test_send_message_routes_summary_question_to_local_data(db):
    user = _create_user(db, "chat_summary")
    _add_log(db, user.id, hours_ago=4, emotion="focused", tag="study", intensity=8, text="deep work")
    _add_log(db, user.id, hours_ago=10, emotion="calm", tag="reading", intensity=6, text="book")
    _add_log(db, user.id, hours_ago=30, emotion="sad", tag="social", intensity=6, text="late night")

    ai_service = FakeAIService(should_raise=True)
    chat_service = ChatService(db, ai_service)

    response = chat_service.send_message(
        user,
        "내 습관을 분석해줘",
        None,
    )

    assert "빠르게 요약하면 최근" in response.answer
    assert ai_service.calls == 0


def test_send_message_routes_complex_question_to_llm(db):
    user = _create_user(db, "chat_llm")
    _add_log(db, user.id, hours_ago=5, emotion="focused", tag="study", intensity=8, text="project")
    _add_log(db, user.id, hours_ago=26, emotion="anxious", tag="work", intensity=7, text="deadline")

    ai_service = FakeAIService(answer="LLM 경유 응답")
    chat_service = ChatService(db, ai_service)

    response = chat_service.send_message(
        user,
        "왜 나는 생산적이지 않을까요?",
        None,
    )

    assert response.answer == "LLM 경유 응답"
    assert ai_service.calls == 1
