
/**
 * Build a modern SaaS dashboard page.
 *
 * Requirements:
 * - Use TailwindCSS (dark theme)
 * - Grid layout
 * - 4 Stat cards (Most Frequent Behavior, Worst Habit Time, etc.)
 * - 2 charts using Recharts
 *
 * Components to use:
 * - Card
 * - Chart
 *
 * Keep UI clean and reusable.
 */
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

  useEffect(() => {
    // Fetch dashboard data from backend
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/analysis/1', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          // Process and update stats based on API response
          console.log('Dashboard data:', data);
        }
      } catch (error) {
        console.log('Dashboard data unavailable, using defaults');
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

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card
          title="Most Frequent Behavior"
          value={stats.mostFrequent}
        />
        <Card
          title="Worst Habit Time"
          value={stats.worstTime}
        />
        <Card
          title="Best Focus Time"
          value={stats.bestTime}
        />
        <Card
          title="Weekly Progress"
          value={stats.weeklyProgress}
        />
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
          <button
            onClick={() => handleNavigate('/log')}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition text-sm"
          >
            📝 View Logs
          </button>
          <button
            onClick={() => handleNavigate('/analysis')}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition text-sm"
          >
            📊 Analysis
          </button>
          <button
            onClick={() => handleNavigate('/chat')}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition text-sm"
          >
            💬 Chat
          </button>
          <button
            onClick={() => handleNavigate('/profile')}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition text-sm"
          >
            👤 Profile
          </button>
        </div>
      </div>
    </section>
  );
}

export default DashboardPage;
