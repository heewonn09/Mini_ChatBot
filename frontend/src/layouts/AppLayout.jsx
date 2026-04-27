import { Outlet } from "react-router-dom";
import Navbar from "../components/navigation/Navbar";
import Card from "../components/ui/Card";
import useAppData from "../hooks/useAppData";

function AppLayout({ user, prefs, onLogout }) {
  const appData = useAppData(user);
  const appErrorMessage =
    typeof appData.error === "string"
      ? appData.error
      : appData.error?.message || prefs.t.loadError;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <Navbar prefs={prefs} onLogout={onLogout} />
      <main className="pb-28 pt-24 md:pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {appData.loading ? (
            <Card className="p-6 text-zinc-300">{prefs.t.loadingData}</Card>
          ) : appData.error ? (
            <Card className="p-6 text-zinc-300">{appErrorMessage}</Card>
          ) : (
            <Outlet context={{ ...appData, t: prefs.t }} />
          )}
        </div>
      </main>
    </div>
  );
}

export default AppLayout;
