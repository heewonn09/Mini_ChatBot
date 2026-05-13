# Mindflow Mobile (Expo)

React Native(Expo) 기반 모바일 MVP 시작점입니다.

## 실행

```bash
cd mobile
npm install
npm run start
```

## 환경 변수

- `EXPO_PUBLIC_API_BASE_URL` (기본값: `http://127.0.0.1:8000/api`)

에뮬레이터/실기기에서는 localhost 대신 PC IP를 사용하세요.

## 포함된 MVP 기능

- 로그인 / 회원가입
- SecureStore 기반 access/refresh 토큰 저장
- `/auth/me` 세션 복구 및 401 시 `/auth/refresh` 자동 재시도
- 오버뷰 데이터(`/ui/{user_id}/overview`) 조회
- 오프라인 기록 큐 저장 및 재동기화

- 시간 커스텀 데일리 로컬 푸시 리마인더(권한 허용 시)

## 스모크 체크

```bash
cd mobile
npm run smoke
```

백엔드가 실행 중이어야 합니다 (`http://127.0.0.1:8000`).

예시: 프로젝트 루트에서 `docker compose up -d` 후 실행

### 인증 스모크(선택)

```bash
cd mobile
SMOKE_USERNAME_OR_EMAIL=demo@mindflow.app SMOKE_PASSWORD=Passw0rd! npm run smoke -- --auth
```

로그인 + `/api/auth/me` 보호 API까지 확인합니다.


## 설치 오류(ERESOLVE) 해결

`react-native-screens` 버전 충돌이 나면 `package.json` 버전 고정 후 재설치하세요.

```bash
cd mobile
rm -rf node_modules package-lock.json
npm install
```

Windows CMD:

```cmd
cd mobile
rmdir /s /q node_modules
del package-lock.json
npm install
```
