import { Clock3, Target, TrendingDown, TrendingUp } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import Chart from "../components/Chart";
import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";

const statUiMap = {
  "Most Frequent Behavior": {
    Icon: TrendingDown,
    iconClassName: "bg-gradient-to-br from-orange-500 to-rose-500 text-white",
  },
  "Worst Habit Time": {
    Icon: Clock3,
    iconClassName: "bg-gradient-to-br from-amber-500 to-orange-500 text-white",
  },
  "Best Focus Time": {
    Icon: Target,
    iconClassName: "bg-gradient-to-br from-emerald-500 to-teal-500 text-white",
  },
  "Weekly Progress": {
    Icon: TrendingUp,
    iconClassName: "bg-gradient-to-br from-blue-500 to-indigo-500 text-white",
  },
};

function DashboardPage() {
  const { user, overview, loading, error, refreshOverview } = useOutletContext();

  const statCards = overview?.stat_cards ?? [];
  const dailyTimeline = overview?.daily_timeline ?? [];
  const emotionTrends = overview?.emotion_trends ?? [];
  const habitFrequency = overview?.habit_frequency ?? [];

  if (loading) {
    return <Card className="p-6 text-zinc-300">Loading overview...</Card>;
  }

  if (error) {
    const message = typeof error === "string" ? error : "Unable to load overview.";

    return (
      <Card className="space-y-4 p-6 text-zinc-300">
        <p>{message}</p>
        {user?.id ? (
          <button
            type="button"
            onClick={() => refreshOverview?.(user.id)}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
          >
            Retry
          </button>
        ) : null}
      </Card>
    );
  }

  if (!overview) {
    return <Card className="p-6 text-zinc-300">No overview data available yet.</Card>;
  }

  return (
    <section className="space-y-8">
      <PageHeader
        variant="hero"
        title={
          <span>
            Welcome back! <span className="inline-block align-middle text-[0.9em]">👋🏻</span>
          </span>
        }
        description="Here's your behavior overview for this week"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const ui = statUiMap[card.title] ?? statUiMap["Weekly Progress"];
          const Icon = ui.Icon;

          return (
            <Card
              key={card.title}
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              icon={<Icon size={18} strokeWidth={2.2} />}
              iconClassName={ui.iconClassName}
              trend={card.trend}
              className="p-5"
              titleClassName="text-[0.98rem] text-zinc-400"
              valueClassName="text-[2.05rem] sm:text-[2.2rem]"
              subtitleClassName="text-[0.98rem] text-zinc-500"
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Chart
          title="Daily Activity Timeline"
          description="Focus vs Distraction by hour"
          variant="area-compare"
          data={dailyTimeline}
          categoryKey="label"
          height={300}
          series={[
            {
              key: "focus",
              label: "Focus",
              stroke: "#6366f1",
              dotClassName: "bg-indigo-400",
            },
            {
              key: "distraction",
              label: "Distraction",
              stroke: "#f43f5e",
              dotClassName: "bg-rose-400",
            },
          ]}
        />

        <Chart
          title="Emotion Trends"
          description="Your emotional patterns this week"
          variant="area-compare"
          data={emotionTrends}
          categoryKey="label"
          height={300}
          series={[
            {
              key: "productive",
              label: "Productive",
              stroke: "#10b981",
              dotClassName: "bg-emerald-400",
            },
            {
              key: "distracted",
              label: "Distracted",
              stroke: "#f59e0b",
              dotClassName: "bg-amber-400",
            },
          ]}
        />
      </div>

      <Chart
        title="Habit Frequency"
        description="Most tracked behaviors this week"
        variant="bar-horizontal"
        data={habitFrequency}
        categoryKey="tag"
        height={286}
        series={[
          {
            key: "count",
            label: "Count",
            stroke: "#6d6af9",
            dotClassName: "bg-indigo-400",
          },
        ]}
      />
    </section>
  );
}

export default DashboardPage;
