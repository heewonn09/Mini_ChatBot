import { Outlet } from "react-router-dom";
import Navbar from "../components/navigation/Navbar";

function AppLayout() {
  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* 사이드바 */}
      <Navbar />

      {/* 콘텐츠 영역 */}
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AppLayout;