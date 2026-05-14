# 프런트엔드·백엔드 심층 코드 분석 및 하네스 엔지니어링 실행 가이드

> 기준 저장소: `Mini_ChatBot`  
> 작성일: 2026-05-14  
> 목적: 현재 코드베이스를 **실행 가능한 관점**에서 진단하고, 품질/속도/안전성을 동시에 높이는 **하네스 엔지니어링(테스트·검증 자동화 체계)** 적용안을 제시한다.

---

## 1) 현재 코드 구조 심층 진단

### 1-1. 백엔드(FastAPI) 구조 강점

- `main.py`에서 `lifespan` 기반 초기화(`create_tables`)와 라우터 등록이 분리되어 앱 부트스트랩 흐름이 명확함.
- `database.py`가 1차 DB 접속 실패 시 SQLite fallback을 수행해 로컬/데모 환경 내구성이 좋음.
- 분석 도메인이 `services/pattern_analysis_service.py`로 분리되어 라우터의 비즈니스 오염이 낮음.
- API 라우팅이 `auth`, `behaviors`, `analysis`, `ui`로 경계가 분명해 추후 BFF(Backend For Frontend) 고도화에 유리함.

### 1-2. 백엔드 리스크/기술부채

1. **런타임 마이그레이션 의존**
   - `run_schema_migrations()`에서 `ALTER TABLE`/`CREATE INDEX`를 앱 시작 시 수행.
   - 운영 환경에서 동시 기동·권한·롤백 관리가 어려움.

2. **시간 처리 일관성 리스크**
   - 분석 서비스에서 `datetime.now(timezone.utc).replace(tzinfo=None)` 사용.
   - tz-aware/naive 혼용 가능성이 있어 장기적으로 분석 정확도와 이식성 이슈 발생 가능.

3. **서비스 품질 기준(SLO) 부재**
   - `/health`는 단순 상태 반환이며 DB/Redis 의존성 확인이 없음.
   - API 지연·오류율 예산(error budget) 관리가 불가.

4. **분석 규칙 하드코딩**
   - 위험 감정 비율(40%), 강도(6), 급변 임계치(5)가 코드 고정.
   - 운영 데이터 기반 튜닝이 어려움.

### 1-3. 프론트엔드(React/Vite) 구조 강점

- `src/api/api.js`가 Axios 인스턴스·인터셉터·에러 정규화를 포함해 통신 계층을 중앙화.
- 인증 토큰 주입/에러 로깅/사용자 메시지 변환이 일관적이며 디버깅 친화적.
- `pages`, `components`, `hooks`, `context` 분리로 UI 계층 책임이 비교적 선명함.

### 1-4. 프론트엔드 리스크/기술부채

1. **계약(Contract) 테스트 부재**
   - 프론트가 기대하는 스키마와 백엔드 응답 간 회귀를 사전에 잡기 어려움.

2. **전역 로깅 과다 가능성**
   - request/response debug 로그가 프로덕션에서 과다 출력될 수 있음.

3. **하드 실패 시 UX 대응 표준화 부족**
   - 네트워크 실패 메시지는 잘 처리하지만 화면별 fallback 패턴이 통일되어 있지 않을 가능성.

---

## 2) 하네스 엔지니어링 목표 정의

하네스 엔지니어링을 "테스트 도구 추가"가 아니라 **개발 가드레일 시스템 구축**으로 정의한다.

- **코드 가드레일**: lint/format/type/test 실패 시 병합 차단
- **계약 가드레일**: 프론트-백엔드 API 스키마 일치 자동 검증
- **운영 가드레일**: SLO 기반 건강 상태/에러율/지연 추적
- **릴리즈 가드레일**: 스테이징 smoke test 통과 후 배포

---

## 3) 권장 하네스 아키텍처 (현 코드 기준 최적화)

## 3-1. 로컬 하네스 (개발자 머신)

- pre-commit 훅
  - Python: `ruff check`, `ruff format --check`, `pytest -q`
  - Frontend: `npm run lint`, `npm run test -- --run`
- `make check` 단일 진입점 제공
- 빠른 피드백(3~5분 내) 목표

## 3-2. PR 하네스 (CI)

- Job A (Backend):
  - Python 버전 매트릭스(최소 3.11, 3.12)
  - pytest + coverage threshold
- Job B (Frontend):
  - npm ci
  - lint + unit test + build
- Job C (Contract):
  - OpenAPI 스냅샷 diff
  - critical endpoint schema 검증
- Job D (Security):
  - `pip-audit`, `npm audit --production` (허용 정책 기반)

## 3-3. Release 하네스 (CD 직전)

- 컨테이너 기동 후 `smoke` 시나리오 실행:
  - `/health`
  - 로그인 → `/ui/{user_id}/overview` 조회
  - 기록 생성 → 분석 API 호출
- 실패 시 자동 롤백 or 배포 중단

---

## 4) 백엔드 하네스 구체 실행안

### 4-1. 테스트 계층

1. **Unit**: `PatternAnalysisService`의 `_extract_*` 함수 경계값 테스트
2. **Integration**: FastAPI TestClient + 임시 SQLite + Redis mock
3. **Contract**: 응답 Pydantic schema 필수 필드 검증
4. **Regression**: 과거 버그 재현 케이스 고정

### 4-2. 품질 기준

- 전체 커버리지 80% 목표(초기 65%에서 단계적 상향)
- 핵심 도메인(`analysis`, `ui`)은 라인 커버리지 90% 우선

### 4-3. 우선 리팩터 포인트

- `run_schema_migrations()`를 Alembic migration으로 이전
- datetime 정책 통일(UTC aware 권장)
- 분석 임계치 설정값을 `config.py`/env로 외부화

---

## 5) 프론트엔드 하네스 구체 실행안

### 5-1. 단위 테스트 우선순위

1. `utils/normalize.js` (순수 함수)
2. `api/api.js` (`getErrorMessage`, interceptor side-effect)
3. `pages/ChatPage.jsx` (송신→응답 rendering)
4. `pages/AnalysisPage.jsx` (빈 데이터/에러 fallback)

### 5-2. 컴포넌트 테스트 포인트

- 스켈레톤 노출 조건
- API 실패 시 사용자 메시지
- 폼 submit validation
- 재시도 버튼 동작

### 5-3. E2E 핵심 시나리오 (최소 3개)

- 인증 플로우(로그인/세션 유지)
- 행동 기록 CRUD 플로우
- 분석/채팅 화면 렌더링 플로우

---

## 6) 프론트-백엔드 계약 하네스 (강력 권장)

현재 구조는 `/api/ui/{user_id}/...` BFF 성격이 강하므로 계약 테스트가 매우 중요하다.

- 백엔드에서 OpenAPI JSON 추출
- 프론트에서 기대 스키마(예: zod)와 정합성 검증
- PR 단계에서 breaking change 자동 차단

**효과**: "백엔드는 성공인데 프론트는 깨짐" 유형을 병합 전에 차단 가능.

---

## 7) 관찰성(Observability) 하네스

### 7-1. 로깅

- 백엔드: JSON 구조 로그 (request_id, user_id, route, latency_ms)
- 프론트: 개발 모드만 상세 debug, 운영은 warn/error 중심

### 7-2. 메트릭

- API p50/p95 latency
- endpoint별 4xx/5xx 비율
- 분석 API 처리시간
- Redis hit ratio

### 7-3. 알림

- 5xx 급증
- `/analysis` p95 임계치 초과
- 로그인 실패율 급등

---

## 8) 4주 실행 로드맵 (현실적 단계)

### Week 1
- pre-commit + backend pytest 기반 구축
- frontend vitest 설정
- CI에 lint/test/build 연결

### Week 2
- 핵심 API integration test 작성
- 프론트 주요 페이지 컴포넌트 테스트 작성
- coverage 리포트 도입

### Week 3
- OpenAPI contract test 추가
- Playwright E2E 3개 시나리오 추가
- smoke test 스크립트 작성

### Week 4
- Alembic 마이그레이션 전환
- 구조화 로깅 + 기본 메트릭 수집
- SLO 대시보드 초안 구축

---

## 9) 바로 적용 가능한 실행 체크리스트

- [ ] `backend/tests`를 unit/integration로 재구성
- [ ] `frontend`에 vitest + RTL 도입
- [ ] root에 `Makefile` `check` 타깃 추가
- [ ] GitHub Actions: backend/frontend/contract 분리
- [ ] OpenAPI 스냅샷 파일 버전관리
- [ ] Alembic 초기 리비전 생성
- [ ] `/health` 확장(DB/Redis dependency check)
- [ ] 로그 레벨/출력 정책 환경별 분리

---

## 10) 결론

현재 코드는 **서비스 지향적 구조(라우터/서비스/BFF 분리)**가 이미 형성되어 있어 하네스 엔지니어링 도입 효율이 높은 상태다.  
핵심은 새 기능 추가보다 먼저, **테스트·계약·관찰성 가드레일을 PR 단계에 강제**하는 것이다.  
이 순서로 진행하면 개발 속도를 유지하면서도 장애/회귀 비용을 크게 줄일 수 있다.
