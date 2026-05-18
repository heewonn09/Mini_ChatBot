from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.models.behavior import User
from backend.models.chat import ChatHistory, ChatSession
from backend.redis_client import redis_store
from backend.schemas.ui import (
    ChatBootstrapResponse,
    ChatHistoryItem,
    ChatHistoryResponse,
    ChatResponse,
    ChatSessionItem,
    ChatSessionListResponse,
    CreateSessionResponse,
)
from backend.models.behavior import BehaviorLog
from backend.services.ai_feedback_service import AIFeedbackService
from backend.services.dashboard_service import DashboardService
from backend.services.pattern_analysis_service import PatternAnalysisService
from backend.utils.analysis_utils import format_display_name as _format_display_name

CHAT_RATE_LIMIT = 30
CHAT_RATE_WINDOW = 60

CHAT_SUGGESTIONS = [
    "왜 나는 생산적이지 않을까요?",
    "내 습관을 분석해줘",
    "어떻게 하면 더 집중할 수 있나요?",
    "공부하기 가장 좋은 시간대가 언제인가요?",
]


class ChatService:
    def __init__(self, db: Session, ai_service: AIFeedbackService):
        self.db = db
        self.ai = ai_service

    def check_rate_limit(self, user_id: int) -> None:
        key = f"rate:chat:{user_id}"
        count = redis_store.incr_with_ttl(key, CHAT_RATE_WINDOW)
        if count > CHAT_RATE_LIMIT:
            raise HTTPException(
                status_code=429,
                detail="채팅 요청이 너무 많아요. 잠시 후 다시 시도해주세요.",
            )

    def list_sessions(self, user_id: int) -> ChatSessionListResponse:
        sessions = (
            self.db.query(ChatSession)
            .filter(ChatSession.user_id == user_id)
            .order_by(ChatSession.updated_at.desc())
            .all()
        )
        return ChatSessionListResponse(
            sessions=[
                ChatSessionItem(
                    id=s.id,
                    title=s.title,
                    created_at=s.created_at,
                    updated_at=s.updated_at,
                )
                for s in sessions
            ]
        )

    def create_session(self, user_id: int) -> CreateSessionResponse:
        session = ChatSession(user_id=user_id, title="새 대화")
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return CreateSessionResponse(
            id=session.id,
            title=session.title,
            created_at=session.created_at,
        )

    def delete_session(self, user_id: int, session_id: int) -> None:
        session = (
            self.db.query(ChatSession)
            .filter(ChatSession.id == session_id, ChatSession.user_id == user_id)
            .first()
        )
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        self.db.delete(session)
        self.db.commit()

    def get_bootstrap(self, user: User) -> ChatBootstrapResponse:
        analysis = PatternAnalysisService.analyze_behaviors(
            user_id=user.id, days=7, db=self.db
        )
        top_emotion = (
            analysis.behavior_patterns[0].emotion
            if analysis.behavior_patterns
            else "습관"
        )
        name = _format_display_name(user.username)
        intro = (
            f"안녕하세요, {name}님! 저는 행동 분석 어시스턴트입니다. 최근 패턴을 분석했으며 "
            f"습관을 더 잘 이해할 수 있도록 도울 준비가 됐어요. 지금 가장 강한 신호는 '{top_emotion}'입니다."
        )
        history = (
            self.db.query(ChatHistory)
            .filter(ChatHistory.user_id == user.id)
            .order_by(ChatHistory.created_at.desc())
            .limit(6)
            .all()
        )
        if history:
            intro += " 최근 대화 내용도 기억하고 있어요."
        return ChatBootstrapResponse(intro=intro, suggested_prompts=CHAT_SUGGESTIONS)

    def send_message(
        self, user: User, message: str, session_id: int | None
    ) -> ChatResponse:
        self.check_rate_limit(user.id)

        if session_id:
            session = (
                self.db.query(ChatSession)
                .filter(
                    ChatSession.id == session_id,
                    ChatSession.user_id == user.id,
                )
                .first()
            )
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
        else:
            session = ChatSession(user_id=user.id, title="새 대화")
            self.db.add(session)
            self.db.flush()
            session_id = session.id

        analysis = PatternAnalysisService.analyze_behaviors(
            user_id=user.id, days=14, db=self.db
        )
        # Gemini 이중 호출 방지: generate_feedback 대신 분석 데이터로 직접 요약
        if analysis.behavior_patterns:
            top = analysis.behavior_patterns[0]
            behavior_summary = (
                f"최근 14일 행동 분석: 총 {analysis.total_logs}건 기록. "
                f"주요 감정: {top.emotion} ({top.percentage:.0f}%, 평균 강도 {top.intensity_avg:.1f}/10). "
            )
            if len(analysis.behavior_patterns) > 1:
                others = ", ".join(p.emotion for p in analysis.behavior_patterns[1:3])
                behavior_summary += f"기타 감정: {others}."
        else:
            behavior_summary = "최근 행동 기록이 없습니다."

        recent_messages = (
            self.db.query(ChatHistory)
            .filter(
                ChatHistory.user_id == user.id,
                ChatHistory.session_id == session_id,
            )
            .order_by(ChatHistory.created_at.desc())
            .limit(10)
            .all()
        )
        memory = "\n".join(
            f"{item.role}: {item.message}" for item in reversed(recent_messages)
        )

        logs = (
            self.db.query(BehaviorLog)
            .filter(BehaviorLog.user_id == user.id)
            .order_by(BehaviorLog.created_at.desc())
            .limit(200)
            .all()
        )
        recent_log_details = [
            {
                "created_at": log.created_at.isoformat() if log.created_at else "",
                "tag": log.tag or "",
                "emotion": log.emotion or "",
                "intensity": log.intensity or 0,
                "text": (log.text or "")[:80],
                "notes": (getattr(log, "notes", None) or "")[:60],
            }
            for log in logs[:15]
        ]
        user_context = {
            "top_emotion": analysis.behavior_patterns[0].emotion if analysis.behavior_patterns else None,
            "streak_days": DashboardService.current_streak(logs),
            "total_logs": analysis.total_logs,
            "recent_logs": recent_log_details,
        }

        try:
            answer = self.ai.generate_chat_response(
                user_message=message,
                username=_format_display_name(user.username),
                behavior_summary=behavior_summary,
                conversation_memory=memory,
                user_context=user_context,
            )
        except Exception:
            answer = "지금은 답변하지 못했어요. 잠시 후 다시 시도해주세요."

        if not recent_messages:
            session.title = message[:40] + ("..." if len(message) > 40 else "")

        self.db.add(
            ChatHistory(
                user_id=user.id,
                session_id=session_id,
                role="user",
                message=message,
                created_at=datetime.now(timezone.utc),
            )
        )
        self.db.add(
            ChatHistory(
                user_id=user.id,
                session_id=session_id,
                role="assistant",
                message=answer,
                created_at=datetime.now(timezone.utc),
            )
        )
        self.db.commit()
        self.db.query(ChatSession).filter(ChatSession.id == session_id).update(
            {"message_count": ChatSession.message_count + 2}
        )
        self.db.commit()
        return ChatResponse(answer=answer, session_id=session_id)

    def rename_session(self, user_id: int, session_id: int, title: str) -> ChatSessionItem:
        session = (
            self.db.query(ChatSession)
            .filter(ChatSession.id == session_id, ChatSession.user_id == user_id)
            .first()
        )
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        session.title = title[:100]
        self.db.commit()
        self.db.refresh(session)
        return ChatSessionItem(
            id=session.id,
            title=session.title,
            created_at=session.created_at,
            updated_at=session.updated_at,
        )

    def get_history(
        self,
        user_id: int,
        session_id: int | None,
        limit: int,
        offset: int,
    ) -> ChatHistoryResponse:
        query = self.db.query(ChatHistory).filter(ChatHistory.user_id == user_id)
        if session_id is not None:
            query = query.filter(ChatHistory.session_id == session_id)
        rows = (
            query.order_by(ChatHistory.created_at.asc())
            .offset(offset)
            .limit(min(limit, 100))
            .all()
        )
        return ChatHistoryResponse(
            items=[
                ChatHistoryItem(
                    role=row.role,
                    message=row.message,
                    created_at=row.created_at,
                )
                for row in rows
            ]
        )
