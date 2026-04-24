import { Outlet } from "react-router-dom";
import Navbar from "../components/navigation/Navbar";
import useAppData from "../hooks/useAppData";

function AppLayout() {
  const appData = useAppData();

  return (
    <div className="flex min-h-screen bg-[#05060a] text-white">
      <Navbar />
      <main className="flex-1 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {appData.loading ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-zinc-300">Loading dashboard data...</div>
          ) : (
            <Outlet context={appData} />
          )}
        </div>
      </main>
    </div>
  );
}

export default AppLayout;
