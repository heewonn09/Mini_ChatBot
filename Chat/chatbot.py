from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from google import genai
from config import settings

# API KEY 체크
if not settings.GOOGLE_API_KEY:
    raise Exception("GOOGLE_API_KEY 환경 변수가 설정되지 않았습니다.")

# 클라이언트 생성
client = genai.Client(api_key=settings.GOOGLE_API_KEY)

# FastAPI 앱
app = FastAPI(title="Gemini 챗봇")

# 요청 모델
class ChatRequest(BaseModel):
    prompt: str

@app.post("/chat/")
async def chat(request: ChatRequest):
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=request.prompt
        )

        return {"reply": response.text.strip()}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))