import { useEffect, useState } from "react";
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
import { useOutletContext } from "react-router-dom";
import { fetchProfileView, getErrorMessage } from "../api/api";
import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";
import { useAppSettings } from "../context/AppSettingsContext";

const metricUiMap = {
  check: {
    Icon: CheckCircle2,
    iconClassName: "bg-[#f8ecd7] text-[#b67f20]",
  },
  calendar: {
    Icon: CalendarDays,
    iconClassName: "bg-[#def2ee] text-[#0f766e]",
  },
  flame: {
    Icon: Flame,
    iconClassName: "bg-[#f8e2d9] text-[#dd7a5f]",
  },
  trend: {
    Icon: TrendingUp,
    iconClassName: "bg-[#e7eee3] text-[#597b61]",
  },
};

const achievementUiMap = {
  "First Week": {
    Icon: Sparkles,
    iconClassName: "bg-[#def2ee] text-[#0f766e]",
  },
  "Morning Person": {
    Icon: Sunrise,
    iconClassName: "bg-[#f8ecd7] text-[#b67f20]",
  },
  "Focus Master": {
    Icon: Target,
    iconClassName: "bg-[#e7eee3] text-[#597b61]",
  },
  "Consistency King": {
    Icon: Crown,
    iconClassName: "bg-[#f8e2d9] text-[#dd7a5f]",
  },
  "Self Awareness": {
    Icon: Brain,
    iconClassName: "bg-[#def2ee] text-[#0f766e]",
  },
  "Habit Breaker": {
    Icon: ShieldCheck,
    iconClassName: "bg-[#f5dfd3] text-[#c86f56]",
  },
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
  const { t, language } = useAppSettings();
  const { user, error: appError, refreshOverview } = useOutletContext();
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      setProfileError("");

      try {
        const data = await fetchProfileView(user.id);
        if (active) {
          setProfile(data);
        }
      } catch (error) {
        if (active) {
          setProfile(null);
          setProfileError(getErrorMessage(error, "We couldn't load your profile."));
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

  if (loading) {
    return <Card className="app-panel-strong p-6 text-[color:var(--ink-soft)]">{t.profile.loading}</Card>;
  }

  const errorMessage = profileError || (appError ? getErrorMessage(appError, "We couldn't load your profile.") : "");

  if (errorMessage) {
    return <Card className="app-panel-strong p-6 text-[color:var(--ink-soft)]">{errorMessage}</Card>;
  }

  if (!profile) {
    return (
      <Card className="app-panel-strong space-y-4 p-6 text-[color:var(--ink-soft)]">
        <p>{t.profile.noData}</p>
        {user?.id ? (
          <button
            type="button"
            onClick={async () => {
              await refreshOverview?.(user.id);
              setReloadKey((value) => value + 1);
            }}
            className="app-secondary-button"
          >
            {t.common.refresh}
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
  const streakStat = stats.find((item) => item.title === "Current Streak");

  return (
    <section className="space-y-8">
      <PageHeader
        variant="profile"
        profileIcon={User}
        title={profile.display_name}
        description={profile.summary_description}
        meta={t.profile.memberSince.replace("{date}", profile.member_since)}
      />

      <Card className="app-panel-strong overflow-hidden p-7 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
          <div className="space-y-4">
            <p className="app-kicker">{t.profile.profileSummary}</p>
            <h2 className="app-heading text-[2.3rem] leading-[1.02] text-[color:var(--ink)] sm:text-[2.9rem]">
              {profile.summary_title || (streakStat?.value ? `${streakStat.value} of visible momentum.` : t.profile.fallbackMomentum)}
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              <p className="app-kicker">{t.profile.consistencyMap}</p>
              <h2 className="app-heading text-[2rem] text-[color:var(--ink)]">{t.profile.weeklyActivity}</h2>
              <p className="text-[0.98rem] leading-7 text-[color:var(--ink-soft)]">
                {t.profile.productiveVsOther}
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
                <span>{t.profile.productive}</span>
              </div>
              <div className="flex items-center gap-2 text-[0.98rem] text-[color:var(--ink-soft)]">
                <span className="h-3.5 w-3.5 rounded bg-[#ddc7bc]" />
                <span>{t.profile.other}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-[#0f766e]" />
              <h2 className="app-heading text-[2rem] text-[color:var(--ink)]">{t.profile.weeklyGoals}</h2>
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
              <p className="app-kicker">{t.profile.recentCheckins}</p>
              <h2 className="app-heading text-[2rem] text-[color:var(--ink)]">{t.profile.latestActivity}</h2>
            </div>
            <span className="app-chip text-sm">{`${recentActivity.length} ${t.common.items}`}</span>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recentActivity.map((item) => (
              <div
                key={item.id}
                className="rounded-[1.4rem] border border-[rgba(24,50,53,0.08)] bg-white/64 px-4 py-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[color:var(--ink-soft)]">{item.tag || "Other"}</span>
                    <span className="text-xs uppercase tracking-[0.12em] text-[color:var(--ink-soft)]">
                      {new Date(item.created_at).toLocaleDateString(language === "ko" ? "ko-KR" : "en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="font-semibold text-[color:var(--ink)]">{item.text}</p>
                  <p className="text-sm text-[color:var(--ink-soft)]">{item.emotion}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-[#dd7a5f]" />
            <h2 className="app-heading text-[2rem] text-[color:var(--ink)]">{t.profile.achievements}</h2>
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
                        <span>{t.profile.unlocked}</span>
                      </div>
                    ) : (
                      <div className="text-sm font-semibold text-[color:var(--ink-soft)]">{t.profile.inProgress}</div>
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
