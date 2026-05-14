import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import LogPage from "./pages/LogPage";
import AnalysisPage from "./pages/AnalysisPage";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";
import AuthPage from "./pages/AuthPage";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import { getStoredToken } from "./api/api";

function App() {
  const hasToken = Boolean(getStoredToken());

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to={hasToken ? "/dashboard" : "/auth"} replace />} />
          <Route
            path="dashboard"
            element={
              <ErrorBoundary title="대시보드 오류" description="새로고침 후 다시 시도해주세요.">
                <DashboardPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="log"
            element={
              <ErrorBoundary title="기록 오류" description="새로고침 후 다시 시도해주세요.">
                <LogPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="analysis"
            element={
              <ErrorBoundary title="분석 오류" description="새로고침 후 다시 시도해주세요.">
                <AnalysisPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="chat"
            element={
              <ErrorBoundary title="채팅 오류" description="새로고침 후 다시 시도해주세요.">
                <ChatPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="profile"
            element={
              <ErrorBoundary title="프로필 오류" description="새로고침 후 다시 시도해주세요.">
                <ProfilePage />
              </ErrorBoundary>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
