# Mindflow — CLAUDE.md
> 하네스 엔지니어링 기준 프로젝트 가이드
> 마지막 분석: 2026-05-14 | 브랜치: feat/chat-5-1 머지 완료

---

## 1. 프로젝트 현황

**Mindflow** — 행동 패턴 분석 + AI 코칭 챗봇 (MVP 완성 → 하네스 확장 단계)

| 영역 | 스택 |
|---|---|
| Backend | FastAPI · SQLAlchemy · SQLite(dev) · Redis · Gemini 1.5 Flash |
| Frontend | React 19 · Vite 8 · Tailwind CSS 4 · Recharts · react-markdown |
| Auth | JWT (Access 12h / Refresh 7d) · bcrypt |
| 배포 | Docker (backend) · Vite dev server (frontend) |

### 기능 완성도
| 기능 | 상태 | 비고 |
|---|---|---|
| 행동 로그 CRUD | ✅ 완성 | |
| 패턴 분석 (AI) | ✅ 완성 | |
| 대시보드 시각화 | ⚠️ 부분 | 주간뷰 미동작, 데이터 3일치만 표시 |
| 프로필 / 업적 | ⚠️ 부분 | 편집 불가, 30일 히트맵만 |
| 채팅 멀티 세션 | ✅ 완성 | feat/chat-5-1 |
| 채팅 스트리밍 | ✅ 완성 (B방식) | 프론트 시뮬레이션 12ms |
| 마크다운 렌더링 | ✅ 완성 | react-markdown + remark-gfm |
| i18n | ⚠️ 부분 | messages.js 있으나 미적용 컴포넌트 多 |
| 서비스 레이어 | ❌ 미완 | 라우터에 비즈니스 로직 직접 작성 |
| 마이그레이션 | ❌ 미완 | 런타임 ALTER TABLE (취약) |
| 토스트/알림 | ❌ 미구현 | |
| 스켈레톤 로더 | ❌ 미구현 | |
| 에러 바운더리 | ❌ 미구현 | |
| 강도(intensity) 입력 | ❌ 미구현 | 하드코딩 6 |

---

## 2. 아키텍처 개요

```
[React SPA]
  ├─ pages/ (Dashboard, Log, Analysis, Chat, Profile)
  ├─ components/chat/ (Sidebar, AiMessage, UserMessage, ChatInput)
  ├─ hooks/useAppData.js  ← 전역 초기화
  ├─ api/api.js           ← Axios 인터셉터 + 모든 API 함수
  └─ context/ (AppSettingsContext, messages.js)

[FastAPI]
  ├─ routers/ (auth, users, behaviors, analysis, ui)
  ├─ services/ (AIFeedbackService, PatternAnalysisService)  ← 현재 2개뿐
  ├─ models/ (User, BehaviorLog, ChatSession, ChatHistory)
  ├─ schemas/ (behavior.py, ui.py)
  └─ redis_client.py (캐시 + 레이트 리밋)

[SQLite → PostgreSQL 예정]
  ├─ users / behavior_logs / chat_sessions / chat_history
  └─ [추가 예정] user_preferences / behavior_tags / audit_logs
```

---

## 3. 현재 문제점

### 3-1. 백엔드

**보안 (Critical)**
- `JWT_SECRET_KEY` 기본값 `"change-this-in-production"` (`config.py`)
- Refresh Token 무효화 불가 (블랙리스트 없음)
- Auth 엔드포인트 레이트 리밋 없음 (채팅만 적용)
- Gemini 프롬프트에 사용자 입력 직접 삽입 → 프롬프트 인젝션 취약

**아키텍처 (High)**
- 비즈니스 로직이 `routers/ui.py` 한 파일에 856줄 집중
- Service 클래스 2개뿐 (`AIFeedbackService`, `PatternAnalysisService`)
- `ai_service = AIFeedbackService()` 전역 싱글턴 하드코딩 (DI 없음)
- 채팅 세션 생성 + 첫 메시지 저장이 atomic하지 않음 (race condition)
- `analysis.py` 라우터가 POST로 멱등 읽기 연산 수행 (REST 위반)

**성능 (High)**
- `user_id + created_at` 복합 인덱스 없음 → 대용량 풀스캔
- Redis 인메모리 폴백이 재시작 시 초기화 (비영속)
- Gemini 호출에 재시도/지수 백오프 없음

**검증 (Medium)**
- `emotion` 필드가 문자열 자유입력 (Enum 제약 없음)
- `tag` 필드 정규화가 프론트에서만 수행
- 세션 제목 변경 API 없음

### 3-2. 데이터베이스

- 마이그레이션 시스템 없음 — 런타임 `ALTER TABLE` (취약, 추적 불가)
- SQLite 동시 쓰기 잠금 (다중 워커 불가)
- 소프트 삭제 없음 — 사용자 삭제 시 전체 데이터 영구 소멸
- `chat_history` 세션별 메시지 수 제한 없음
- `user_preferences` 테이블 없음 (언어, 알림, 테마 미저장)
- `audit_logs` 테이블 없음 (변경 이력 추적 불가)

### 3-3. AI / Gemini

- 모델 `gemini-1.5-flash` → 2.0/2.5 업그레이드 필요
- `google-generativeai` SDK 설치돼 있지만 `requests`로 직접 호출
- 시스템 프롬프트 정적 — 사용자 패턴 미반영
- 응답 언어 보장 없음 (한국어 강제 → 간혹 영어 응답)
- `max_output_tokens` 미설정

### 3-4. 프론트엔드 (UI/UX)

- **DashboardPage**: 주간 뷰 미동작, 최근 활동 3일치만 표시
- **LogPage**: 강도(intensity) 슬라이더 없음 (하드코딩 6), 제출 후 성공 피드백 없음
- **AnalysisPage**: 시간 범위 선택 없음, 차트 드릴다운 없음
- **ProfilePage**: 프로필 편집 불가, 히트맵 30일 고정
- **공통**: 스켈레톤 로더 없음, 에러 바운더리 없음, 토스트 알림 없음
- **접근성**: ARIA 레이블 전무, 키보드 네비게이션 미지원
- **모바일**: Chat 사이드바 모바일 미지원, 터치 타겟 크기 미확인

---

## 4. 하네스 엔지니어링 로드맵

### Phase A — 서비스 레이어 분리 (백엔드 구조화)

현재 `routers/ui.py` 856줄을 서비스 클래스로 분리한다.

```
backend/services/
├─ ai_feedback_service.py      (기존 — Gemini 호출)
├─ pattern_analysis_service.py  (기존 — 패턴 분석)
├─ chat_service.py             ← 신규: 세션/메시지 CRUD 로직
├─ user_service.py             ← 신규: 사용자 등록/온보딩/삭제
├─ dashboard_service.py        ← 신규: overview/heatmap/timeline 계산
├─ export_service.py           ← 신규: CSV/JSON 내보내기
└─ notification_service.py     ← 신규: 인앱 알림, 스트릭 경고
```

**추가 엔드포인트**
```
PATCH /api/ui/{user_id}/chat/sessions/{session_id}   # 세션 제목 변경
GET   /api/ui/{user_id}/export                       # 데이터 내보내기
GET   /api/ui/{user_id}/preferences                  # 사용자 설정 조회
PATCH /api/ui/{user_id}/preferences                  # 사용자 설정 변경
GET   /api/auth/rate-limit-status                    # 레이트 리밋 상태
POST  /api/auth/logout                               # 토큰 무효화
```

### Phase B — 데이터베이스 확장

**신규 테이블**
```sql
-- 사용자 설정
CREATE TABLE user_preferences (
  id INTEGER PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language VARCHAR(5) DEFAULT 'ko',
  theme VARCHAR(10) DEFAULT 'light',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 행동 태그 정규화
CREATE TABLE behavior_tags (
  id INTEGER PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  category VARCHAR(30),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 변경 감사 로그
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id INTEGER,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- chat_sessions 확장
ALTER TABLE chat_sessions ADD COLUMN message_count INTEGER DEFAULT 0;
ALTER TABLE chat_sessions ADD COLUMN archived BOOLEAN DEFAULT FALSE;
```

**마이그레이션 도구** — Alembic 도입
```
backend/
├─ alembic.ini
└─ alembic/versions/
   ├─ 001_initial.py
   ├─ 002_chat_sessions.py
   └─ 003_user_preferences.py
```

**인덱스 추가**
```sql
CREATE INDEX idx_behavior_logs_user_created ON behavior_logs(user_id, created_at);
CREATE INDEX idx_chat_history_session ON chat_history(session_id, created_at);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at);
```

### Phase C — 프론트엔드 UI 추가

**컴포넌트 신규 생성**
```
frontend/src/components/
├─ ui/
│  ├─ Toast.jsx             ← 신규: 성공/오류/정보 토스트
│  ├─ Skeleton.jsx          ← 신규: 카드형 스켈레톤 로더
│  ├─ ErrorBoundary.jsx     ← 신규: 페이지별 에러 바운더리
│  ├─ Modal.jsx             ← 신규: 범용 모달 (확인/삭제)
│  └─ RangeSlider.jsx       ← 신규: 강도 슬라이더 (1-10)
└─ chat/
   └─ ChatSidebarMobile.jsx ← 신규: 모바일 하단 드로어
```

**페이지별 개선**
| 페이지 | 개선 내용 |
|---|---|
| LogPage | 강도 슬라이더(1-10), 제출 후 토스트, 캐릭터 카운트 |
| DashboardPage | 주간 뷰 버그 수정, 최근 활동 페이지네이션, 스켈레톤 |
| AnalysisPage | 시간 범위 선택기(7/14/30일), 인사이트 CTA 링크 |
| ProfilePage | 편집 모달, 히트맵 90일 확장, 업적 상세 모달 |
| ChatPage | 모바일 사이드바 드로어, 세션 제목 인라인 편집 |
| 공통 | ErrorBoundary 래핑, ARIA 레이블, 키보드 네비 |

**useAppData.js 개선**
- 5분 stale-time 메모리 캐싱
- 자동 재시도 3회 (지수 백오프)
- 오프라인 감지 + 재연결 시 자동 갱신

### Phase D — AI 고도화

- Gemini 2.0 Flash 모델 업그레이드 (`gemini-2.0-flash`)
- `google-generativeai` SDK로 전환 (`requests` 직접 호출 제거)
- 시스템 프롬프트에 사용자 최근 7일 패턴 동적 주입
- 응답 토큰 카운팅 기반 컨텍스트 자름 (8메시지 고정 → 동적)
- `max_output_tokens=800` 명시 설정
- Gemini 호출 재시도 (3회, 1s/2s/4s 백오프)

### Phase E — 인프라 / 하네스

- **Alembic** 마이그레이션 도입 (Phase B 완료 후)
- **PostgreSQL** 전환 가이드 (`SQLite → PG`)
- **Structured Logging**: 요청/응답 JSON 로그 미들웨어
- **Global Exception Handler**: `@app.exception_handler(Exception)`
- **Health Check 강화**: DB ping, Redis ping, Gemini ping 포함
- **CI 기초**: pytest 단위 테스트 ≥ 3 (서비스 레이어 대상)

---

## 5. 실행 우선순위

### 즉시 (다음 PR)
1. `LogPage` 강도 슬라이더 + 제출 토스트 알림
2. `Skeleton.jsx` + `ErrorBoundary.jsx` 공통 컴포넌트
3. `DashboardPage` 주간 뷰 버그 수정
4. `chat_service.py` 분리 — `routers/ui.py` 세션/채팅 로직 이동

### 단기 (1-2 PR)
5. `user_preferences` 테이블 + API + 프로필 편집 UI
6. `behavior_tags` 정규화 + LogPage 카테고리 드롭다운
7. Alembic 마이그레이션 도입
8. `audit_logs` 테이블 + 로그인/주요 액션 기록

### 중기 (3-5 PR)
9. Gemini SDK 전환 + 모델 업그레이드
10. AnalysisPage 시간 범위 선택기
11. ProfilePage 편집 모달
12. ChatPage 모바일 드로어
13. Global Exception Handler + Structured Logging

### 장기
14. PostgreSQL 전환
15. ExportService (CSV/JSON 내보내기)
16. 접근성 전면 개선 (ARIA, 키보드)
17. Refresh Token 블랙리스트 (Redis)

---

## 6. 코드 규칙 (Claude Code 작업 시 준수)

### 백엔드
- 새 엔드포인트는 반드시 `require_same_user` Depends 추가
- 비즈니스 로직은 `services/` 에 클래스로 분리 (라우터에 직접 작성 금지)
- AI 서비스 호출은 항상 try/except + fallback 처리
- Pydantic 스키마를 먼저 정의한 뒤 라우터 구현
- 캐시 키 패턴: `f"user:{user_id}:feature:params"`
- DB 변경 시 Alembic 마이그레이션 파일 함께 생성 (Phase B 이후)

### 프론트엔드
- 새 UI 텍스트는 반드시 `frontend/src/context/messages.js`에 번역 키 추가
- API 호출은 `frontend/src/api/api.js`에 함수로 추가
- 컴포넌트 파일은 `PascalCase.jsx`
- Tailwind 클래스는 기존 `app-*` 커스텀 클래스 우선 (`frontend/src/index.css` 참고)
- 새 채팅 컴포넌트 → `frontend/src/components/chat/`
- 공통 UI 컴포넌트 → `frontend/src/components/ui/`
- 각 페이지는 `ErrorBoundary`로 래핑 (Phase C 완료 후)

### 파일 위치 빠른 참조
| 역할 | 경로 |
|---|---|
| 전체 API 함수 | `frontend/src/api/api.js` |
| 번역 키 | `frontend/src/context/messages.js` |
| 글로벌 CSS 변수 | `frontend/src/index.css` |
| 백엔드 라우터 | `backend/routers/ui.py` |
| AI 서비스 | `backend/services/ai_feedback_service.py` |
| DB 모델 | `backend/models/` |
| Pydantic 스키마 | `backend/schemas/ui.py` |

### Git
- 기능 브랜치: `feat/<기능명>` · 버그픽스: `fix/<설명>`
- main 브랜치 직접 push 금지
- 완료 브랜치: `feat/chat-5-1` (Chat UI 전면 재설계)









































































































































































































































































































































































































































































































































































































