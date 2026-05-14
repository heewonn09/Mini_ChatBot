import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Brain,
  CalendarDays,
  CheckCircle2,
  Crown,
  Flame,
  ShieldCheck,
  Sparkles,
  Sunrise,
  Target,
  Trophy,
  TrendingUp,
  User,
} from "lucide-react";
import { Link, useOutletContext } from "react-router-dom";
import { fetchHeatmap, fetchPreferences, fetchProfileView, getErrorMessage, updatePreferences } from "../api/api";
import Card from "../components/ui/Card";
import Modal from "../components/ui/Modal";
import PageHeader from "../components/ui/PageHeader";
import { normalizeCategory, normalizeMood, CATEGORY_KO, MOOD_KO } from "../utils/normalize";

const metricUiMap = {
  check: { Icon: CheckCircle2, iconClassName: "bg-[#f8ecd7] text-[#b67f20]" },
  calendar: { Icon: CalendarDays, iconClassName: "bg-[#def2ee] text-[#0f766e]" },
  flame: { Icon: Flame, iconClassName: "bg-[#f8e2d9] text-[#dd7a5f]" },
  trophy: { Icon: Trophy, iconClassName: "bg-[#f8ecd7] text-[#b67f20]" },
  trend: { Icon: TrendingUp, iconClassName: "bg-[#e7eee3] text-[#597b61]" },
};

const achievementUiMap = {
  "First Week": { Icon: Sparkles, iconClassName: "bg-[#def2ee] text-[#0f766e]" },
  "첫 번째 주": { Icon: Sparkles, iconClassName: "bg-[#def2ee] text-[#0f766e]" },
  "Morning Person": { Icon: Sunrise, iconClassName: "bg-[#f8ecd7] text-[#b67f20]" },
  "아침형 인간": { Icon: Sunrise, iconClassName: "bg-[#f8ecd7] text-[#b67f20]" },
  "Focus Master": { Icon: Target, iconClassName: "bg-[#e7eee3] text-[#597b61]" },
  "집중 마스터": { Icon: Target, iconClassName: "bg-[#e7eee3] text-[#597b61]" },
  "Consistency King": { Icon: Crown, iconClassName: "bg-[#f8e2d9] text-[#dd7a5f]" },
  "꾸준함의 왕": { Icon: Crown, iconClassName: "bg-[#f8e2d9] text-[#dd7a5f]" },
  "Self Awareness": { Icon: Brain, iconClassName: "bg-[#def2ee] text-[#0f766e]" },
  "자기 인식": { Icon: Brain, iconClassName: "bg-[#def2ee] text-[#0f766e]" },
  "Habit Breaker": { Icon: ShieldCheck, iconClassName: "bg-[#f5dfd3] text-[#c86f56]" },
  "습관 파괴자": { Icon: ShieldCheck, iconClassName: "bg-[#f5dfd3] text-[#c86f56]" },
};

const barHeights = ["h-3", "h-4", "h-5", "h-6", "h-7", "h-8", "h-9"];

function levelClass(value, maxValue, fallback) {
  if (!value) return fallback;
  const ratio = Math.min(1, value / Math.max(1, maxValue));
  return barHeights[Math.min(barHeights.length - 1, Math.floor(ratio * (barHeights.length - 1)) + 1)];
}

function progressToneClass(tone) {
  return tone === "warning"
    ? "[&::-webkit-progress-value]:bg-[#dd7a5f] [&::-moz-progress-bar]:bg-[#dd7a5f]"
    : "[&::-webkit-progress-value]:bg-[#0f766e] [&::-moz-progress-bar]:bg-[#0f766e]";
}

function ProfilePage() {
  const { user, error: appError, refreshOverview } = useOutletContext();
  const [hoveredDay, setHoveredDay] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [prefForm, setPrefForm] = useState({ language: "ko", theme: "light" });
  const [saving, setSaving] = useState(false);

  const {
    data: profile,
    error: profileQueryError,
    isLoading: loading,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfileView(user.id),
    enabled: !!user?.id,
  });

  const { data: heatmapData } = useQuery({
    queryKey: ["heatmap", user?.id],
    queryFn: () => fetchHeatmap(user.id),
    enabled: !!user?.id,
  });

  const { data: prefsData } = useQuery({
    queryKey: ["preferences", user?.id],
    queryFn: () => fetchPreferences(user.id),
    enabled: !!user?.id,
  });

  const heatmap = heatmapData ?? null;

  function openEdit() {
    setPrefForm({
      language: prefsData?.language ?? "ko",
      theme: prefsData?.theme ?? "light",
    });
    setEditOpen(true);
  }

  async function handleSavePrefs() {
    if (!user) return;
    setSaving(true);
    try {
      await updatePreferences(user.id, prefForm);
    } finally {
      setSaving(false);
      setEditOpen(false);
    }
  }

  if (loading) {
    return <Card className="app-panel-strong p-6 text-[color:var(--ink-soft)]">프로필을 불러오는 중...</Card>;
  }

  const errorMessage =
    (profileQueryError ? getErrorMessage(profileQueryError, "프로필을 불러오지 못했습니다.") : "") ||
    (appError ? getErrorMessage(appError, "프로필을 불러오지 못했습니다.") : "");

  if (errorMessage) {
    return <Card className="app-panel-strong p-6 text-[color:var(--ink-soft)]">{errorMessage}</Card>;
  }

  if (!profile) {
    return (
      <Card className="app-panel-strong space-y-4 p-6 text-[color:var(--ink-soft)]">
        <p>아직 프로필 데이터가 없습니다.</p>
        {user?.id ? (
          <button
            type="button"
            onClick={async () => {
              await refreshOverview?.(user.id);
              refetchProfile();
            }}
            className="app-secondary-button"
          >
            새로고침
          </button>
        ) : null}
      </Card>
    );
  }

  const stats = profile.stats ?? [];
  const topHabits = profile.top_habits ?? [];
  const recentActivity = profile.recent_activity ?? [];
  const weeklyActivity = profile.weekly_activity ?? [];
  const goals = profile.goals ?? [];
  const achievements = profile.achievements ?? [];
  const maxProductive = Math.max(...weeklyActivity.map((item) => item.productive ?? 0), 1);
  const maxOther = Math.max(...weeklyActivity.map((item) => item.other ?? 0), 1);
  const streakStat = stats.find((item) => item.title === "Current Streak" || item.title === "현재 연속 기록");
  const memberSinceDate = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" }).format(new Date(profile.member_since));
  const heatmapDays = heatmap?.days ?? [];

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          variant="profile"
          profileIcon={User}
          title={profile.display_name}
          description={profile.summary_description}
          meta={`가입일 ${memberSinceDate}`}
        />
        <button
          type="button"
          onClick={openEdit}
          className="app-secondary-button shrink-0 text-sm"
        >
          편집
        </button>
      </div>

      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="프로필 편집"
        onConfirm={handleSavePrefs}
        confirmLabel={saving ? "저장 중..." : "저장"}
      >
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-semibold text-[color:var(--ink)]">사용자명</p>
            <p className="rounded-[0.6rem] bg-black/5 px-3 py-2 text-sm text-[color:var(--ink-soft)]">
              {user?.username}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-[color:var(--ink)]">언어</p>
            <select
              value={prefForm.language}
              onChange={(e) => setPrefForm((f) => ({ ...f, language: e.target.value }))}
              className="w-full rounded-[0.6rem] border border-[rgba(24,50,53,0.15)] bg-white px-3 py-2 text-sm"
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-[color:var(--ink)]">테마</p>
            <div className="flex gap-2">
              {["light", "dark"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPrefForm((f) => ({ ...f, theme: t }))}
                  className={`flex-1 rounded-[0.6rem] py-2 text-sm font-medium transition ${
                    prefForm.theme === t
                      ? "bg-[#0f766e] text-white"
                      : "bg-black/5 text-[color:var(--ink-soft)]"
                  }`}
                >
                  {t === "light" ? "라이트" : "다크"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {!profile.logged_today ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[1.4rem] border border-[#dd7a5f]/20 bg-[#f8e2d9] px-5 py-3.5">
          <Flame size={16} className="shrink-0 text-[#c05740]" />
          <span className="text-sm font-semibold text-[#c05740]">
            오늘 아직 기록이 없어요! 스트릭이 끊기기 전에 기록해보세요.
          </span>
          <Link to="/log" className="ml-auto text-sm font-bold text-[#c05740] underline underline-offset-2">
            기록하기 →
          </Link>
        </div>
      ) : null}

      <Card className="app-panel-strong overflow-hidden p-7 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
          <div className="space-y-4">
            <p className="app-kicker">프로필 요약</p>
            <h2 className="app-heading text-[2.3rem] leading-[1.02] text-[color:var(--ink)] sm:text-[2.9rem]">
              {profile.summary_title || (streakStat?.value ? `${streakStat.value}만큼의 모멘텀이 보여요.` : "당신의 리듬이 점점 선명해지고 있어요.")}
            </h2>
            <p className="max-w-xl text-[1rem] leading-8 text-[color:var(--ink-soft)] sm:text-[1.05rem]">{profile.summary_description}</p>

            {topHabits.length ? (
              <div className="flex flex-wrap gap-3">
                {topHabits.map((habit) => (
                  <span key={habit.tag} className="app-chip text-sm">
                    <span className="font-semibold text-[color:var(--ink-soft)]">{habit.tag}</span>
                    <span className="font-bold text-[color:var(--ink)]">{habit.count}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {stats.slice(0, 4).map((item) => (
              <div
                key={item.title}
                className="rounded-[1.5rem] border border-[rgba(24,50,53,0.08)] bg-white/66 px-4 py-5"
              >
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-[color:var(--ink-soft)]">{item.title}</p>
                <p className="mt-4 text-3xl font-bold text-[color:var(--ink)]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((item) => {
          const ui = metricUiMap[item.icon] ?? metricUiMap.trend;
          const Icon = ui.Icon;

          return (
            <Card
              key={item.title}
              title={item.title}
              value={item.value}
              icon={<Icon size={18} strokeWidth={2.2} />}
              iconClassName={ui.iconClassName}
              className="p-5"
              titleClassName="text-[0.98rem]"
              valueClassName="text-[2.2rem] sm:text-[2.35rem]"
            />
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr,0.92fr]">
        <Card className="p-6">
          <div className="space-y-7">
            <div className="space-y-2">
              <p className="app-kicker">일관성 지도</p>
              <h2 className="app-heading text-[2rem] text-[color:var(--ink)]">주간 활동</h2>
              <p className="text-[0.98rem] leading-7 text-[color:var(--ink-soft)]">
                이번 주 생산적인 순간과 기타 활동의 비율입니다.
              </p>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {weeklyActivity.map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-2">
                  <div className="flex h-28 w-full flex-col justify-end gap-1.5">
                    <div className={`w-full rounded-t-xl bg-[#0f766e] ${levelClass(item.productive, maxProductive, "h-2")}`} />
                    <div className={`w-full rounded-t-xl bg-[#ddc7bc] ${levelClass(item.other, maxOther, "h-2")}`} />
                  </div>
                  <span className="text-sm font-semibold text-[color:var(--ink-soft)]">{item.label}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-6 border-t border-[rgba(24,50,53,0.08)] pt-5">
              <div className="flex items-center gap-2 text-[0.98rem] text-[color:var(--ink-soft)]">
                <span className="h-3.5 w-3.5 rounded bg-[#0f766e]" />
                <span>생산적</span>
              </div>
              <div className="flex items-center gap-2 text-[0.98rem] text-[color:var(--ink-soft)]">
                <span className="h-3.5 w-3.5 rounded bg-[#ddc7bc]" />
                <span>기타</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-[#0f766e]" />
              <h2 className="app-heading text-[2rem] text-[color:var(--ink)]">주간 목표</h2>
            </div>

            <div className="space-y-5">
              {goals.map((goal) => (
                <div key={goal.title} className="space-y-2">
                  <div className="flex items-center justify-between gap-4 text-[1rem]">
                    <span className="font-semibold text-[color:var(--ink)]">{goal.title}</span>
                    <span className="text-[color:var(--ink-soft)]">
                      {goal.current} / {goal.total}
                    </span>
                  </div>
                  <progress
                    max={goal.total}
                    value={goal.current}
                    className={`h-2.5 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-[rgba(24,50,53,0.08)] [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:rounded-full ${progressToneClass(goal.tone)}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="app-kicker">최근 체크인</p>
              <h2 className="app-heading text-[2rem] text-[color:var(--ink)]">최근 활동</h2>
            </div>
            <span className="app-chip text-sm">{`${recentActivity.length}개`}</span>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recentActivity.map((item) => (
              <div
                key={item.id}
                className="rounded-[1.4rem] border border-[rgba(24,50,53,0.08)] bg-white/64 px-4 py-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[color:var(--ink-soft)]">{CATEGORY_KO[normalizeCategory(item.tag)] ?? item.tag}</span>
                    <span className="text-xs uppercase tracking-[0.12em] text-[color:var(--ink-soft)]">
                      {new Date(item.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="font-semibold text-[color:var(--ink)]">{item.text}</p>
                  <p className="text-sm text-[color:var(--ink-soft)]">{MOOD_KO[normalizeMood(item.emotion)] ?? item.emotion}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-5">
          <div className="space-y-1">
            <p className="app-kicker">30일 감정 기록</p>
            <h2 className="app-heading text-[2rem] text-[color:var(--ink)]">감정 히트맵</h2>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-[color:var(--ink-soft)]">
            <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#0f766e]" /><span>집중</span></div>
            <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#dd7a5f]" /><span>스트레스</span></div>
            <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#d9a85a]" /><span>중립</span></div>
            <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#e9f1ef]" /><span>없음</span></div>
          </div>

          <div className="relative grid grid-cols-10 gap-1.5">
            {hoveredDay ? (
              <div className="absolute -top-14 left-1/2 z-10 w-56 -translate-x-1/2 rounded-xl border border-[rgba(24,50,53,0.08)] bg-white/95 p-2.5 text-xs shadow-lg">
                <p className="font-semibold text-[color:var(--ink)]">{hoveredDay.date}</p>
                <p className="mt-0.5 text-[color:var(--ink-soft)]">
                  {hoveredDay.count > 0 ? `${hoveredDay.count}개 기록 · ${hoveredDay.emotionLabel}` : "기록 없음"}
                </p>
              </div>
            ) : null}
            {heatmapDays.map((day) => {
              const colorClass =
                day.dominant_emotion === "focused" ? "bg-[#0f766e]" :
                day.dominant_emotion === "stressed" ? "bg-[#dd7a5f]" :
                day.dominant_emotion === "neutral" ? "bg-[#d9a85a]" :
                "bg-[#e9f1ef]";
              const emotionLabel =
                day.dominant_emotion === "focused" ? "집중" :
                day.dominant_emotion === "stressed" ? "스트레스" :
                day.dominant_emotion === "neutral" ? "중립" : "없음";
              return (
                <button
                  type="button"
                  key={day.date}
                  onMouseEnter={() => setHoveredDay({ ...day, emotionLabel })}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={`h-7 rounded-md ${colorClass} transition-opacity hover:opacity-70`}
                />
              );
            })}
          </div>

          {heatmapDays.length > 0 ? (
            <p className="text-xs text-[color:var(--ink-soft)]">
              {heatmapDays[0].date.replace(/-/g, ".")} – {heatmapDays[heatmapDays.length - 1].date.replace(/-/g, ".")}
            </p>
          ) : null}
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-[#dd7a5f]" />
            <h2 className="app-heading text-[2rem] text-[color:var(--ink)]">업적</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {achievements.map((achievement) => {
              const ui = achievementUiMap[achievement.title] ?? achievementUiMap["First Week"];
              const Icon = ui.Icon;

              return (
                <Card key={achievement.title} className="app-panel-strong p-5">
                  <div className={`space-y-4 ${achievement.unlocked ? "" : "opacity-60"}`}>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-[1.25rem] ${ui.iconClassName}`}>
                      <Icon size={20} strokeWidth={2.1} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-[1.1rem] font-bold text-[color:var(--ink)]">{achievement.title}</h3>
                      <p className="text-[0.96rem] leading-7 text-[color:var(--ink-soft)]">{achievement.description}</p>
                    </div>
                    {achievement.unlocked ? (
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#0f766e]">
                        <CheckCircle2 size={14} />
                        <span>달성 완료</span>
                      </div>
                    ) : (
                      <div className="text-sm font-semibold text-[color:var(--ink-soft)]">진행 중</div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </Card>
    </section>
  );
}

export default ProfilePage;
