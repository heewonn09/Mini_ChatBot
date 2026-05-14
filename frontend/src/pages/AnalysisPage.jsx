import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Brain,
  Clock3,
  Lightbulb,
  Link2,
  Target,
  TrendingUp,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { fetchAnalysisView, fetchHabitCorrelations, getErrorMessage } from "../api/api";
import Chart from "../components/Chart";
import AIInsightCard from "../components/ui/AIInsightCard";
import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";

const DAY_OPTIONS = [7, 14, 30];

function AnalysisPage() {
  const { user, overview, error: appError, refreshOverview } = useOutletContext();
  const [days, setDays] = useState(7);

  const {
    data: analysis,
    error: analysisQueryError,
    isLoading: loading,
    refetch: refetchAnalysis,
  } = useQuery({
    queryKey: ["analysis", user?.id, days],
    queryFn: () => fetchAnalysisView(user.id, days),
    enabled: !!user?.id,
  });

  const { data: corrData } = useQuery({
    queryKey: ["correlations", user?.id],
    queryFn: () => fetchHabitCorrelations(user.id),
    enabled: !!user?.id,
  });

  const correlations = corrData?.correlations ?? [];

  const distribution = useMemo(
    () =>
      (analysis?.behavior_distribution ?? []).map((item) => ({
        ...item,
        color:
          item.category === "productive"
            ? "#0f766e"
            : item.category === "neutral"
            ? "#d9a85a"
            : "#dd7a5f",
      })),
    [analysis]
  );

  const legend = distribution.map((item) => ({
    label: item.label,
    value: `${item.value}%`,
    dotClassName:
      item.category === "productive"
        ? "bg-[#0f766e]"
        : item.category === "neutral"
        ? "bg-[#d9a85a]"
        : "bg-[#dd7a5f]",
  }));

  const resolveInsightIcon = (item) => {
    if (item.title.toLowerCase().includes("sleep")) return Clock3;
    if (item.type === "success") return Lightbulb;
    if (item.type === "warning") return AlertCircle;
    return Target;
  };

  if (loading) {
    return <Card className="app-panel-strong p-6 text-[color:var(--ink-soft)]">AI 인사이트를 불러오는 중...</Card>;
  }

  const errorMessage =
    (analysisQueryError ? getErrorMessage(analysisQueryError, "AI 인사이트를 불러오지 못했습니다.") : "") ||
    (appError ? getErrorMessage(appError, "AI 인사이트를 불러오지 못했습니다.") : "");

  if (errorMessage) {
    return <Card className="app-panel-strong p-6 text-[color:var(--ink-soft)]">{errorMessage}</Card>;
  }

  if (!analysis) {
    return (
      <Card className="app-panel-strong space-y-4 p-6 text-[color:var(--ink-soft)]">
        <p>아직 AI 분석이 없습니다.</p>
        {user?.id ? (
          <button
            type="button"
            onClick={async () => {
              await refreshOverview?.(user.id);
              refetchAnalysis();
            }}
            className="app-secondary-button"
          >
            새로고침
          </button>
        ) : null}
      </Card>
    );
  }

  const insights = analysis.insights ?? [];
  const weeklyPattern = analysis.weekly_pattern ?? overview?.daily_timeline ?? [];
  const recommendations = analysis.recommendations ?? [];
  const spotlight = insights[0];

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          variant="icon"
          badgeIcon={Brain}
          title="AI 인사이트"
          description="흐트러지는 지점과 집중되는 지점을 보고 다음 조정을 제안합니다."
        />
        <div className="flex gap-1.5">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                days === d
                  ? "bg-[#0f766e] text-white"
                  : "bg-[rgba(24,50,53,0.07)] text-[color:var(--ink-soft)] hover:bg-[rgba(24,50,53,0.12)]"
              }`}
            >
              {d}일
            </button>
          ))}
        </div>
      </div>

      <Card className="app-panel-strong overflow-hidden p-7 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-4">
            <p className="app-kicker">패턴 스포트라이트</p>
            <h2 className="app-heading text-[2.35rem] leading-[1.02] text-[color:var(--ink)] sm:text-[2.95rem]">
              {spotlight?.title ?? "지금 바로 실행할 수 있는 핵심 신호가 있어요."}
            </h2>
            <p className="max-w-xl text-[1rem] leading-8 text-[color:var(--ink-soft)] sm:text-[1.05rem]">
              {spotlight?.description ?? "최근 기록을 비교해 지금 가장 보호/수정이 필요한 패턴을 보여줍니다."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {distribution.map((item) => (
              <div
                key={item.label}
                className="rounded-[1.5rem] border border-[rgba(24,50,53,0.08)] bg-white/64 px-4 py-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold uppercase tracking-[0.14em] text-[color:var(--ink-soft)]">
                    {item.label}
                  </span>
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                </div>
                <p className="mt-4 text-3xl font-bold text-[color:var(--ink)]">{item.value}%</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {insights.map((item, index) => (
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
          title="행동 분포"
          description="최근 시간이 집중/중립/방해 행동으로 어떻게 나뉘는지"
          variant="donut"
          data={distribution}
          categoryKey="label"
          height={280}
          series={[
            {
              key: "value",
              label: "비율",
              stroke: "#0f766e",
              dotClassName: "bg-[#0f766e]",
            },
          ]}
          legend={legend}
        />

        <Chart
          title="주간 패턴"
          description="시간대별 생산 리듬 보기"
          variant="radar"
          data={weeklyPattern}
          categoryKey="label"
          height={280}
          series={[
            {
              key: "value",
              label: "퍼포먼스",
              stroke: "#0f766e",
              dotClassName: "bg-[#0f766e]",
            },
          ]}
        />
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-[color:var(--ink)]">
            <TrendingUp size={18} className="text-[#0f766e]" />
            <h2 className="app-heading text-[2rem]">추천 액션</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {recommendations.map((item, index) => (
              <Card key={item.title} className="app-panel-strong p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(24,50,53,0.08)] text-sm font-bold text-[color:var(--ink)]">
                    {index + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-[1.08rem] font-semibold text-[color:var(--ink)]">{item.title}</h3>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          item.impact === "높음"
                            ? "bg-[#def2ee] text-[#0f766e]"
                            : "bg-[#f8ecd7] text-[#b67f20]"
                        }`}
                      >
                        {item.impact}
                      </span>
                    </div>
                    <p className="text-[0.98rem] leading-7 text-[color:var(--ink-soft)]">{item.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-[color:var(--ink)]">
            <Link2 size={18} className="text-[#0f766e]" />
            <h2 className="app-heading text-[2rem]">습관 상관관계</h2>
          </div>

          {correlations.length === 0 ? (
            <p className="text-[0.98rem] leading-7 text-[color:var(--ink-soft)]">
              아직 데이터가 부족해요. 다양한 태그로 더 많이 기록하면 습관 간 연관성을 발견할 수 있어요.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {correlations.map((item) => (
                <Card key={`${item.tag_a}-${item.tag_b}`} className="app-panel-strong p-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[color:var(--ink-soft)]">
                        {item.tag_a} → {item.tag_b}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-sm font-bold ${
                        item.direction === "positive"
                          ? "bg-[#def2ee] text-[#0f766e]"
                          : "bg-[#f8e2d9] text-[#dd7a5f]"
                      }`}>
                        {item.direction === "positive" ? `+${item.diff_pct}%` : `-${item.diff_pct}%`}
                      </span>
                    </div>
                    <p className="text-[1rem] font-semibold leading-7 text-[color:var(--ink)]">
                      {item.description}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}

export default AnalysisPage;
