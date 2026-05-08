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
import { fetchAnalysisView, getErrorMessage } from "../api/api";
import Chart from "../components/Chart";
import AIInsightCard from "../components/ui/AIInsightCard";
import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";
import { useAppSettings } from "../context/AppSettingsContext";
import { useI18n } from "../i18n/useI18n";

function AnalysisPage() {
  const { language } = useAppSettings();
  const t = useI18n(language);
  const { user, overview, error: appError, refreshOverview } = useOutletContext();
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      setAnalysisError("");

      try {
        const data = await fetchAnalysisView(user.id);
        if (active) {
          setAnalysis(data);
        }
      } catch (error) {
        if (active) {
          setAnalysis(null);
          setAnalysisError(getErrorMessage(error, t("analysis.loadError")));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [user, reloadKey]);

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
    return <Card className="app-panel-strong p-6 text-[color:var(--ink-soft)]">{t("analysis.loading")}</Card>;
  }

  const errorMessage = analysisError || (appError ? getErrorMessage(appError, t("analysis.loadError")) : "");

  if (errorMessage) {
    return <Card className="app-panel-strong p-6 text-[color:var(--ink-soft)]">{errorMessage}</Card>;
  }

  if (!analysis) {
    return (
      <Card className="app-panel-strong space-y-4 p-6 text-[color:var(--ink-soft)]">
        <p>{t("analysis.empty")}</p>
        {user?.id ? (
          <button
            type="button"
            onClick={async () => {
              await refreshOverview?.(user.id);
              setReloadKey((value) => value + 1);
            }}
            className="app-secondary-button"
          >
            {t("common.refresh")}
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
      <PageHeader
        variant="icon"
        badgeIcon={Brain}
        title={t("analysis.title")}
        description={t("analysis.description")}
      />

      <Card className="app-panel-strong overflow-hidden p-7 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-4">
            <p className="app-kicker">{t("analysis.spotlight")}</p>
            <h2 className="app-heading text-[2.35rem] leading-[1.02] text-[color:var(--ink)] sm:text-[2.95rem]">
              {spotlight?.title ?? t("analysis.spotlightFallback")}
            </h2>
            <p className="max-w-xl text-[1rem] leading-8 text-[color:var(--ink-soft)] sm:text-[1.05rem]">
              {spotlight?.description ??
                t("analysis.spotlightDescFallback")}
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
          title={t("analysis.behaviorDistribution")}
          description={t("analysis.behaviorDistributionDesc")}
          variant="donut"
          data={distribution}
          categoryKey="label"
          height={280}
          series={[
            {
              key: "value",
              label: t("analysis.share"),
              stroke: "#0f766e",
              dotClassName: "bg-[#0f766e]",
            },
          ]}
          legend={legend}
        />

        <Chart
          title={t("analysis.weeklyPattern")}
          description={t("analysis.weeklyPatternDesc")}
          variant="radar"
          data={weeklyPattern}
          categoryKey="label"
          height={280}
          series={[
            {
              key: "value",
              label: t("analysis.performance"),
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
            <h2 className="app-heading text-[2rem]">{t("analysis.recommendedActions")}</h2>
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
                          item.impact === "High"
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
    </section>
  );
}

export default AnalysisPage;
