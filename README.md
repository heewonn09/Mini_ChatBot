# Mini ChatBot (Behavior Pattern Analysis)

사용자의 행동 로그를 기록하고, 패턴 분석 + AI 피드백 + 대시보드 시각화를 제공하는 **FastAPI + React(Vite)** 기반 풀스택 프로젝트입니다.

## 📋 목차

1. [프로젝트 개요](#-프로젝트-개요)
2. [기술 스택](#-기술-스택)
3. [프로젝트 구조](#-프로젝트-구조)
4. [실행 방법](#-실행-방법)
5. [환경 변수](#-환경-변수)
6. [API 요약](#-api-요약)
7. [프론트엔드 동작 흐름](#-프론트엔드-동작-흐름)
8. [백엔드 분석 로직](#-백엔드-분석-로직)
9. [데이터 모델](#-데이터-모델)
10. [개발 참고 사항](#-개발-참고-사항)

---

## 🧭 프로젝트 개요

이 프로젝트는 다음 기능을 제공합니다.

- 사용자 생성/조회/삭제
- 행동 로그 CRUD
- 최근 행동 기반 패턴 분석(감정 비율, 트렌드, 리스크 패턴)
- 분석 결과 기반 AI 피드백 생성(Gemini 사용 가능 시)
- 대시보드/분석/채팅/프로필 UI용 집계 API
- 프론트에서 데모 유저 + 샘플 로그 자동 부트스트랩

---

## 🛠 기술 스택

### Backend
- FastAPI
- SQLAlchemy
- Pydantic v2 / pydantic-settings
- Uvicorn
- google-generativeai (옵션)

### Frontend
- React 19
- Vite
- React Router
- Axios
- Recharts
- Lucide React

### Database
- SQLite (기본)
- MySQL (docker-compose 예시 제공)

---

## 🏗 프로젝트 구조

```text
Mini_ChatBot/
├─ backend/
│  ├─ main.py                       # FastAPI 앱 진입점
│  ├─ config.py                     # 환경변수/설정 로딩
│  ├─ database.py                   # DB 엔진/세션
│  ├─ models/behavior.py            # User, BehaviorLog 모델
│  ├─ schemas/
│  │  ├─ behavior.py                # 사용자/행동/분석 스키마
│  │  └─ ui.py                      # UI 전용 응답 스키마
│  ├─ services/
│  │  ├─ pattern_analysis_service.py# 패턴 분석 핵심 로직
│  │  └─ ai_feedback_service.py     # AI 피드백(없으면 fallback)
│  └─ routers/
│     ├─ users.py                   # /api/users
│     ├─ behaviors.py               # /api/behaviors
│     ├─ analysis.py                # /api/analysis
│     └─ ui.py                      # /api/ui
├─ frontend/
│  ├─ src/
│  │  ├─ api/api.js                 # 백엔드 호출 + seed 로직
│  │  ├─ hooks/useAppData.js        # 앱 초기 데이터 로딩
│  │  ├─ pages/                     # Dashboard/Log/Analysis/Chat/Profile
│  │  ├─ layouts/AppLayout.jsx
│  │  └─ components/
│  └─ package.json
├─ requirements.txt
└─ docker-compose.yml               # MySQL 실행 예시
```

---

## 🚀 실행 방법

## 1) 백엔드 실행

```bash
# (권장) 가상환경 생성 후 활성화
python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

헬스체크:

```bash
curl http://127.0.0.1:8000/health
```

## 2) 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

기본적으로 프론트는 `http://127.0.0.1:8000/api`를 호출합니다.

## 3) (선택) MySQL 실행

```bash
docker compose up -d
```

이후 `DATABASE_URL`을 MySQL DSN으로 설정해 사용할 수 있습니다.

---

## 🔐 환경 변수

`backend/config.py` 기준 주요 환경 변수:

```env
DATABASE_URL=sqlite:///./mini_chatbot.db
DATABASE_ECHO=False
GOOGLE_API_KEY=
APP_NAME=Behavior Pattern Analysis Chatbot
APP_ENV=development
LOG_LEVEL=INFO
```

- `GOOGLE_API_KEY`가 없으면 AI 응답은 서비스 내부 fallback 요약으로 동작합니다.
- MySQL 사용 예시:
  - `mysql+pymysql://user:user123@127.0.0.1:3307/pattern_db`

---

## 🔌 API 요약

### 공통
- `GET /` : 앱 메타 정보
- `GET /health` : 헬스체크

### Users (`/api/users`)
- `POST /` : 사용자 생성
- `GET /` : 사용자 목록
- `GET /{user_id}` : 사용자 조회
- `DELETE /{user_id}` : 사용자 삭제

### Behaviors (`/api/behaviors`)
- `POST /{user_id}` : 행동 로그 생성
- `GET /{user_id}` : 사용자 행동 로그 목록
- `GET /{user_id}/{log_id}` : 단일 로그 조회
- `PUT /{user_id}/{log_id}` : 로그 수정
- `DELETE /{user_id}/{log_id}` : 로그 삭제

### Analysis (`/api/analysis`)
- `POST /{user_id}` : `days` 기준 패턴 분석 + AI 피드백

### UI 전용 (`/api/ui`)
- `GET /{user_id}/overview` : 대시보드 카드/타임라인/인사이트
- `GET /{user_id}/analysis` : 분석 페이지 데이터
- `GET /{user_id}/profile` : 프로필 페이지 데이터
- `GET /{user_id}/chat/bootstrap` : 채팅 초기 문구/추천 프롬프트
- `POST /{user_id}/chat` : 채팅 응답

---

## 🖥 프론트엔드 동작 흐름

초기 로딩 시 `useAppData` 훅에서 다음 순서로 진행합니다.

1. 유저가 없으면 데모 유저 생성
2. 로그가 없으면 샘플 로그 시드 데이터 입력
3. overview API 호출 후 화면 렌더링

즉, **백엔드를 켜기만 해도 기본 데모 데이터로 화면을 바로 확인**할 수 있습니다.

---

## 🧠 백엔드 분석 로직

`PatternAnalysisService`에서 수행:

- 감정별 빈도/비율/평균 강도 계산
- 감정 강도 추세(increasing/decreasing/stable) 계산
- 리스크 패턴 탐지
  - 부정 감정 고빈도 + 고강도
  - 급격한 감정 강도 변화
  - 특정 위험 태그 포함 여부

`AIFeedbackService`는:

- Gemini 설정 시 모델 기반 피드백 생성
- 미설정/오류 시 분석 요약 + 권장사항 fallback 텍스트 반환

---

## 🗃 데이터 모델

### User
- `id`, `username`, `email`, `created_at`, `updated_at`

### BehaviorLog
- `id`, `user_id`, `text`, `emotion`, `tag`, `intensity`, `created_at`

`User 1 : N BehaviorLog` 관계를 가집니다.

---

## 🧪 개발 참고 사항

- DB 연결 실패 시(비-SQLite) 내부적으로 SQLite fallback을 시도합니다.
- CORS는 현재 전체 허용(`*`)으로 되어 있어, 운영 환경에서는 반드시 제한이 필요합니다.
- 루트 README는 현재 프로젝트 기준으로 정리되어 있으며, `frontend/README.md`는 Vite 기본 템플릿 문서입니다.

---

필요하면 다음 단계로 API 요청/응답 예시(JSON)까지 확장해 드릴 수 있습니다.
