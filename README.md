# Behavior Pattern Analysis - API 연동 가이드

## 📋 목차

1. [프로젝트 구조](#프로젝트-구조)
2. [설치 및 실행](#설치-및-실행)
3. [API 연동 파일](#api-연동-파일)
4. [사용 방법](#사용-방법)
5. [백엔드 연동](#백엔드-연동)

## 🏗️ 프로젝트 구조

```
src/app/
├── types/                    # TypeScript 타입 정의
│   └── index.ts             # 모든 데이터 모델 (User, Behavior, Insight 등)
│
├── services/                 # API 서비스 레이어
│   └── api.ts               # API 클라이언트 및 모든 엔드포인트
│
├── hooks/                    # React Custom Hooks
│   ├── useDashboard.ts      # 대시보드 데이터 관리
│   ├── useBehaviors.ts      # 행동 기록 CRUD
│   ├── useAnalysis.ts       # 분석 데이터
│   ├── useChat.ts           # 채팅 기능
│   └── useProfile.ts        # 프로필 데이터
│
├── pages/                    # 페이지 컴포넌트
│   ├── Dashboard.tsx        # Mock 데이터 버전
│   ├── Dashboard-API.tsx    # ✅ API 연동 버전
│   ├── BehaviorLog.tsx      # Mock 데이터 버전
│   ├── BehaviorLog-API.tsx  # ✅ API 연동 버전
│   ├── Analysis.tsx
│   ├── Chat.tsx
│   └── Profile.tsx
│
└── components/
    └── Layout.tsx           # 전체 레이아웃 + Toaster
```

## 🚀 설치 및 실행

### 1. 환경 변수 설정

```bash
# .env 파일 생성
cp .env.example .env
```

`.env` 파일 편집:
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_USER_ID=user-123
```

### 2. 프론트엔드 실행

```bash
npm install
npm run dev
```

### 3. 백엔드 실행 (선택)

백엔드 구현 예시는 `BACKEND-EXAMPLE.md` 참조

## 📦 API 연동 파일

### 1️⃣ 타입 정의 (`/src/app/types/index.ts`)

모든 데이터 구조를 TypeScript 타입으로 정의:

```typescript
export interface Behavior {
  id: string;
  userId: string;
  action: string;
  emotion: 'happy' | 'neutral' | 'stressed';
  timestamp: string;
}

export interface BehaviorInput {
  action: string;
  emotion: 'happy' | 'neutral' | 'stressed';
  timestamp?: string;
}
```

### 2️⃣ API 서비스 (`/src/app/services/api.ts`)

모든 백엔드 API 호출을 관리:

```typescript
// API 클라이언트
export const apiClient = new ApiClient();

// Behavior API
export const behaviorApi = {
  getBehaviors: async (params?) => {...},
  createBehavior: async (data: BehaviorInput) => {...},
  deleteBehavior: async (id: string) => {...},
};

// Dashboard API
export const dashboardApi = {
  getDashboardData: async () => {...},
};

// 기타: analysisApi, chatApi, profileApi, authApi
```

**주요 기능:**
- ✅ 자동 인증 토큰 관리
- ✅ 에러 핸들링
- ✅ TypeScript 타입 안전성
- ✅ 환경변수로 API URL 관리

### 3️⃣ Custom Hooks

각 페이지별 데이터 관리 훅:

#### `useBehaviors` 예시:
```typescript
const { 
  behaviors,      // 행동 목록
  loading,        // 로딩 상태
  error,          // 에러 메시지
  createBehavior, // 생성 함수
  deleteBehavior, // 삭제 함수
  refetch         // 새로고침
} = useBehaviors();
```

#### `useDashboard` 예시:
```typescript
const { data, loading, error, refetch } = useDashboard();

if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage message={error} />;
```

## 💻 사용 방법

### Mock 데이터 → API 버전으로 전환

#### Before (Mock 데이터):
```typescript
// src/app/routes.tsx
import { Dashboard } from "./pages/Dashboard";
import { BehaviorLog } from "./pages/BehaviorLog";
```

#### After (API 연동):
```typescript
// src/app/routes.tsx
import { Dashboard } from "./pages/Dashboard-API";
import { BehaviorLog } from "./pages/BehaviorLog-API";
```

### 페이지에서 Hook 사용하기

```typescript
// Dashboard-API.tsx
import { useDashboard } from "../hooks/useDashboard";

export function Dashboard() {
  const { data, loading, error, refetch } = useDashboard();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (error) {
    return (
      <ErrorMessage 
        message={error} 
        onRetry={refetch} 
      />
    );
  }
  
  return (
    <div>
      {/* 데이터 렌더링 */}
      {data.summaryCards.map(card => ...)}
    </div>
  );
}
```

### 행동 기록 생성 예시

```typescript
// BehaviorLog-API.tsx
import { useBehaviors } from "../hooks/useBehaviors";

export function BehaviorLog() {
  const { createBehavior } = useBehaviors();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await createBehavior({
        action: "Study Session",
        emotion: "happy",
        timestamp: new Date().toISOString(),
      });
      
      toast.success("행동이 기록되었습니다!");
    } catch (err) {
      toast.error("기록 실패");
    }
  };
}
```

## 🔌 백엔드 연동

### API 엔드포인트 요구사항

프론트엔드가 호출하는 모든 엔드포인트:

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/dashboard` | 대시보드 데이터 |
| GET | `/api/behaviors` | 행동 목록 조회 |
| POST | `/api/behaviors` | 행동 기록 생성 |
| DELETE | `/api/behaviors/:id` | 행동 삭제 |
| GET | `/api/analysis/insights` | AI 인사이트 |
| GET | `/api/analysis/distribution` | 행동 분포 |
| POST | `/api/chat/message` | 채팅 메시지 전송 |
| GET | `/api/profile` | 프로필 조회 |
| GET | `/api/profile/stats` | 통계 조회 |

자세한 API 스펙은 `API-INTEGRATION.md` 참조

### 백엔드 구현

1. **Node.js + Express 예시**: `BACKEND-EXAMPLE.md` 참조
2. **Python + FastAPI**: 별도 구현 필요
3. **Spring Boot**: 별도 구현 필요

### 인증 설정

로그인 후 토큰 저장:

```typescript
import { apiClient, authApi } from './services/api';

// 로그인
const response = await authApi.login(email, password);
const { token, user } = response.data;

// 토큰 설정
apiClient.setAuthToken(token);

// 로컬 스토리지에 저장
localStorage.setItem('token', token);
```

## 📊 데이터 흐름

```
사용자 액션
    ↓
React Component
    ↓
Custom Hook (useBehaviors)
    ↓
API Service (behaviorApi)
    ↓
API Client (fetch)
    ↓
Backend Server
    ↓
Database
```

## 🔄 상태 관리

각 Hook은 다음 상태를 관리:

- **data**: API에서 받은 데이터
- **loading**: 로딩 중 여부
- **error**: 에러 메시지
- **refetch**: 데이터 새로고침 함수

## 🎨 UI 상태 처리

### 로딩 상태
```typescript
{loading && (
  <Loader2 className="w-8 h-8 animate-spin" />
)}
```

### 에러 상태
```typescript
{error && (
  <div className="error-message">
    <AlertCircle />
    <p>{error}</p>
    <button onClick={refetch}>다시 시도</button>
  </div>
)}
```

### 빈 데이터
```typescript
{behaviors.length === 0 && (
  <p>아직 기록된 행동이 없습니다</p>
)}
```

## 🧪 테스트

### API 없이 개발하기

Mock 데이터 버전의 페이지를 사용:
- `Dashboard.tsx` (Mock)
- `BehaviorLog.tsx` (Mock)

### API 연결 테스트

1. 백엔드 서버 실행
2. `.env`에서 `VITE_API_BASE_URL` 설정
3. API 버전 페이지 사용:
   - `Dashboard-API.tsx`
   - `BehaviorLog-API.tsx`

## 📝 환경별 설정

### 개발 환경
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### 프로덕션 환경
```env
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

## 🔐 보안 고려사항

1. **토큰 저장**: HttpOnly 쿠키 사용 권장
2. **CORS**: 백엔드에서 적절한 CORS 설정
3. **환경변수**: API 키는 `.env`에 저장, `.gitignore`에 추가
4. **HTTPS**: 프로덕션에서는 반드시 HTTPS 사용

## 🚀 배포

### Vercel/Netlify 배포 시
환경변수를 플랫폼 설정에 추가:
- `VITE_API_BASE_URL`
- `VITE_USER_ID` (테스트용)

## 📚 추가 리소스

- `API-INTEGRATION.md` - 상세 API 스펙
- `BACKEND-EXAMPLE.md` - Express.js 백엔드 예시
- `.env.example` - 환경변수 템플릿

## ❓ FAQ

**Q: Mock 데이터와 API 버전을 어떻게 전환하나요?**
A: `routes.tsx`에서 import 경로만 변경하면 됩니다.

**Q: 백엔드 없이 개발할 수 있나요?**
A: 네, Mock 데이터 버전 페이지를 사용하세요.

**Q: 에러 처리는 어떻게 하나요?**
A: 모든 Hook에서 `error` 상태를 제공합니다.

## 🤝 기여

개선사항이나 버그 발견 시 이슈를 등록해주세요!
