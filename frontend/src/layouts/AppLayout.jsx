import { Navigate, Outlet } from "react-router-dom";
import { getErrorMessage, getStoredToken } from "../api/api";
import Navbar from "../components/navigation/Navbar";
import CommandMenu from "../components/navigation/CommandMenu";
import Card from "../components/ui/Card";
import PwaInstallBanner from "../components/ui/PwaInstallBanner";
import { SkeletonCard, SkeletonStatCard } from "../components/ui/Skeleton";
import useAppData from "../hooks/useAppData";

function AppLayout() {
  const appData = useAppData();
  const appErrorMessage = getErrorMessage(appData.error, "Mindflow 데이터를 불러오지 못했습니다.");
  const hasToken = Boolean(getStoredToken());

  if (!hasToken) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen text-[color:var(--ink)]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-5rem] h-72 w-72 rounded-full bg-[#f2c0af]/60 blur-3xl" />
        <div className="absolute right-[-8rem] top-16 h-72 w-72 rounded-full bg-[#cfe9e2]/70 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-[#f4dfb7]/50 blur-3xl" />
      </div>

      <Navbar />

      <CommandMenu />

      <PwaInstallBanner />

      {/* pb-safe: 하단 홈바 영역 + 탭바 높이 확보 */}
      <main
        className="relative pt-24 pb-36 md:pb-16 md:pt-32"
        style={{ paddingBottom: "calc(9rem + var(--safe-bottom, 0px))" }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8">
          {appData.loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => <SkeletonStatCard key={i} />)}
              </div>
              <SkeletonCard className="h-48" />
            </div>
          ) : appData.error ? (
            <Card className="app-panel-strong p-6 text-[color:var(--ink-soft)] sm:p-8">{appErrorMessage}</Card>
          ) : (
            <Outlet context={appData} />
          )}
        </div>
      </main>
    </div>
  );
}

export default AppLayout;
