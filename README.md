# Mindflow (Mini_ChatBot)

행동 기록 + 감정 패턴 분석 + AI 코칭을 결합한 풀스택 앱입니다.  
FastAPI(백엔드) + React/Vite(프론트) 기반이며, Redis 캐시/레이트리밋, 채팅 히스토리 저장, 로컬 DEMO 시드를 포함합니다.

---

## 1) 핵심 기능

- 회원가입/로그인(JWT) 기반 사용자별 데이터 분리
- 행동 로그 저장 및 패턴 분석
- AI 채팅 코치 + 채팅 히스토리 저장(`chat_history`)
- Redis 기반 분석 캐시(응답 가속)
- Redis 기반 채팅 rate limit(남용 방지)
- KR/EN UI 토글(현재 공통/채팅 중심으로 적용)

---

## 2) 아키텍처 요약

- **Backend**: FastAPI + SQLAlchemy
  - 도메인 모델: `User`, `BehaviorLog`, `ChatHistory`
  - 라우터: `auth`, `users`, `behaviors`, `analysis`, `ui`
- **Frontend**: React + Vite
  - 라우팅 + 대시보드/분석/로그/채팅/프로필
  - Axios 인터셉터 + 토큰 자동 주입
- **Data/Infra**:
  - DB: SQLite(기본) / MySQL(옵션)
  - Cache/Throttle: Redis

---

## 3) 빠른 시작 (로컬 개발)

### A. 수동 실행

```bash
# 1) 백엔드
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
cp .env.example .env
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# 2) 프론트엔드 (새 터미널)
cd frontend
npm install
npm run dev
```

- Backend: `http://127.0.0.1:8000`
- Frontend: `http://127.0.0.1:5173`

---

## 4) DEMO 버전 (원커맨드 시드)

아래 스크립트는 데모 계정/행동로그/기본 채팅 히스토리를 생성하고 프론트 빌드를 준비합니다.

```bash
./run_demo.sh
```

스크립트 동작:
1. `scripts/demo_seed.py` 실행 (데모 유저 + 로그 + 채팅 시드)
2. `frontend` 의존성 설치 후 빌드

기본 데모 계정(환경변수로 변경 가능):
- Email: `demo@mindflow.local`
- Password: `demo12345`

변경용 환경변수:
- `DEMO_EMAIL`
- `DEMO_USERNAME`
- `DEMO_PASSWORD`

---

## 5) Docker Compose 실행

```bash
docker compose up --build
```

포함 서비스:
- `mysql` (3307)
- `redis` (6379)
- `backend` (8000)

`docker-compose.yml`에서 `DATABASE_URL`, `REDIS_URL`, `GOOGLE_API_KEY`, `JWT_SECRET_KEY`를 주입합니다.

---

## 6) 환경변수

루트의 `.env.example` 기준:

- `DATABASE_URL`
- `DATABASE_ECHO`
- `GOOGLE_API_KEY`
- `JWT_SECRET_KEY`
- `VITE_API_BASE_URL`
- `REDIS_URL`

보안상 `.env`는 Git에 커밋하지 않습니다.

---

## 7) API 개요

### Auth
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Behaviors
- `POST /api/behaviors/{user_id}`
- `GET /api/behaviors/{user_id}`
- `GET /api/behaviors/{user_id}/{log_id}`
- `PUT /api/behaviors/{user_id}/{log_id}`
- `DELETE /api/behaviors/{user_id}/{log_id}`

### Analysis
- `POST /api/analysis/{user_id}`
  - Redis 캐시 키: `analysis:{user_id}:{days}`

### UI
- `GET /api/ui/{user_id}/overview`
- `GET /api/ui/{user_id}/analysis`
- `GET /api/ui/{user_id}/profile`
- `GET /api/ui/{user_id}/chat/bootstrap`
- `POST /api/ui/{user_id}/chat`
  - Rate limit: 기본 30 req / 60 sec / user

---

## 8) 현재 상태와 다음 단계

### 현재 완료
- 채팅 히스토리 저장 및 컨텍스트 반영
- Redis 캐시/레이트리밋 동작 경로 반영
- 로컬 DEMO 시드 스크립트 + 원커맨드 실행
- Chat 페이지 KR/EN 분리 적용

### 권장 다음 단계
- 전체 페이지 KR/EN 100% 번역키 추출/적용
- Redis 세션/토큰 블랙리스트 연계
- DB 마이그레이션(Alembic) 도입
- E2E 테스트(로그인 → 로그작성 → 분석 → 채팅) 자동화

---

## 9) 트러블슈팅

- `ModuleNotFoundError` 발생 시: 백엔드 의존성 설치 여부 확인
  - `pip install -r backend/requirements.txt`
- 프론트 빌드 시 Vite 플러그인 누락 오류:
  - `frontend/package.json` 의존성 설치 상태 확인
  - `npm install` 재실행
- Redis 미가동 환경:
  - 앱은 메모리 fallback으로 동작하지만, 운영환경에서는 Redis 실행 권장

