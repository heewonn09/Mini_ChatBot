# Mindflow (Mini_ChatBot)

> **행동설계학 기반 습관/감정 코칭 플랫폼**
> BJ 포그(BJ Fogg)의 행동 모델(B = MAP)을 실제 서비스 구조에 이식해, 기록-분석-AI 코칭-커뮤니티 루프를 설계한 풀스택 프로젝트

[![Live Demo](https://img.shields.io/badge/Live_Demo-mini--chatbot--1--4247.onrender.com-black?style=flat-square)](https://mini-chatbot-1-4247.onrender.com)
![React](https://img.shields.io/badge/React-Vite-61DAFB?style=flat-square&logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-0A9?style=flat-square&logo=fastapi&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.x-D71F00?style=flat-square&logo=sqlalchemy&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)

- **라이브 데모**: [https://mini-chatbot-1-4247.onrender.com](https://mini-chatbot-1-4247.onrender.com)
- **백엔드 엔트리포인트**: `backend/main.py`
- **프론트엔드 엔트리포인트**: `frontend/src/main.jsx`
- **모바일(Expo) 엔트리포인트**: `mobile/App.js`

---

## 빠른 검토 가이드

처음 저장소를 열어보는 사람이 짧은 시간 안에 확인할 수 있도록, 핵심 지점을 먼저 정리했습니다.

| 보고 싶은 것 | 빠른 확인 위치 |
| --- | --- |
| 행동설계학(B = MAP) 기반 서비스 설계 | [1. Behavioral Design 심층 분석](#1-behavioral-design-심층-분석) |
| 프론트/백엔드 상호작용 구조 | [2. 테크니컬 아키텍처 추론 분석](#2-테크니컬-아키텍처-추론-분석) |
| UX/UI 개선 방향 | [3. 서비스 기획자 시점 비즈니스 제언](#3-서비스-기획자-시점-비즈니스-제언uxui-critique) |
| 실행 방법과 환경 변수 | [5. 로컬 실행](#5-로컬-실행), [6. 환경 변수](#6-환경-변수) |

---

## 한눈에 보기

| 항목 | 내용 |
| --- | --- |
| **프로젝트 성격** | 행동 기록 + 감정 분석 + AI 코칭 + 커뮤니티를 연결한 습관 개선 플랫폼 |
| **핵심 모델** | BJ Fogg 행동 모델(B = Motivation + Ability + Prompt) |
| **핵심 기술** | React(Vite), FastAPI, SQLAlchemy, JWT, Redis, Gemini(Optional) |
| **중점 구현** | 패턴 분석 엔진, UI ViewModel API, 컨텍스트 기반 코칭 응답 |
| **배포** | Render 도메인 운영 (`mini-chatbot-1-4247.onrender.com`) |

---

## 1. Behavioral Design 심층 분석

마인드플로우는 BJ 포그(BJ Fogg)의 행동 모델 공식인 **B = MAP**을 서비스 구조에 맞게 다음과 같이 해석했습니다.

```text
[ Motivation (동기) ]  -> 커뮤니티 달성 인증, 챌린지 시스템
          +
B =       [ Ability (능력) ] -> 간편한 기록 UI로 진입 장벽 최소화
          +
[ Prompt (자극) ]      -> AI 채팅 실시간 피드백/알림
```

### 동기(Motivation) 극대화 — 커뮤니티, 챌린지

인간은 사회적 동물입니다. 커뮤니티가 활성화되면 다음 심리가 자연스럽게 작동합니다.

- 타인의 성공 사례를 보며 얻는 **자기효능감(Self-Efficacy)**
- "나만 뒤처질 수 없다"는 **손실 회피(Loss Aversion)**

즉, 커뮤니티는 단순 게시판이 아니라 행동 지속률을 끌어올리는 동기 설계 장치로 작동합니다.

### 능력(Ability) 최적화 — 대시보드, 기록

좋은 앱도 기록이 복잡하면 이탈합니다. 이 프로젝트의 기록 흐름은 장문 작성 강요보다,

- 정량 점수
- 체크박스
- 빠른 선택형 입력

중심으로 설계해 사용자의 행동 난이도를 낮추는 **Simplicity 전략**을 지향합니다.

### 자극(Prompt) 정교화 — AI 채팅

고정 시간 푸시 알림보다 중요한 것은 **맥락(Context)** 입니다.

- 누적 데이터 기반 취약 시간대 분석
- 특정 요일/시간에 맞춘 조언
- 현재 상태를 반영한 대화형 트리거

이렇게 AI 채팅은 "아무 때나 오는 알림"이 아니라, 행동 가능성이 높은 순간에 작동하는 Prompt 레이어를 담당합니다.

---

## 2. 테크니컬 아키텍처 추론 분석

현재 배포 도메인 및 UI 흐름을 기준으로, 프론트엔드/백엔드는 아래와 같이 상호작용하도록 설계되었습니다.

### 2-1. 상태 관리와 화면 전환 (Frontend)

상단 네비게이션(대시보드 -> 기록 -> 분석 -> 채팅 -> 커뮤니티) 이동 시 전체 새로고침보다 컴포넌트 단위 전환을 지향하는 SPA 패턴으로 구성되어 있습니다.

- 라우팅 기반 화면 전환
- 다크/라이트 모드 토글
- 알림/배지 등 로컬 상태 반영

### 2-2. AI 및 데이터 파이프라인 (Backend + DB)

#### 기록 데이터
사용자의 기록 입력은 타임스탬프와 함께 DB에 저장되고, 분석의 원본 데이터가 됩니다.

#### 분석 엔진
분석 요청 시 누적 데이터를 그룹화/요약해 차트/카드 UI에 바로 붙일 수 있는 JSON 형태로 반환합니다.

#### AI 프롬프트 엔지니어링
채팅은 단순 자유대화가 아니라, 사용자 상태를 주입한 컨텍스트 기반 코칭 흐름입니다.

예시:

```text
너는 이 유저의 행동 코치야.
지난주 루틴 달성률은 45%고, 특히 수요일 성공률이 낮아.
이 데이터를 바탕으로 다정한 말투로 3줄 피드백을 제공해.
```

실서비스에서는 이와 같은 구조의 입력 컨텍스트가 LLM 호출 전에 조합되도록 설계됩니다.

---

## 3. 서비스 기획자 시점 비즈니스 제언(UX/UI Critique)

현재 구조는 제품 뼈대가 완성된 상태이며, 특히 초기 활성화(Cold Start) 구간을 강화하면 성장 탄력이 커집니다.

### 3-1. 커뮤니티 넛지 강화

게시글이 비어 있을 때 `+ 글쓰기`만 노출되면 사용자 입장에서 시작이 어렵습니다.

- "오늘 아침 루틴 성공하셨나요?" 같은 **가이드 질문 카드**
- "감정 회복에 도움 된 행동 1가지를 공유해 주세요" 같은 템플릿

을 빈 상태 화면에 배치하면 첫 작성 전환율 개선에 유리합니다.

### 3-2. 기록 ↔ 커뮤니티 유기적 연결

루틴 100% 달성 순간에:

- "축하합니다! 이 성취를 공유해보세요" 팝업
- 원클릭으로 커뮤니티 초안 작성

기능을 연결하면 작성 피로도를 줄이면서 커뮤니티 콘텐츠 공급을 자연스럽게 늘릴 수 있습니다.

---

## 4. 프로젝트 구조

```text
Mini_ChatBot/
├─ backend/        # FastAPI, SQLAlchemy, 분석/AI 서비스
├─ frontend/       # React(Vite) 웹 앱
├─ mobile/         # Expo 기반 모바일 앱
├─ alembic/        # 마이그레이션 리소스
└─ README.md
```

---

## 5. 로컬 실행

### 백엔드

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

### 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

### 모바일(Expo)

```bash
cd mobile
npm install
npm run start
```

접속:
- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`

---

## 6. 환경 변수

`.env` 예시(프로젝트 루트 기준):

```env
DATABASE_URL=sqlite:///./mini_chatbot.db
DATABASE_ECHO=false
JWT_SECRET_KEY=change-this-in-production
GOOGLE_API_KEY=
APP_NAME=Behavior Pattern Analysis Chatbot
APP_ENV=development
LOG_LEVEL=INFO
```

---

## 7. 테스트

```bash
pytest backend/tests -q
```

---

## 8. 배포 정보

- 현재 배포 주소: **https://mini-chatbot-1-4247.onrender.com**
- Render 환경에서 백엔드/프론트 연동 구성
- 운영 환경에서는 JWT 키/DB/Redis 보안 설정 강화를 권장

---

## 9. 라이선스

MIT
