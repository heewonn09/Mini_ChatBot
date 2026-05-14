# Mindflow 하네스 엔지니어링 가이드

> **목적** — 개발 속도를 유지하면서 품질이 무너지지 않도록 보호하는 자동화 레이어 전체를 정의한다.  
> **범위** — FastAPI 백엔드 · React/Vite 프론트 · MySQL 8 · Redis 7 · Gemini 1.5-flash  
> **기준일** — 2026-05-14

---

## 목차

1. [현재 상태 진단](#1-현재-상태-진단)
2. [테스트 피라미드 전략](#2-테스트-피라미드-전략)
3. [CI/CD 파이프라인](#3-cicd-파이프라인)
4. [코드 품질 레이어](#4-코드-품질-레이어)
5. [로컬 개발 환경 (DevEx)](#5-로컬-개발-환경-devex)
6. [관찰성 스택](#6-관찰성-스택)
7. [성능 기준선 (SLO)](#7-성능-기준선-slo)
8. [보안 하네스](#8-보안-하네스)
9. [데이터베이스 마이그레이션](#9-데이터베이스-마이그레이션)
10. [AI 개발 하네스](#10-ai-개발-하네스)
11. [핵심 지표 대시보드](#11-핵심-지표-대시보드)

---

## 1. 현재 상태 진단

| 영역 | 현재 | 목표 | 우선순위 |
|------|------|------|----------|
| 백엔드 테스트 | `unittest.discover` — 구조 있으나 빈 케이스 | pytest + 커버리지 80%+ | 🔴 긴급 |
| 프론트엔드 테스트 | lint + build만 | Vitest 단위 + Playwright E2E | 🔴 긴급 |
| Python 린터 | 없음 | Ruff (lint + format 통합) | 🟠 높음 |
| pre-commit 훅 | 없음 | commit 시 자동 검사 | 🟠 높음 |
| DB 마이그레이션 | 없음 (수동 DDL) | Alembic | 🟠 높음 |
| 구조화 로깅 | `print` / 기본 logging | structlog + JSON 출력 | 🟡 중간 |
| 에러 추적 | 없음 | Sentry DSN | 🟡 중간 |
| 부하 테스트 | 없음 | k6 스크립트 | 🟢 낮음 |
| 패키지 관리 | pip | uv (점진적 전환) | 🟢 낮음 |

---

## 2. 테스트 피라미드 전략

```
          /\
         /  \   E2E (Playwright)  ← 핵심 사용자 흐름 3~5개
        /----\
       /      \ Integration       ← API 계층 + DB
      /--------\
     /          \ Unit            ← 순수 함수 · 헬퍼 · 훅
    /____________\
```

### 2-1. 백엔드 단위 테스트 (pytest)

**설치**

```bash
pip install pytest pytest-cov pytest-asyncio httpx
```

**디렉터리 구조**

```
backend/
  tests/
    unit/
      test_helpers.py       # _ratio, _dominant_emotion_label, _longest_streak 등
      test_ai_service.py    # AIFeedbackService (Gemini mock)
    integration/
      test_behaviors_api.py # POST /api/behaviors/{userId} → DB 확인
      test_ui_overview.py   # GET /api/ui/{userId}/overview (Redis mock)
    conftest.py             # TestClient, DB fixture, Redis mock
```

**`conftest.py` 기본 구조**

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch

from backend.main import app
from backend.database import Base, get_db

TEST_DB = "sqlite:///:memory:"

@pytest.fixture(scope="session")
def db_engine():
    engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    return engine

@pytest.fixture
def db(db_engine):
    Session = sessionmaker(bind=db_engine)
    session = Session()
    yield session
    session.rollback()
    session.close()

@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture(autouse=True)
def mock_redis():
    # Redis는 in-process fallback이 있으므로 실제 연결 없이 동작
    with patch("backend.redis_client.redis_store.client", None):
        yield
```

**핵심 테스트 케이스 예시**

```python
# test_helpers.py
from backend.routers.ui import _ratio, _dominant_emotion_label

def test_ratio_positive():
    class FakeLog:
        def __init__(self, emotion):
            self.emotion = emotion
    logs = [FakeLog("happy"), FakeLog("focused"), FakeLog("stressed")]
    assert round(_ratio(logs, lambda l: l.emotion in {"happy", "focused"}), 2) == 0.67

def test_dominant_emotion_label_stressed():
    class FakeLog:
        def __init__(self, e): self.emotion = e
    logs = [FakeLog("stressed")] * 3 + [FakeLog("happy")]
    assert _dominant_emotion_label(logs) == "stressed"

# test_behaviors_api.py
def test_create_behavior(client, auth_headers):
    resp = client.post(
        "/api/behaviors/1",
        json={"text": "공부했어", "emotion": "focused", "tag": "Study", "intensity": 7},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["text"] == "공부했어"
```

**실행**

```bash
pytest backend/tests/ -v --cov=backend --cov-report=term-missing
# 목표: 커버리지 80% 이상
```

---

### 2-2. 프론트엔드 단위 테스트 (Vitest + React Testing Library)

**설치**

```bash
npm install -D vitest @vitest/coverage-v8 @testing-library/react \
  @testing-library/user-event @testing-library/jest-dom jsdom
```

**`vite.config.js` 추가**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    coverage: {
      provider: 'v8',
      thresholds: { lines: 70, functions: 70 },
    },
  },
})
```

**`src/test/setup.js`**

```js
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// api 전역 mock — 실제 HTTP 없이 테스트
vi.mock('../api/api', () => ({
  fetchOverview: vi.fn(),
  fetchAnalysisView: vi.fn(),
  createBehavior: vi.fn(),
  askAssistant: vi.fn(),
  getErrorMessage: (e, fb) => fb,
}))
```

**테스트 대상 우선순위**

| 파일 | 테스트 케이스 |
|------|--------------|
| `src/utils/normalize.js` | `normalizeCategory`, `normalizeMood` 각 입력값 |
| `src/pages/LogPage.jsx` | 폼 제출 → `createBehavior` 호출 확인 |
| `src/pages/ChatPage.jsx` | 메시지 전송 → 타이핑 애니메이션 시작 확인 |
| `src/components/Chart.jsx` | 빈 데이터 / 정상 데이터 렌더링 |

**`package.json` 스크립트 추가**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

### 2-3. E2E 테스트 (Playwright)

**설치**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

**`playwright.config.js`**

```js
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
})
```

**핵심 시나리오 (e2e/ 디렉터리)**

```
e2e/
  auth.spec.js       # 회원가입 → 로그인 → 리다이렉트
  log.spec.js        # 행동 기록 → 목록에 나타남 → 삭제
  chat.spec.js       # 메시지 전송 → 타이핑 애니메이션 → 복사 버튼
  dashboard.spec.js  # 로그인 후 대시보드 핵심 카드 렌더링
```

**예시 (`log.spec.js`)**

```js
import { test, expect } from '@playwright/test'

test('행동 기록 생성 후 목록 표시', async ({ page }) => {
  await page.goto('/log')
  await page.fill('#behavior-text', '오늘 두 시간 집중해서 공부했어요')
  await page.click('button[aria-label="집중"]') // 이모지 감정 선택
  await page.click('button:has-text("지금 이 순간 저장")')
  await expect(page.locator('text=오늘 두 시간 집중해서 공부했어요')).toBeVisible()
})
```

---

## 3. CI/CD 파이프라인

### 3-1. 현재 → 목표

```
현재                          목표
─────────────────────         ─────────────────────────────────
push → compile 검사  →        push → lint → unit test → build
push → lint → build   →            → integration test (Docker)
                               PR  → E2E test → preview deploy
                               main→ staging deploy
                               tag → production deploy
```

### 3-2. 강화된 `backend-tests.yml`

```yaml
name: backend-ci

on:
  push:
    paths: ['backend/**', '.github/workflows/backend-tests.yml']
  pull_request:
    paths: ['backend/**']

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3          # uv로 빠른 설치
      - run: uv pip install ruff
      - run: ruff check backend/
      - run: ruff format --check backend/

  test:
    runs-on: ubuntu-latest
    needs: lint
    services:
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    env:
      DATABASE_URL: sqlite:///./test.db
      REDIS_URL: redis://localhost:6379/0
      JWT_SECRET_KEY: test-secret
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: pip
      - run: pip install -r backend/requirements.txt pytest pytest-cov httpx
      - run: pytest backend/tests/ -v --cov=backend --cov-report=xml
      - uses: codecov/codecov-action@v4    # 커버리지 리포트
        with:
          files: coverage.xml
```

### 3-3. 강화된 `frontend-tests.yml`

```yaml
name: frontend-ci

on:
  push:
    paths: ['frontend/**', '.github/workflows/frontend-tests.yml']
  pull_request:
    paths: ['frontend/**']

jobs:
  quality:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run test:coverage
      - run: npm run build

  e2e:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
        working-directory: frontend
      - run: npx playwright install --with-deps chromium
        working-directory: frontend
      - name: Start backend (Docker)
        run: docker compose up -d --wait
      - run: npx playwright test
        working-directory: frontend
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

### 3-4. Dependabot 설정 (`.github/dependabot.yml`)

```yaml
version: 2
updates:
  - package-ecosystem: pip
    directory: /
    schedule:
      interval: weekly
    groups:
      python-deps:
        patterns: ['*']

  - package-ecosystem: npm
    directory: /frontend
    schedule:
      interval: weekly
    groups:
      npm-deps:
        patterns: ['*']

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: monthly
```

---

## 4. 코드 품질 레이어

### 4-1. Python: Ruff (lint + format 통합)

`ruff.toml` (프로젝트 루트):

```toml
target-version = "py311"
line-length = 100

[lint]
select = [
  "E",    # pycodestyle
  "F",    # pyflakes
  "I",    # isort
  "B",    # flake8-bugbear
  "UP",   # pyupgrade
  "S",    # bandit (보안)
  "RUF",  # ruff-specific
]
ignore = [
  "S101",  # assert — pytest에서 허용
  "B008",  # Depends() 함수 호출 — FastAPI 패턴
]

[lint.per-file-ignores]
"backend/tests/**" = ["S", "E501"]

[format]
quote-style = "double"
indent-style = "space"
```

**명령어**

```bash
ruff check backend/          # 린트
ruff format backend/         # 포맷
ruff check --fix backend/    # 자동 수정
```

---

### 4-2. Pre-commit 훅

**설치**

```bash
pip install pre-commit
```

**`.pre-commit-config.yaml`**

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.9.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: check-merge-conflict
      - id: check-json
      - id: check-yaml
      - id: end-of-file-fixer
      - id: trailing-whitespace
      - id: detect-private-key

  - repo: local
    hooks:
      - id: frontend-lint
        name: ESLint
        language: node
        entry: bash -c 'cd frontend && npm run lint'
        pass_filenames: false
        files: \.(jsx?|tsx?)$
```

**활성화**

```bash
pre-commit install
pre-commit run --all-files   # 첫 실행 검증
```

---

### 4-3. Conventional Commits 규칙

커밋 메시지 형식: `<type>(<scope>): <subject>`

| type | 용도 | 예시 |
|------|------|------|
| `feat` | 새 기능 | `feat(chat): add typing animation` |
| `fix` | 버그 수정 | `fix(overview): clear Redis cache on log delete` |
| `perf` | 성능 개선 | `perf(ui): migrate to useQuery for profile page` |
| `refactor` | 리팩터 | `refactor(api): extract withErrorLogging helper` |
| `test` | 테스트 추가 | `test(behaviors): add integration tests` |
| `chore` | 설정/빌드 | `chore(ci): add Dependabot config` |
| `docs` | 문서 | `docs: add harness engineering guide` |

**scope 목록**: `auth`, `behaviors`, `chat`, `ui`, `analysis`, `profile`, `dashboard`, `ci`, `db`

**pre-commit으로 메시지 검증**

```yaml
  - repo: https://github.com/compilerla/conventional-pre-commit
    rev: v3.4.0
    hooks:
      - id: conventional-pre-commit
        stages: [commit-msg]
```

---

## 5. 로컬 개발 환경 (DevEx)

### 5-1. `docker-compose.yml` 강화

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: mindflow_redis
    restart: always
    ports: ["6379:6379"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  mysql:
    image: mysql:8.0
    container_name: mindflow_mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: root123
      MYSQL_DATABASE: pattern_db
      MYSQL_USER: user
      MYSQL_PASSWORD: user123
    ports: ["3307:3306"]
    volumes:
      - mysql_data:/var/lib/mysql
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 10

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
      target: development               # 멀티스테이지 빌드 타겟
    container_name: mindflow_backend
    restart: always
    ports: ["8000:8000"]
    depends_on:
      mysql: { condition: service_healthy }
      redis: { condition: service_healthy }
    env_file: .env
    environment:
      - DATABASE_URL=mysql+pymysql://user:user123@mysql:3306/pattern_db
      - REDIS_URL=redis://redis:6379/0
    volumes:
      - ./backend:/app/backend           # hot reload
    command: uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

volumes:
  mysql_data:
```

**헬스체크 활용**

```bash
docker compose up -d --wait   # 모든 서비스가 healthy 될 때까지 대기
docker compose ps             # 상태 확인
```

### 5-2. 환경변수 템플릿 (`.env.example`)

```bash
# 필수
DATABASE_URL=mysql+pymysql://user:user123@localhost:3307/pattern_db
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=<openssl rand -hex 32로 생성>
GOOGLE_API_KEY=<Google AI Studio에서 발급>

# 선택
SENTRY_DSN=
LOG_LEVEL=INFO
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

**비밀키 생성 스크립트 (`scripts/gen_secrets.sh`)**

```bash
#!/bin/bash
echo "JWT_SECRET_KEY=$(openssl rand -hex 32)"
echo "위 값을 .env에 붙여넣으세요."
```

---

## 6. 관찰성 스택

### 6-1. 구조화 로깅 (structlog)

**설치**

```bash
pip install structlog
```

**`backend/logging_config.py`**

```python
import logging
import structlog

def configure_logging(level: str = "INFO"):
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),   # 프로덕션: JSON
        ],
        logger_factory=structlog.PrintLoggerFactory(),
    )
    logging.basicConfig(level=getattr(logging, level))

logger = structlog.get_logger()
```

**사용 예시**

```python
# 기존:
print(f"[API ERROR] {error}")

# 개선:
logger.error("api_error", endpoint="/overview", user_id=user_id, error=str(error))
```

**출력 형식 (JSON)**

```json
{"event": "api_error", "endpoint": "/overview", "user_id": 42, "level": "error", "timestamp": "2026-05-14T04:00:00Z"}
```

---

### 6-2. 에러 추적 (Sentry)

**설치**

```bash
pip install sentry-sdk[fastapi]
npm install @sentry/react
```

**백엔드 (`backend/main.py`)**

```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN", ""),
    integrations=[FastApiIntegration(), SqlalchemyIntegration()],
    traces_sample_rate=0.1,   # 프로덕션: 10% 샘플링
    environment=os.getenv("APP_ENV", "development"),
)
```

**프론트엔드 (`src/main.jsx`)**

```jsx
import * as Sentry from "@sentry/react"

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  })
}
```

---

### 6-3. API 성능 미들웨어

**`backend/middleware.py`**

```python
import time
import structlog
from fastapi import Request

logger = structlog.get_logger()

async def timing_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 1)

    logger.info(
        "http_request",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        duration_ms=duration_ms,
    )

    # SLO 위반 경고
    if duration_ms > 2000:
        logger.warning("slow_request", path=request.url.path, duration_ms=duration_ms)

    response.headers["X-Response-Time"] = f"{duration_ms}ms"
    return response
```

---

## 7. 성능 기준선 (SLO)

### 7-1. Core Web Vitals 목표

| 지표 | 목표 | 현재 측정 방법 |
|------|------|----------------|
| LCP (Largest Contentful Paint) | < 2.0s | `npm run build && npx lighthouse` |
| CLS (Cumulative Layout Shift) | < 0.05 | 동일 |
| FID / INP | < 100ms | Chrome DevTools |
| 번들 크기 (gzip) | < 200KB | `npx vite-bundle-visualizer` |

**번들 분석**

```bash
cd frontend
npx vite-bundle-visualizer
# 결과: stats.html 생성 — Recharts·lucide-react 크기 확인
```

**무거운 패키지 최적화**

```js
// vite.config.js — 수동 청크 분리
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom', 'react-router-dom'],
        charts: ['recharts'],
        query: ['@tanstack/react-query'],
      },
    },
  },
},
```

---

### 7-2. API 응답 시간 SLO

| 엔드포인트 | P50 목표 | P95 목표 | 캐시 전략 |
|-----------|---------|---------|-----------|
| `GET /overview` | < 300ms | < 800ms | Redis 5분 ✅ |
| `GET /analysis` | < 500ms | < 1500ms | React Query 2분 ✅ |
| `GET /heatmap` | < 200ms | < 500ms | React Query 2분 ✅ |
| `POST /chat` | < 3000ms | < 8000ms | 없음 (AI 스트리밍) |
| `POST /behaviors` | < 200ms | < 500ms | 없음 + 캐시 무효화 ✅ |

**k6 부하 테스트 스크립트 (`scripts/load_test.js`)**

```js
import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE = 'http://localhost:8000/api'
const TOKEN = __ENV.TOKEN

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // 워밍업
    { duration: '60s', target: 50 },   // 목표 부하
    { duration: '30s', target: 0 },    // 쿨다운
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],  // 95번째 퍼센타일 < 800ms
    http_req_failed: ['rate<0.01'],    // 에러율 < 1%
  },
}

export default function () {
  const headers = { Authorization: `Bearer ${TOKEN}` }
  const res = http.get(`${BASE}/ui/1/overview`, { headers })
  check(res, { 'overview 200': (r) => r.status === 200 })
  sleep(1)
}
```

**실행**

```bash
# k6 설치: https://k6.io/docs/get-started/installation/
TOKEN=<your_jwt> k6 run scripts/load_test.js
```

---

### 7-3. Redis 캐시 효율성 측정

```bash
# 캐시 히트율 모니터링
redis-cli monitor | grep "ui:overview"

# 현재 캐시 상태
redis-cli keys "ui:*"
redis-cli ttl "ui:overview:1"
```

**목표 캐시 히트율**: > 70% (일반 사용 패턴 기준)

---

## 8. 보안 하네스

### 8-1. 시크릿 스캔 (`gitleaks`)

```bash
# 설치
brew install gitleaks       # macOS
winget install gitleaks     # Windows

# pre-commit 통합
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
```

**절대 커밋하면 안 되는 패턴**

```
GOOGLE_API_KEY=AI...
JWT_SECRET_KEY=...
MYSQL_PASSWORD=...
SENTRY_DSN=https://...@sentry.io/...
```

---

### 8-2. 의존성 취약점 감사

**Python**

```bash
pip install safety
safety scan -r backend/requirements.txt
```

**Node**

```bash
npm audit --audit-level=moderate
# CI에서 자동 실행: npm audit --audit-level=high --production
```

**GitHub Actions 통합**

```yaml
- name: Python 보안 감사
  run: pip install safety && safety scan -r backend/requirements.txt

- name: npm 보안 감사
  run: npm audit --audit-level=high --production
  working-directory: frontend
```

---

### 8-3. OWASP Top 10 체크리스트

| 항목 | 현재 상태 | 조치 |
|------|-----------|------|
| A01 접근 제어 | `require_same_user` Depends 적용 ✅ | 모든 엔드포인트 확인 |
| A02 암호화 실패 | bcrypt 해싱 ✅ | HTTPS 강제 (프로덕션) |
| A03 인젝션 | SQLAlchemy ORM ✅ | Raw SQL 사용 금지 |
| A05 보안 설정 오류 | CORS 설정 확인 필요 ⚠️ | 허용 오리진 명시 |
| A07 인증 실패 | JWT 12h + 리프레시 7d ✅ | Refresh 토큰 로테이션 |
| A09 보안 로깅 실패 | 구조화 로깅 도입 중 🔄 | PII 필드 마스킹 추가 |

**CORS 강화 (`backend/main.py`)**

```python
from fastapi.middleware.cors import CORSMiddleware

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

---

## 9. 데이터베이스 마이그레이션

### 현재 문제

스키마 변경이 필요할 때마다 수동 DDL을 실행해야 한다.  
팀원 간 스키마 불일치 발생 가능성이 높다.

### Alembic 도입

**설치**

```bash
pip install alembic
alembic init backend/migrations
```

**`alembic.ini` 핵심 설정**

```ini
[alembic]
script_location = backend/migrations
sqlalchemy.url = %(DATABASE_URL)s
```

**`backend/migrations/env.py`**

```python
from backend.models.behavior import Base
target_metadata = Base.metadata
```

**마이그레이션 워크플로**

```bash
# 새 마이그레이션 생성 (모델 변경 후)
alembic revision --autogenerate -m "add_refresh_token_table"

# 적용
alembic upgrade head

# 롤백
alembic downgrade -1

# 현재 상태 확인
alembic current
alembic history --verbose
```

**CI에서 마이그레이션 검증**

```yaml
- name: DB 마이그레이션 검증
  run: |
    alembic upgrade head
    alembic check           # 미적용 마이그레이션 존재 시 실패
```

**기존 DB 규칙 (CLAUDE.md에서 이어짐)**

```sql
-- DB 초기화 시
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE behavior_logs;
SET FOREIGN_KEY_CHECKS = 1;
-- DELETE 단독 사용 금지, Alembic 마이그레이션 외 DDL 직접 실행 금지
```

---

## 10. AI 개발 하네스

### 10-1. Claude Code 통합 규칙

**`CLAUDE.md`와의 관계**  
이 문서는 `CLAUDE.md`의 기술 레이어를 확장한다.  
충돌 시 `CLAUDE.md`가 우선한다.

**Claude Code 작업 트리거 조건**

| 작업 | 명령 |
|------|------|
| 코드 리뷰 | `/ultrareview` |
| 기능 구현 | `/plan` → 승인 → 구현 |
| 테스트 작성 | 파일 경로 지정 후 요청 |
| 마이그레이션 생성 | 모델 변경 후 Alembic 명령 안내 |

**AI가 절대 하면 안 되는 것**

```
❌ gemini-1.5-flash 외 다른 모델 사용
❌ .env 파일에 있는 시크릿 하드코딩
❌ ensureSeedLogs 함수에서 return false 제거
❌ DELETE 단독으로 DB 데이터 삭제
❌ git push --force
❌ npm audit fix --force (breaking change 가능)
```

---

### 10-2. AI 피드백 서비스 하네스

**Gemini API 안전망**

```python
# backend/services/ai_feedback_service.py 에 추가할 보호 레이어

import functools
import time

def _retry_gemini(func, max_retries=2, backoff=1.0):
    """Gemini 일시적 오류에 대한 재시도 래퍼."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        for attempt in range(max_retries + 1):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                if attempt == max_retries:
                    raise
                time.sleep(backoff * (2 ** attempt))
    return wrapper
```

**모의 응답 (테스트용 환경변수)**

```bash
# .env.test
GOOGLE_API_KEY=        # 빈값 → AIFeedbackService가 fallback 텍스트 반환
```

---

### 10-3. 프롬프트 버전 관리

AI 프롬프트는 코드처럼 버전을 관리한다.

**`backend/prompts/` 디렉터리 구조**

```
backend/prompts/
  weekly_report_v1.txt    # 현재 프로덕션 프롬프트
  chat_system_v1.txt
  insight_v1.txt
```

**변경 규칙**

- 프롬프트 변경 시 `v1` → `v2` 로 새 파일 생성
- 기존 버전은 보존 (롤백 가능성)
- 커밋 메시지: `feat(prompts): upgrade weekly_report to v2`

---

## 11. 핵심 지표 대시보드

### 11-1. 개발 품질 지표

| 지표 | 현재 | 목표 | 측정 주기 |
|------|------|------|-----------|
| 백엔드 테스트 커버리지 | ~0% | 80% | PR마다 |
| 프론트 테스트 커버리지 | 0% | 70% | PR마다 |
| ESLint 에러 | 0 ✅ | 0 | commit마다 |
| Ruff 위반 | 측정 안 됨 | 0 | commit마다 |
| 의존성 취약점 (high) | 미확인 | 0 | 주 1회 |
| 오래된 의존성 | 미확인 | < 3개월 | 월 1회 |

### 11-2. 런타임 지표

| 지표 | 목표 | 알림 임계치 |
|------|------|------------|
| API 에러율 | < 0.5% | > 2% |
| 느린 API 응답 (>2s) | < 1% | > 5% |
| Redis 캐시 히트율 | > 70% | < 50% |
| Gemini API 오류 | < 2% | > 10% |
| JWT 만료 에러 | < 1% | > 5% |

### 11-3. 빠른 헬스체크 스크립트 (`scripts/health_check.sh`)

```bash
#!/bin/bash
set -e

echo "=== Mindflow 헬스체크 ==="

echo -n "Backend:  "
curl -sf http://localhost:8000/health | python -c "import sys,json; d=json.load(sys.stdin); print('✅' if d.get('status')=='ok' else '❌')"

echo -n "Redis:    "
redis-cli ping | grep -q PONG && echo "✅" || echo "❌"

echo -n "MySQL:    "
mysqladmin ping -h 127.0.0.1 -P 3307 -u user -puser123 2>/dev/null | grep -q alive && echo "✅" || echo "❌"

echo -n "Frontend: "
curl -sf http://localhost:5173 -o /dev/null && echo "✅" || echo "❌"

echo ""
echo "=== Redis 캐시 현황 ==="
redis-cli keys "ui:*" | head -10

echo ""
echo "=== 백엔드 최근 에러 ==="
docker logs mindflow_backend --tail 20 2>&1 | grep -i error | tail -5 || echo "에러 없음"
```

---

## 부록: 실행 우선순위 로드맵

```
Week 1  ── pre-commit 훅 설치 (30분)
        ── ruff.toml 추가 + 기존 코드 자동 포맷 (1시간)
        ── pytest conftest.py + 핵심 헬퍼 단위 테스트 5개 (2시간)

Week 2  ── Vitest 설정 + normalize.js 단위 테스트 (1시간)
        ── Alembic 초기화 + 기존 스키마 기준선 마이그레이션 (2시간)
        ── GitHub Actions 강화 (pytest + 커버리지) (1시간)

Week 3  ── Playwright 설치 + auth·log E2E 시나리오 (3시간)
        ── structlog 도입 + timing_middleware (2시간)
        ── Dependabot 설정 (15분)

Week 4  ── Sentry 연동 (1시간)
        ── k6 부하 테스트 스크립트 + 기준선 측정 (2시간)
        ── Docker Compose 헬스체크 강화 (30분)
```

---

*이 문서는 스프린트마다 업데이트한다. 새 엔드포인트·기능 추가 시 해당 섹션의 테스트 케이스와 SLO 항목을 함께 추가할 것.*
