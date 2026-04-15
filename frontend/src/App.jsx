import { useEffect, useState } from "react";
import api from "./api/api";
import Chart from "./components/Chart";
import AppLayout from './layouts/AppLayout';
import AnalysisPage from './pages/AnalysisPage';
import ChatPage from './pages/ChatPage';
import DashboardPage from './pages/DashboardPage';
import LogPage from './pages/LogPage';
import ProfilePage from './pages/ProfilePage';
import { usePathname } from './hooks/usePathname';

const pageByPath = {
  '/': DashboardPage,
  '/dashboard': DashboardPage,
  '/log': LogPage,
  '/analysis': AnalysisPage,
  '/chat': ChatPage,
  '/profile': ProfilePage,
};

function App() {
  const pathname = usePathname();
  const ActivePage = pageByPath[pathname] ?? DashboardPage;

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Welcome back 👋</h1>

      {/* 카드 영역 */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card title="Most Frequent Behavior" value="YouTube" />
        <Card title="Worst Habit Time" value="9pm - 12am" />
        <Card title="Best Focus Time" value="9am - 12pm" />
        <Card title="Weekly Progress" value="+12%" />
      </div>

      {/* ✅ 차트는 반드시 return 안에 */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Chart />
        <Chart />
      </div>

      {/* 유저 리스트 */}
      <div className="bg-zinc-900 p-4 rounded-xl">
        <h2 className="text-xl mb-3">Users</h2>
        {users.map((user) => (
          <div key={user.id} className="border-b border-zinc-700 py-2">
            {user.name || user.email}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
