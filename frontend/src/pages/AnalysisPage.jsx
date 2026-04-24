import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";
import { fetchAnalysis } from "../api/api";

const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#f43f5e"];

function AnalysisPage() {
  const { user } = useOutletContext();
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetchAnalysis(user.id, 7).then(setAnalysis);
  }, [user]);

  if (!analysis) return null;

  const radar = [
    { metric: "Morning", value: 80 },
    { metric: "Afternoon", value: 65 },
    { metric: "Evening", value: 40 },
    { metric: "Night", value: 25 },
    { metric: "Focus", value: 70 },
    { metric: "Energy", value: 60 },
  ];

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-5xl font-bold">AI Insights</h2>
        <p className="text-zinc-400 mt-2">Personalized analysis of your behavior patterns</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {analysis.risky_patterns.slice(0, 4).map((risk) => (
          <div key={risk.pattern} className="rounded-2xl border border-zinc-800 bg-[#0b0d15] p-5">
            <h3 className="text-2xl font-semibold">{risk.pattern.replaceAll("_", " ")}</h3>
            <p className="text-zinc-400 mt-2">{risk.description}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-[#0b0d15] p-6">
          <h3 className="text-3xl font-semibold">Behavior Distribution</h3>
          <ResponsiveContainer width="100%" height={330}>
            <PieChart>
              <Pie data={analysis.behavior_patterns} dataKey="count" nameKey="emotion" innerRadius={70} outerRadius={110}>
                {analysis.behavior_patterns.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#0b0d15] p-6">
          <h3 className="text-3xl font-semibold">Weekly Pattern</h3>
          <ResponsiveContainer width="100%" height={330}>
            <RadarChart data={radar}>
              <PolarGrid stroke="#3f3f46" />
              <PolarAngleAxis dataKey="metric" stroke="#a1a1aa" />
              <Radar dataKey="value" stroke="#6366f1" fill="#6366f144" fillOpacity={0.8} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

export default AnalysisPage;
