import {
  Clock3,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { fetchFocusPrediction, fetchWeeklyReport } from "../api/api";
import Chart from "../components/Chart";
import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";
import { normalizeCategory, normalizeMood, CATEGORY_KO, MOOD_KO } from "../utils/normalize";

const statUiMap = {
  most_frequent_behavior: { Icon: TrendingDown, iconClassName: "bg-[#f8e2d9] text-[#dd7a5f]" },
  worst_habit_time: { Icon: Clock3, iconClassName: "bg-[#f8ecd7] text-[#b67f20]" },
  best_focus_time: { Icon: Target, iconClassName: "bg-[#def2ee] text-[#0f766e]" },
  weekly_progress: { Icon: TrendingUp, iconClassName: "bg-[#e7eee3] text-[#597b61]" },
  "Most Frequent Behavior": { Icon: TrendingDown, iconClassName: "bg-[#f8e2d9] text-[#dd7a5f]" },
  "Worst Habit Time": { Icon: Clock3, iconClassName: "bg-[#f8ecd7] text-[#b67f20]" },
  "Best Focus Time": { Icon: Target, iconClassName: "bg-[#def2ee] text-[#0f766e]" },
  "Weekly Progress": { Icon: TrendingUp, iconClassName: "bg-[#e7eee3] text-[#597b61]" },
  "가장 많은 행동": { Icon: TrendingDown, iconClassName: "bg-[#f8e2d9] text-[#dd7a5f]" },
  "최악의 습관 시간": { Icon: Clock3, iconClassName: "bg-[#f8ecd7] text-[#b67f20]" },
  "최고 집중 시간": { Icon: Target, iconClassName: "bg-[#def2ee] text-[#0f766e]" },
  "주간 진도": { Icon: TrendingUp, iconClassName: "bg-[#e7eee3] text-[#597b61]" },
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

function toCode(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function DashboardPage() {
  const { user, overview } = useOutletContext();
  const statsByTitle = Object.fromEntries((overview.stat_cards ?? []).map((card) => [card.title, card]));
  const welcomeName = overview.welcome_name?.split(" ")[0] ?? "거기";
  const leadInsight = overview.insights?.[0];
  const focusInsight = overview.insights?.[1];
  const recentActivity = overview.recent_activity ?? [];
  const [activityView, setActivityView] = useState("daily");
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [focusPrediction, setFocusPrediction] = useState(null);
  const groupedDaily = useMemo(() => recentActivity.reduce((acc, item) => { const d = new Date(item.created_at); const key=d.toDateString(); (acc[key] ||= []).push(item); return acc; }, {}), [recentActivity]);
  const groupedWeekly = useMemo(() => recentActivity.reduce((acc, item) => {
    const d = new Date(item.created_at);
    const monday = new Date(d);
    monday.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
    monday.setHours(0, 0, 0, 0);
    const key = monday.toDateString();
    (acc[key] ||= []).push(item);
    return acc;
  }, {}), [recentActivity]);

  useEffect(() => {
    if (!user?.id) return;
    fetchWeeklyReport(user.id).then(setWeeklyReport).catch(() => {});
    fetchFocusPrediction(user.id).then(setFocusPrediction).catch(() => {});
  }, [user]);

  const bestFocusCard = statsByTitle["최고 집중 시간"] ?? statsByTitle["Best Focus Time"];
  const worstHabitCard = statsByTitle["최악의 습관 시간"] ?? statsByTitle["Worst Habit Time"];
  const weeklyProgressCard = statsByTitle["주간 진도"] ?? statsByTitle["Weekly Progress"];

  return (
    <section className="space-y-8">
      <PageHeader
        variant="hero"
        title={`다시 오신 것을 환영해요, ${welcomeName}.`}
        description="집중 시간과 방해 요소, 작은 성장을 한눈에 보는 공간입니다."
      />

      {focusPrediction ? (
        <div className="flex flex-wrap items-center gap-4 rounded-[1.4rem] border border-[rgba(24,50,53,0.08)] bg-[color:var(--surface)] px-5 py-3.5">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
            focusPrediction.score >= 70 ? "bg-[#0f766e]" :
            focusPrediction.score >= 40 ? "bg-[#d9a85a]" : "bg-[#dd7a5f]"
          }`}>
            {focusPrediction.score}
          </div>
          <div>
            <p className="text-sm font-bold text-[color:var(--ink)]">{focusPrediction.label}</p>
            <p className="text-xs text-[color:var(--ink-soft)]">{focusPrediction.hour_range} 기준</p>
          </div>
          {focusPrediction.confidence === "low" ? (
            <span className="ml-auto rounded-full bg-[rgba(24,50,53,0.07)] px-3 py-1 text-xs text-[color:var(--ink-soft)]">데이터 부족</span>
          ) : null}
        </div>
      ) : null}

      {weeklyReport?.report ? (
        <Card className="app-panel-strong p-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="app-kicker">AI 주간 리포트</p>
              <span className="app-chip text-sm">{weeklyReport.week_label}</span>
            </div>
            <p className="text-[1rem] leading-8 text-[color:var(--ink-soft)]">{weeklyReport.report}</p>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.45fr,0.95fr]">
        <Card className="app-panel-strong overflow-hidden p-7 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-5">
              <p className="app-kicker">한눈에 보는 이번 주</p>
              <div className="space-y-4">
                <h2 className="app-heading text-[2.35rem] leading-[1.02] text-[color:var(--ink)] sm:text-[3rem]">
                  {leadInsight?.title ?? "당신의 루틴이 점점 더 선명해지고 있어요."}
                </h2>
                <p className="max-w-xl text-[1rem] leading-8 text-[color:var(--ink-soft)] sm:text-[1.05rem]">
                  {leadInsight?.description ?? "꾸준히 기록하면 흩어진 순간이 명확한 패턴으로 바뀝니다."}
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
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/72">집중 구간</p>
                  <p className="mt-3 text-4xl font-extrabold">{bestFocusCard?.value ?? "--"}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-[1.3rem] bg-white/14">
                  <Sparkles size={18} strokeWidth={2.2} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[1.35rem] bg-white/12 p-4">
                  <p className="text-sm font-semibold text-white/72">지켜야 할 시간</p>
                  <p className="mt-2 text-base leading-7 text-white">{focusInsight?.description ?? "가장 좋은 시간을 소음으로부터 지켜주세요."}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[1.35rem] bg-white/10 p-4">
                    <p className="text-sm text-white/70">위험 시간대</p>
                    <p className="mt-2 text-lg font-bold">{worstHabitCard?.value ?? "--"}</p>
                  </div>
                  <div className="rounded-[1.35rem] bg-white/10 p-4">
                    <p className="text-sm text-white/70">추진력</p>
                    <p className="mt-2 text-lg font-bold">{weeklyProgressCard?.value ?? "--"}</p>
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
                <p className="app-kicker">최신 기록</p>
                <h2 className="app-heading text-[2rem] text-[color:var(--ink)]">최근 활동</h2>
              </div>
              <span className="app-chip text-sm">{`${recentActivity.length}개`}</span>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setActivityView("daily")} className={`app-chip text-sm ${activityView === "daily" ? "bg-[color:var(--primary)] text-[color:var(--primary-contrast)]" : ""}`}>일별</button>
              <button type="button" onClick={() => setActivityView("weekly")} className={`app-chip text-sm ${activityView === "weekly" ? "bg-[color:var(--primary)] text-[color:var(--primary-contrast)]" : ""}`}>주별</button>
            </div>
            <div className="space-y-3">
              {activityView === "daily" ? (
                Object.entries(groupedDaily).slice(0, 5).map(([day, items]) => (
                  <div key={day} className="space-y-2">
                    <p className="text-sm font-semibold text-[color:var(--text-muted)]">{day}</p>
                    {items.map((item) => (
                      <div key={item.id} className="rounded-[1.45rem] border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] ${activityToneClass(normalizeMood(item.emotion))}`}>{MOOD_KO[normalizeMood(item.emotion)] ?? item.emotion}</span>
                              <span className="text-sm text-[color:var(--text-muted)]">{CATEGORY_KO[normalizeCategory(item.tag)] ?? item.tag}</span>
                            </div>
                            <p className="text-[1rem] font-semibold text-[color:var(--text)]">{item.text}</p>
                          </div>
                          <span className="text-sm text-[color:var(--text-muted)]">{new Date(item.created_at).toLocaleDateString("ko-KR")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              ) : (
                Object.entries(groupedWeekly).slice(0, 4).map(([weekStart, items]) => {
                  const d = new Date(weekStart);
                  const weekLabel = `${d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} 주`;
                  const tagCounts = items.reduce((acc, item) => {
                    const cat = normalizeCategory(item.tag);
                    acc[cat] = (acc[cat] || 0) + 1;
                    return acc;
                  }, {});
                  const topTags = Object.entries(tagCounts).sort(([, a], [, b]) => b - a).slice(0, 3);
                  return (
                    <div key={weekStart} className="rounded-[1.45rem] border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-[color:var(--text-muted)]">{weekLabel}</p>
                        <span className="text-xs text-[color:var(--text-muted)]">{items.length}개 기록</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {topTags.map(([cat, count]) => (
                          <span key={cat} className="app-chip text-xs">
                            {CATEGORY_KO[cat] ?? cat}
                            <span className="font-bold ml-1">{count}회</span>
                          </span>
                        ))}
                      </div>
                      <div className="space-y-1">
                        {items.slice(0, 2).map((item) => (
                          <p key={item.id} className="text-sm text-[color:var(--text-muted)] truncate">{item.text}</p>
                        ))}
                        {items.length > 2 && (
                          <p className="text-xs text-[color:var(--text-muted)]">+{items.length - 2}개 더</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              {recentActivity.length === 0 && (
                <p className="text-sm text-[color:var(--text-muted)]">아직 기록이 없습니다.</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overview.stat_cards.map((card) => {
          const key = toCode(card.title);
          const ui = statUiMap[card.title] ?? statUiMap[key] ?? statUiMap.weekly_progress;
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
              titleClassName="text-[0.98rem]"
              valueClassName="text-[2.2rem] sm:text-[2.35rem]"
              subtitleClassName="text-[0.98rem]"
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Chart
          title="일일 활동 타임라인"
          description="하루 집중/방해 패턴"
          variant="area-compare"
          data={overview.daily_timeline}
          categoryKey="label"
          height={300}
          series={[
            { key: "focus", label: "집중", stroke: "#0f766e", dotClassName: "bg-[#0f766e]" },
            { key: "distraction", label: "방해", stroke: "#dd7a5f", dotClassName: "bg-[#dd7a5f]" },
          ]}
        />

        <Chart
          title="감정 추이"
          description="생산 에너지 vs 산만 에너지"
          variant="area-compare"
          data={overview.emotion_trends}
          categoryKey="label"
          height={300}
          series={[
            { key: "productive", label: "생산적", stroke: "#0f766e", dotClassName: "bg-[#0f766e]" },
            { key: "distracted", label: "산만", stroke: "#d9a85a", dotClassName: "bg-[#d9a85a]" },
          ]}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <Chart
          title="습관 빈도"
          description="이번 주 자주 나타난 행동"
          variant="bar-horizontal"
          data={overview.habit_frequency}
          categoryKey="tag"
          height={290}
          series={[
            { key: "count", label: "횟수", stroke: "#0f766e", dotClassName: "bg-[#0f766e]" },
          ]}
        />

        <Card className="p-6">
          <div className="space-y-5">
            <div className="space-y-1">
              <p className="app-kicker">코칭 노트</p>
              <h2 className="app-heading text-[2rem] text-[color:var(--ink)]">Mindflow가 본 것</h2>
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
