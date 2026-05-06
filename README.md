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

## DEMO 모드 실행

원커맨드 준비:

```bash
./run_demo.sh
```

실행 내용:
1. 백엔드 의존성 설치
2. `scripts/demo_seed.py` 실행
   - 데모 유저 생성
   - 행동 로그 시드
   - 채팅 히스토리 시드
3. 프론트 의존성 설치 + 빌드

기본 데모 계정:
- `demo@mindflow.local`
- `demo12345`

오버라이드 환경변수:
- `DEMO_EMAIL`
- `DEMO_USERNAME`
- `DEMO_PASSWORD`

---

## 환경변수

`.env.example` 기준:

- `DATABASE_URL`
- `DATABASE_ECHO`
- `GOOGLE_API_KEY`
- `JWT_SECRET_KEY`
- `VITE_API_BASE_URL`
- `REDIS_URL`

> `.env` 파일은 민감정보가 포함되므로 Git에 커밋하지 않습니다.

---

## Docker Compose 실행

```bash
docker compose up --build
```

기본 서비스:
- `backend` (8000)
- `mysql` (3307 -> 3306)
- `redis` (6379)

---

## API 요약

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
  - Redis 캐시 적용

### UI
- `GET /api/ui/{user_id}/overview`
- `GET /api/ui/{user_id}/analysis`
- `GET /api/ui/{user_id}/profile`
- `GET /api/ui/{user_id}/chat/bootstrap`
- `GET /api/ui/{user_id}/chat/history` (최근 대화 조회)
- `POST /api/ui/{user_id}/chat` (rate limit 적용)

---

## 테스트/CI

### 로컬 테스트

```bash
python -m compileall backend
python -m unittest discover -s backend/tests -p 'test_*.py'
```

### GitHub Actions

- `backend-tests.yml`
  - backend 의존성 설치
  - compileall
  - unittest
- `frontend-tests.yml`
  - npm ci
  - lint
  - build

---

## 트러블슈팅

1) `ModuleNotFoundError`
- 백엔드 의존성 설치 확인: `pip install -r backend/requirements.txt`

2) npm install/build 실패
- 레지스트리 접근/사내 보안정책 확인
- `npm cache clean --force` 후 재시도

3) Redis 미연결
- 개발환경에서는 fallback으로 동작 가능
- 운영환경에서는 Redis 연결을 권장

---

## 향후 확장 제안

- 페이지 전체 KR/EN 번역 100% 커버
- Redis 세션/토큰 블랙리스트
- Alembic 마이그레이션 도입
- E2E 테스트 자동화
- 채팅 장기 메모리 요약/압축 전략

