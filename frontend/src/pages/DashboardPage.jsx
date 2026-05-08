import {
  Clock3,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useAppSettings } from "../context/AppSettingsContext";
import Chart from "../components/Chart";
import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";

const statUiMap = {
  most_frequent_behavior: {
    Icon: TrendingDown,
    iconClassName: "bg-[#f8e2d9] text-[#dd7a5f]",
  },
  worst_habit_time: {
    Icon: Clock3,
    iconClassName: "bg-[#f8ecd7] text-[#b67f20]",
  },
  best_focus_time: {
    Icon: Target,
    iconClassName: "bg-[#def2ee] text-[#0f766e]",
  },
  weekly_progress: {
    Icon: TrendingUp,
    iconClassName: "bg-[#e7eee3] text-[#597b61]",
  },
  "Most Frequent Behavior": {
    Icon: TrendingDown,
    iconClassName: "bg-[#f8e2d9] text-[#dd7a5f]",
  },
  "Worst Habit Time": {
    Icon: Clock3,
    iconClassName: "bg-[#f8ecd7] text-[#b67f20]",
  },
  "Best Focus Time": {
    Icon: Target,
    iconClassName: "bg-[#def2ee] text-[#0f766e]",
  },
  "Weekly Progress": {
    Icon: TrendingUp,
    iconClassName: "bg-[#e7eee3] text-[#597b61]",
  },
};

function activityToneClass(emotion) {
  if (emotion === "happy" || emotion === "focused" || emotion === "motivated") {
    return "bg-[#def2ee] text-[#0f766e]";
  }
  if (emotion === "stressed" || emotion === "anxious" || emotion === "sad") {
    return "bg-[#f8e2d9] text-[#dd7a5f]";
  }
  return "bg-[#f8ecd7] text-[#b67f20]";
}

import { normalizeCategory, normalizeMood } from "../i18n/normalize";

function toCode(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function DashboardPage() {
  const { overview } = useOutletContext();
  const { t } = useAppSettings();
  const statsByTitle = Object.fromEntries((overview.stat_cards ?? []).map((card) => [card.title, card]));
  const welcomeName = overview.welcome_name?.split(" ")[0] ?? "there";
  const leadInsight = overview.insights?.[0];
  const focusInsight = overview.insights?.[1];
  const recentActivity = overview.recent_activity ?? [];
  const [activityView, setActivityView] = useState("daily");
  const groupedDaily = useMemo(() => recentActivity.reduce((acc, item) => { const d = new Date(item.created_at); const key=d.toDateString(); (acc[key] ||= []).push(item); return acc; }, {}), [recentActivity]);

  return (
    <section className="space-y-8">
      <PageHeader
        variant="hero"
        title={t("dashboard.welcome", { name: welcomeName })}
        description="A calmer control room for your focus windows, distractions, and small daily wins."
      />

      <div className="grid gap-6 xl:grid-cols-[1.45fr,0.95fr]">
        <Card className="app-panel-strong overflow-hidden p-7 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-5">
              <p className="app-kicker">{t("dashboard.weekAtGlance")}</p>
              <div className="space-y-4">
                <h2 className="app-heading text-[2.35rem] leading-[1.02] text-[color:var(--ink)] sm:text-[3rem]">
                  {leadInsight?.title ?? "Your routines are becoming easier to read."}
                </h2>
                <p className="max-w-xl text-[1rem] leading-8 text-[color:var(--ink-soft)] sm:text-[1.05rem]">
                  {leadInsight?.description ??
                    "Keep logging consistently and Mindflow will keep turning scattered moments into clear patterns."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {(overview.stat_cards ?? []).map((card) => (
                  <span key={card.title} className="app-chip text-sm">
                    <span className="font-semibold text-[color:var(--ink-soft)]">{card.title}</span>
                    <span className="font-bold text-[color:var(--ink)]">{card.value}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[1.9rem] bg-[linear-gradient(140deg,#0f766e_0%,#177f77_52%,#d9a85a_100%)] p-6 text-white shadow-[0_22px_60px_rgba(15,118,110,0.22)]">
              <div className="mb-10 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/72">{t("dashboard.focusWindow")}</p>
                  <p className="mt-3 text-4xl font-extrabold">{statsByTitle["Best Focus Time"]?.value ?? "--"}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-[1.3rem] bg-white/14">
                  <Sparkles size={18} strokeWidth={2.2} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[1.35rem] bg-white/12 p-4">
                  <p className="text-sm font-semibold text-white/72">What to protect</p>
                  <p className="mt-2 text-base leading-7 text-white">{focusInsight?.description ?? "Your best hours are worth guarding from noise."}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[1.35rem] bg-white/10 p-4">
                    <p className="text-sm text-white/70">Risk zone</p>
                    <p className="mt-2 text-lg font-bold">{statsByTitle["Worst Habit Time"]?.value ?? "--"}</p>
                  </div>
                  <div className="rounded-[1.35rem] bg-white/10 p-4">
                    <p className="text-sm text-white/70">Momentum</p>
                    <p className="mt-2 text-lg font-bold">{statsByTitle["Weekly Progress"]?.value ?? "--"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="app-kicker">{t("dashboard.latestNotes")}</p>
                <h2 className="app-heading text-[2rem] text-[color:var(--ink)]">{t("dashboard.recentActivity")}</h2>
              </div>
              <span className="app-chip text-sm">{`${recentActivity.length}${t("common.items")}`}</span>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setActivityView("daily")} className={`app-chip text-sm ${activityView === "daily" ? "bg-[color:var(--primary)] text-[color:var(--primary-contrast)]" : ""}`}>{t("common.daily")}</button>
              <button type="button" onClick={() => setActivityView("weekly")} className={`app-chip text-sm ${activityView === "weekly" ? "bg-[color:var(--primary)] text-[color:var(--primary-contrast)]" : ""}`}>{t("common.weekly")}</button>
            </div>
            <div className="space-y-3">
              {Object.entries(groupedDaily).slice(0,3).map(([day, items]) => (
                <div key={day} className="space-y-2">
                  <p className="text-sm font-semibold text-[color:var(--text-muted)]">{day}</p>
                  {items.map((item) => (
                    <div key={item.id} className="rounded-[1.45rem] border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] ${activityToneClass(normalizeMood(item.emotion))}`}>{t(`mood.${normalizeMood(item.emotion)}`)}</span>
                            <span className="text-sm text-[color:var(--text-muted)]">{t(`categories.${normalizeCategory(item.tag)}`)}</span>
                          </div>
                          <p className="text-[1rem] font-semibold text-[color:var(--text)]">{item.text}</p>
                        </div>
                        <span className="text-sm text-[color:var(--text-muted)]">{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overview.stat_cards.map((card) => {
          const key = toCode(card.title);
          const ui = statUiMap[key] ?? statUiMap.weekly_progress;
          const Icon = ui.Icon;

          return (
            <Card
              key={card.title}
              title={t(`stats.${toCode(card.title)}`)}
              value={card.value}
              subtitle={card.subtitle}
              icon={<Icon size={18} strokeWidth={2.2} />}
              iconClassName={ui.iconClassName}
              trend={card.trend}
              className="p-5"
              titleClassName="text-[0.98rem]"
              valueClassName="text-[2.2rem] sm:text-[2.35rem]"
              subtitleClassName="text-[0.98rem]"
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Chart
          title="Daily Activity Timeline"
          description="Focus vs. distraction across the day"
          variant="area-compare"
          data={overview.daily_timeline}
          categoryKey="label"
          height={300}
          series={[
            {
              key: "focus",
              label: "Focus",
              stroke: "#0f766e",
              dotClassName: "bg-[#0f766e]",
            },
            {
              key: "distraction",
              label: "Distraction",
              stroke: "#dd7a5f",
              dotClassName: "bg-[#dd7a5f]",
            },
          ]}
        />

        <Chart
          title="Emotion Trends"
          description="Productive energy versus distracted energy"
          variant="area-compare"
          data={overview.emotion_trends}
          categoryKey="label"
          height={300}
          series={[
            {
              key: "productive",
              label: "Productive",
              stroke: "#0f766e",
              dotClassName: "bg-[#0f766e]",
            },
            {
              key: "distracted",
              label: "Distracted",
              stroke: "#d9a85a",
              dotClassName: "bg-[#d9a85a]",
            },
          ]}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <Chart
          title="Habit Frequency"
          description="The behaviors showing up the most this week"
          variant="bar-horizontal"
          data={overview.habit_frequency}
          categoryKey="tag"
          height={290}
          series={[
            {
              key: "count",
              label: "Count",
              stroke: "#0f766e",
              dotClassName: "bg-[#0f766e]",
            },
          ]}
        />

        <Card className="p-6">
          <div className="space-y-5">
            <div className="space-y-1">
              <p className="app-kicker">Coaching notes</p>
              <h2 className="app-heading text-[2rem] text-[color:var(--ink)]">What Mindflow sees</h2>
            </div>

            <div className="space-y-4">
              {(overview.insights ?? []).map((item, index) => (
                <div
                  key={`${item.title}-${index}`}
                  className="rounded-[1.45rem] border border-[rgba(24,50,53,0.08)] bg-white/64 px-4 py-4"
                >
                  <p className="text-[1.05rem] font-bold text-[color:var(--ink)]">{item.title}</p>
                  <p className="mt-2 text-[0.96rem] leading-7 text-[color:var(--ink-soft)]">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

export default DashboardPage;
