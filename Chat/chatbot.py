from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
import os
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    raise Exception("GOOGLE_API_KEY 환경 변수가 설정되지 않았습니다.")

# Google Generative AI 구성
genai.configure(api_key=GOOGLE_API_KEY)

# GenerativeModel 초기화
model = genai.GenerativeModel(
    'gemini-2.5-flash-lite',
    #AI 모델의 역할 부여 
    system_instruction="""
        넌 내게 유용한 정보를 주는 친구야.
    """
)

# FastAPI 애플리케이션 생성
app = FastAPI(title="Gemini 챗봇")

# 요청 모델 정의
class ChatRequest(BaseModel):
    prompt: str

@app.post("/chat/")
async def chat(request: ChatRequest):
    try:
        # 사용자 프롬프트 추출
        user_prompt = request.prompt

        # 모델을 사용하여 응답 생성
        response = model.generate_content(
            user_prompt,
            generation_config=genai.types.GenerationConfig(
                candidate_count=1,
                temperature=0.7
            )
        )

        # 응답 처리
        if response.candidates and response.candidates[0].content.parts:
            generated_text = ''.join([part.text for part in response.candidates[0].content.parts])
        else:
            raise HTTPException(status_code=500, detail="유효한 응답 내용을 찾을 수 없습니다.")

        return {"reply": generated_text.strip()}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"서버 내부 오류: {str(e)}")