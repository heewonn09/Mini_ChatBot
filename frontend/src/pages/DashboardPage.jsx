import { useOutletContext } from "react-router-dom";
import { Activity, Clock3, TrendingDown, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

const iconMap = [Activity, Clock3, TrendingUp, TrendingDown];

function DashboardPage() {
  const { overview } = useOutletContext();

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-5xl font-bold">Welcome back!</h2>
        <p className="mt-2 text-zinc-400">Here&apos;s your behavior overview for this week</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {overview.stat_cards.map((card, idx) => {
          const Icon = iconMap[idx % iconMap.length];
          return (
            <div key={card.title} className="rounded-2xl border border-zinc-800 bg-[#0b0d15] p-5">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center mb-4">
                <Icon size={18} />
              </div>
              <p className="text-zinc-400 text-sm">{card.title}</p>
              <h3 className="text-3xl font-semibold mt-1">{card.value}</h3>
              <p className="text-zinc-500 text-sm mt-1">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-[#0b0d15] p-6">
          <h3 className="text-2xl font-semibold mb-1">Daily Activity Timeline</h3>
          <p className="text-zinc-500 mb-4">Focus vs distraction by hour</p>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={overview.daily_timeline}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#71717a" />
              <YAxis stroke="#71717a" />
              <Tooltip />
              <Area type="monotone" dataKey="focus" stroke="#6366f1" fill="#6366f133" />
              <Area type="monotone" dataKey="distraction" stroke="#f43f5e" fill="#f43f5e33" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#0b0d15] p-6">
          <h3 className="text-2xl font-semibold mb-1">Emotion Trends</h3>
          <p className="text-zinc-500 mb-4">Your emotional patterns this week</p>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={overview.emotion_trends}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#71717a" />
              <YAxis stroke="#71717a" />
              <Tooltip />
              <Area type="monotone" dataKey="productive" stroke="#10b981" fill="#10b98133" />
              <Area type="monotone" dataKey="distracted" stroke="#f59e0b" fill="#f59e0b33" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-[#0b0d15] p-6">
        <h3 className="text-2xl font-semibold">Habit Frequency</h3>
        <p className="text-zinc-500 mb-4">Most tracked behaviors this week</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={overview.habit_frequency} layout="vertical">
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis type="number" stroke="#71717a" />
            <YAxis type="category" dataKey="tag" stroke="#71717a" width={80} />
            <Tooltip />
            <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 8, 8]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default DashboardPage;
