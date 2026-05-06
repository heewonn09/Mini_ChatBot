# Mindflow (Mini_ChatBot)

행동 기록을 기반으로 패턴을 분석하고, AI 코치와 대화할 수 있는 풀스택 서비스입니다.  
현재 버전은 **사용자 인증 + 행동 로그 + 분석 + 채팅 히스토리 + Redis 캐시/레이트리밋 + DEMO 시드 + CI**까지 포함합니다.

---

## 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [핵심 기능](#핵심-기능)
3. [기술 스택/아키텍처](#기술-스택아키텍처)
4. [빠른 실행 (Local)](#빠른-실행-local)
5. [DEMO 모드 실행](#demo-모드-실행)
6. [환경변수](#환경변수)
7. [Docker Compose 실행](#docker-compose-실행)
8. [API 요약](#api-요약)
9. [테스트/CI](#테스트ci)
10. [트러블슈팅](#트러블슈팅)
11. [향후 확장 제안](#향후-확장-제안)

---

## 프로젝트 개요

Mindflow는 “기록 → 분석 → 피드백” 루프를 빠르게 만들기 위한 프로젝트입니다.

- **기록**: 사용자 행동/감정 로그 저장
- **분석**: 패턴 계산 및 인사이트 생성
- **대화**: AI 코치에게 질문 + 과거 대화 기억

---

## 핵심 기능

- JWT 기반 회원가입/로그인
- 사용자별 행동 로그 CRUD
- 최근 N일 행동 패턴 분석
- 채팅 히스토리 DB 저장 (`chat_history`)
- Redis 기반 분석 캐시 (`analysis:{user_id}:{days}`)
- Redis 기반 채팅 레이트리밋 (`rate:chat:{user_id}`)
- Redis unavailable 시 메모리 fallback
- EN/KR UI 토글(현재 공통 + Chat 중심)

---

## 기술 스택/아키텍처

### Backend
- FastAPI
- SQLAlchemy
- Pydantic
- JWT (`python-jose`)
- Redis client (fallback 포함)

### Frontend
- React + Vite
- React Router
- Axios

### Infra
- SQLite (기본)
- MySQL (옵션)
- Redis
- Docker Compose
- GitHub Actions (backend/frontend workflow)

---

## 빠른 실행 (Local)

### 1) 백엔드

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
cp .env.example .env
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### 2) 프론트엔드

```bash
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

