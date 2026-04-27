import { Outlet } from "react-router-dom";
import { getErrorMessage } from "../api/api";
import Navbar from "../components/navigation/Navbar";
import Card from "../components/ui/Card";
import useAppData from "../hooks/useAppData";

function AppLayout() {
  const appData = useAppData();
  const appErrorMessage = getErrorMessage(appData.error, "We couldn't load your Mindflow data.");

  return (
    <div className="min-h-screen text-[color:var(--ink)]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-5rem] h-72 w-72 rounded-full bg-[#f2c0af]/60 blur-3xl" />
        <div className="absolute right-[-8rem] top-16 h-72 w-72 rounded-full bg-[#cfe9e2]/70 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-[#f4dfb7]/50 blur-3xl" />
      </div>

      <Navbar />

      <main className="relative pb-32 pt-28 md:pb-16 md:pt-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {appData.loading ? (
            <Card className="app-panel-strong p-8 text-[color:var(--ink-soft)]">Loading Mindflow data...</Card>
          ) : appData.error ? (
            <Card className="app-panel-strong p-8 text-[color:var(--ink-soft)]">{appErrorMessage}</Card>
          ) : (
            <Outlet context={appData} />
          )}
        </div>
      </main>
    </div>
  );
}

export default AppLayout;
