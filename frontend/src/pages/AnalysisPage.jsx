import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Brain,
  Clock3,
  Lightbulb,
  Target,
  TrendingUp,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import Chart from "../components/Chart";
import AIInsightCard from "../components/ui/AIInsightCard";
import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";
import { fetchAnalysisView } from "../api/api";

function AnalysisPage() {
  const { user } = useOutletContext();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      const data = await fetchAnalysisView(user.id);
      if (active) {
        setAnalysis(data);
        setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [user]);

  const distribution = useMemo(
    () =>
      (analysis?.behavior_distribution ?? []).map((item) => ({
        ...item,
        color:
          item.category === "productive"
            ? "#10b981"
            : item.category === "neutral"
            ? "#6366f1"
            : "#f59e0b",
      })),
    [analysis]
  );

  const legend = distribution.map((item) => ({
    label: item.label,
    value: `${item.value}%`,
    dotClassName:
      item.category === "productive"
        ? "bg-emerald-400"
        : item.category === "neutral"
        ? "bg-indigo-400"
        : "bg-amber-400",
  }));

  const resolveInsightIcon = (item) => {
    if (item.title.toLowerCase().includes("sleep")) return Clock3;
    if (item.type === "success") return Lightbulb;
    if (item.type === "warning") return AlertCircle;
    return Target;
  };

  if (loading) {
    return <Card className="p-6 text-zinc-300">Loading AI insights...</Card>;
  }

  return (
    <section className="space-y-8">
      <PageHeader
        variant="icon"
        badgeIcon={Brain}
        title="AI Insights"
        description="Personalized analysis of your behavior patterns"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {analysis.insights.map((item, index) => (
          <AIInsightCard
            key={`${item.title}-${index}`}
            title={item.title}
            description={item.description}
            tone={index === 2 && item.type === "warning" ? "accent" : item.type}
            icon={resolveInsightIcon(item)}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Chart
          title="Behavior Distribution"
          description="How you spend your time"
          variant="donut"
          data={distribution}
          categoryKey="label"
          height={280}
          series={[
            {
              key: "value",
              label: "Share",
              stroke: "#6366f1",
              dotClassName: "bg-indigo-400",
            },
          ]}
          legend={legend}
        />

        <Chart
          title="Weekly Pattern"
          description="Your productivity by time of day"
          variant="radar"
          data={analysis.weekly_pattern}
          categoryKey="label"
          height={280}
          series={[
            {
              key: "value",
              label: "Performance",
              stroke: "#6366f1",
              dotClassName: "bg-indigo-400",
            },
          ]}
        />
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-zinc-50">
            <TrendingUp size={18} className="text-indigo-400" />
            <h2 className="text-[1.35rem] font-bold">Recommended Actions</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {analysis.recommendations.map((item) => (
              <Card key={item.title} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="text-[1.1rem] font-semibold text-zinc-50">{item.title}</h3>
                    <p className="text-[0.98rem] text-zinc-400">{item.description}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                      item.impact === "High"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-blue-500/10 text-blue-400"
                    }`}
                  >
                    {item.impact}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>
    </section>
  );
}

export default AnalysisPage;
