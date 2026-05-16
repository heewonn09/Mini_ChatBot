import json
import logging
import time
import urllib.error
import urllib.request
from typing import Optional

from backend.config import get_settings
from backend.schemas.behavior import PatternAnalysisResult

logger = logging.getLogger(__name__)

_GEMINI_MODEL = "gemini-2.5-flash"
_GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models/"


def _call_gemini(api_key: str, prompt: str, temperature: float = 0.7, max_retries: int = 3) -> str:
    url = f"{_GEMINI_BASE}{_GEMINI_MODEL}:generateContent?key={api_key}"
    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "candidateCount": 1,
            "maxOutputTokens": 2000,
        },
    }).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})

    last_exc: Exception = RuntimeError("No attempts made")
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                result = json.loads(resp.read())
            return result["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception as exc:
            last_exc = exc
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)

    raise last_exc


class AIFeedbackService:
    def __init__(self):
        self.api_key: str = ""
        self.system_instruction = (
            "You are a professional behavioral analyst and psychologist assistant. "
            "Provide empathetic, constructive feedback based on behavior analysis data. "
            "Focus on positive reinforcement and actionable insights. "
            "Keep responses concise but meaningful. "
            "Always respond in Korean (한국어로만 답변하세요)."
        )
        settings = get_settings()
        if settings.google_api_key:
            self.api_key = settings.google_api_key
        else:
            logger.warning("GOOGLE_API_KEY not set; AI feedback will use fallback text")

    def generate_feedback(self, analysis: PatternAnalysisResult) -> str:
        if not self.api_key:
            return self._fallback_feedback(analysis)

        patterns_summary = "\n".join([
            f"- {p.emotion}: {p.count}개 ({p.percentage}%), 평균 강도: {p.intensity_avg}/10"
            for p in analysis.behavior_patterns
        ])
        trends_summary = "\n".join([
            f"- {t.emotion}: {t.trend} 추세, 최근 강도: {t.recent_intensity}/10"
            for t in analysis.emotional_trends
        ]) or "감지된 추세 없음"
        risks_summary = "\n".join([
            f"- {r.pattern} ({r.severity}): {r.description}"
            for r in analysis.risky_patterns
        ]) or "위험 패턴 없음"

        prompt = (
            f"{self.system_instruction}\n\n"
            f"최근 {analysis.analysis_period_days}일 행동 패턴 데이터를 분석하고 건설적인 피드백을 제공하세요.\n\n"
            f"총 기록 수: {analysis.total_logs}\n"
            f"감정 패턴:\n{patterns_summary}\n\n"
            f"추세:\n{trends_summary}\n\n"
            f"위험 요소:\n{risks_summary}\n\n"
            "다음을 포함하세요: (1) 주요 관찰, (2) 긍정적 측면, (3) 2~3가지 추천, "
            "(4) 격려하는 마무리. 300자 이내로 간결하게."
        )

        try:
            return _call_gemini(self.api_key, prompt, temperature=0.7)
        except Exception as e:
            logger.error("Gemini feedback failed: %s", e)
            return self._fallback_feedback(analysis)

    def generate_chat_response(
        self,
        user_message: str,
        username: str,
        behavior_summary: str,
        conversation_memory: str,
        user_context: Optional[dict] = None,
    ) -> str:
        if not self.api_key:
            return f"안녕하세요, {username}님! AI 어시스턴트가 현재 준비 중입니다. API 키를 확인해주세요."

        context_block = ""
        if user_context:
            top_emotion = user_context.get("top_emotion", "알 수 없음")
            streak = user_context.get("streak_days", 0)
            total = user_context.get("total_logs", 0)
            recent_logs = user_context.get("recent_logs", [])

            context_block = (
                f"\n[사용자 현황]\n"
                f"- 주요 감정: {top_emotion}\n"
                f"- 연속 기록: {streak}일\n"
                f"- 총 기록: {total}개\n"
            )

            if recent_logs:
                context_block += "\n[최근 행동 기록 (최신순)]\n"
                for log in recent_logs[:10]:
                    dt = log.get("created_at", "")[:10]
                    btype = log.get("behavior_type", "")
                    emotion = log.get("emotion", "")
                    intensity = log.get("intensity", "")
                    text = log.get("text", "")
                    notes = log.get("notes", "")
                    line = f"- [{dt}] {btype} | 감정:{emotion} | 강도:{intensity}/10 | {text}"
                    if notes:
                        line += f" ({notes})"
                    context_block += line + "\n"

        prompt = (
            f"{self.system_instruction}\n\n"
            f"사용자: {username}\n{context_block}\n"
            f"[행동 패턴 분석]\n{behavior_summary}\n\n"
            f"[대화 내역]\n{conversation_memory or '(없음)'}\n\n"
            f"[사용자 메시지] {user_message}\n\n"
            "위 기록 내용을 바탕으로 구체적인 행동과 감정을 언급하며 답변하세요. "
            "대화체로 자연스럽게, 질문 반복 없이 답변하세요."
        )

        try:
            return _call_gemini(self.api_key, prompt, temperature=0.8)
        except Exception as e:
            logger.error("Gemini chat failed: %s", e)
            return "일시적으로 응답할 수 없습니다. 잠시 후 다시 시도해주세요."

    def generate_weekly_report(self, username: str, behavior_summary: str) -> str:
        if not self.api_key:
            return f"{username}님의 주간 리포트를 생성하려면 API 키가 필요합니다."

        prompt = (
            f"{self.system_instruction}\n\n"
            f"{username}님의 지난 7일 행동 패턴을 분석하여 200자 내외의 주간 요약 리포트를 작성해주세요. "
            "구체적인 수치보다 패턴의 의미와 다음 주 개선 방향에 집중하세요.\n\n"
            f"분석 데이터:\n{behavior_summary}\n\n"
            "친근하고 격려하는 톤으로 200자 내외로 간결하게 마무리하세요."
        )

        try:
            return _call_gemini(self.api_key, prompt, temperature=0.7)
        except Exception as e:
            logger.error("Gemini weekly report failed: %s", e)
            return "주간 리포트를 일시적으로 생성할 수 없습니다. 잠시 후 다시 시도해주세요."

    def _fallback_feedback(self, analysis: PatternAnalysisResult) -> str:
        total_logs = analysis.total_logs
        response = f"패턴 분석 요약 ({analysis.analysis_period_days}일, {total_logs}개 기록):\n\n"

        if analysis.behavior_patterns:
            response += "주요 감정 패턴:\n"
            for pattern in analysis.behavior_patterns[:3]:
                response += f"- {pattern.emotion}: {pattern.count}개 ({pattern.percentage}%)\n"
            response += "\n"

        if analysis.emotional_trends:
            response += "감정 추세:\n"
            for trend in analysis.emotional_trends[:2]:
                response += f"- {trend.emotion}: {trend.trend} 추세\n"
            response += "\n"

        if analysis.risky_patterns:
            response += "주의가 필요한 영역:\n"
            for risk in analysis.risky_patterns[:2]:
                response += f"- {risk.pattern}: {risk.description}\n"
            response += "\n"

        response += (
            "추천 사항:\n"
            "1. 감정 패턴을 계속 추적하세요\n"
            "2. 중요한 감정 사건에 대해 일지를 작성해보세요\n"
            "3. 더 나은 감정 인식을 위해 마음챙김을 실천하세요\n\n"
            "자기 인식이 긍정적인 변화의 첫 걸음입니다. 계속 노력해주세요!"
        )
        return response
