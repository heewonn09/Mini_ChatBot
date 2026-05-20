import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import AuthPage from "./pages/AuthPage";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import { SkeletonCard } from "./components/ui/Skeleton";
import { ToastProvider } from "./context/ToastContext";
import { getStoredToken } from "./api/api";

const DashboardPage  = lazy(() => import("./pages/DashboardPage"));
const LogPage        = lazy(() => import("./pages/LogPage"));
const AnalysisPage   = lazy(() => import("./pages/AnalysisPage"));
const ChatPage       = lazy(() => import("./pages/ChatPage"));
const ProfilePage    = lazy(() => import("./pages/ProfilePage"));
const CommunityPage  = lazy(() => import("./pages/CommunityPage"));
const ChallengesPage = lazy(() => import("./pages/ChallengesPage"));

function PageLoader() {
  return (
    <div className="space-y-4 pt-4">
      <SkeletonCard className="h-40" />
      <SkeletonCard className="h-64" />
    </div>
  );
}

function App() {
  const hasToken = Boolean(getStoredToken());

  return (
    <ToastProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to={hasToken ? "/dashboard" : "/auth"} replace />} />
          <Route
            path="dashboard"
            element={
              <ErrorBoundary title="대시보드 오류" description="새로고침 후 다시 시도해주세요.">
                <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="log"
            element={
              <ErrorBoundary title="기록 오류" description="새로고침 후 다시 시도해주세요.">
                <Suspense fallback={<PageLoader />}><LogPage /></Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="analysis"
            element={
              <ErrorBoundary title="분석 오류" description="새로고침 후 다시 시도해주세요.">
                <Suspense fallback={<PageLoader />}><AnalysisPage /></Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="chat"
            element={
              <ErrorBoundary title="채팅 오류" description="새로고침 후 다시 시도해주세요.">
                <Suspense fallback={<PageLoader />}><ChatPage /></Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="profile"
            element={
              <ErrorBoundary title="프로필 오류" description="새로고침 후 다시 시도해주세요.">
                <Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="community"
            element={
              <ErrorBoundary title="커뮤니티 오류" description="새로고침 후 다시 시도해주세요.">
                <Suspense fallback={<PageLoader />}><CommunityPage /></Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="challenges"
            element={
              <ErrorBoundary title="챌린지 오류" description="새로고침 후 다시 시도해주세요.">
                <Suspense fallback={<PageLoader />}><ChallengesPage /></Suspense>
              </ErrorBoundary>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
