import { Outlet } from "react-router-dom";
import Navbar from "../components/navigation/Navbar";
import Card from "../components/ui/Card";
import useAppData from "../hooks/useAppData";

function AppLayout() {
  const appData = useAppData();
  const appErrorMessage =
    typeof appData.error === "string"
      ? appData.error
      : appData.error?.message || "We couldn't load your Mindflow data.";

  return (
    <div className="min-h-screen bg-[#05060a] text-zinc-50">
      <Navbar />
      <main className="pb-28 pt-24 md:pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {appData.loading ? (
            <Card className="p-6 text-zinc-300">Loading Mindflow data...</Card>
          ) : appData.error ? (
            <Card className="p-6 text-zinc-300">{appErrorMessage}</Card>
          ) : (
            <Outlet context={appData} />
          )}
        </div>
      </main>
    </div>
  );
}

export default AppLayout;
