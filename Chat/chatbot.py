from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
from config import settings

# API KEY 체크
if not settings.GOOGLE_API_KEY:
    raise Exception("GOOGLE_API_KEY 환경 변수가 설정되지 않았습니다.")

# Gemini 설정
genai.configure(api_key=settings.GOOGLE_API_KEY)

# 모델 초기화
model = genai.GenerativeModel(
    'gemini-2.5-flash',  # ← 안정적인 모델 추천
    system_instruction="""
    넌 내게 유용한 정보를 주는 친구야.
    """
)

# FastAPI 앱
app = FastAPI(title="Gemini 챗봇")

# 요청 모델
class ChatRequest(BaseModel):
    prompt: str

@app.post("/chat/")
async def chat(request: ChatRequest):
    try:
        response = model.generate_content(
            request.prompt,
            generation_config=genai.types.GenerationConfig(
                candidate_count=1,
                temperature=0.7
            )
        )

        # 안정적인 방식
        generated_text = response.text

        return {"reply": generated_text.strip()}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))