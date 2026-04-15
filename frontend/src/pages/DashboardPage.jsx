import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Chart from '../components/Chart';

function DashboardPage() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    mostFrequent: 'YouTube',
    worstTime: '9pm - 12am',
    bestTime: '9am - 12pm',
    weeklyProgress: '+12%',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:8000/api/analysis/1');

        if (!response.ok) {
          throw new Error('API not available');
        }

        const data = await response.json();

        // 👉 여기 핵심
        setStats({
          mostFrequent: data.mostFrequent ?? 'YouTube',
          worstTime: data.worstTime ?? '9pm - 12am',
          bestTime: data.bestTime ?? '9am - 12pm',
          weeklyProgress: data.weeklyProgress ?? '+12%',
        });

      } catch (err) {
        console.log('API 실패 → 기본값 사용');
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleNavigate = (path) => {
    navigate(path);
  };

  return (
    <section>
      <PageHeader
        title="Dashboard"
        description="Your behavior summary, trends, and key insights"
      />

      {/* 상태 표시 */}
      {loading && <p className="text-zinc-400 mb-4">Loading...</p>}
      {error && <p className="text-red-400 mb-4">API 연결 실패 (기본값 표시 중)</p>}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card title="Most Frequent Behavior" value={stats.mostFrequent} />
        <Card title="Worst Habit Time" value={stats.worstTime} />
        <Card title="Best Focus Time" value={stats.bestTime} />
        <Card title="Weekly Progress" value={stats.weeklyProgress} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <Chart />
        <Chart />
      </div>

      {/* Quick Navigation */}
      <div className="bg-zinc-900/40 border border-zinc-800/70 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Navigation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <button onClick={() => handleNavigate('/log')} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm">
            📝 View Logs
          </button>
          <button onClick={() => handleNavigate('/analysis')} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm">
            📊 Analysis
          </button>
          <button onClick={() => handleNavigate('/chat')} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm">
            💬 Chat
          </button>
          <button onClick={() => handleNavigate('/profile')} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm">
            👤 Profile
          </button>
        </div>
      </div>
    </section>
  );
}

export default DashboardPage;