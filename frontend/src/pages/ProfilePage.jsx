import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Flame,
  Target,
  Trophy,
  TrendingUp,
  User,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";
import { fetchProfileView } from "../api/api";

const metricUiMap = {
  check: {
    Icon: CheckCircle2,
    iconClassName: "bg-blue-500/10 text-blue-400",
  },
  calendar: {
    Icon: CalendarDays,
    iconClassName: "bg-emerald-500/10 text-emerald-400",
  },
  flame: {
    Icon: Flame,
    iconClassName: "bg-orange-500/10 text-orange-400",
  },
  trend: {
    Icon: TrendingUp,
    iconClassName: "bg-violet-500/10 text-violet-400",
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
    ? "[&::-webkit-progress-value]:bg-orange-500 [&::-moz-progress-bar]:bg-orange-500"
    : "[&::-webkit-progress-value]:bg-teal-400 [&::-moz-progress-bar]:bg-teal-400";
}

function ProfilePage() {
  const { user, overview, loading: appLoading, error: appError, refreshOverview } = useOutletContext();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setProfileError("");
        const data = await fetchProfileView(user.id);
        if (active) {
          setProfile(data);
        }
      } catch {
        if (active) {
          setProfileError("Unable to load profile data.");
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
  }, [user]);

  if (appLoading || loading) {
    return <Card className="p-6 text-zinc-300">Loading profile...</Card>;
  }

  if (appError || profileError) {
    const errorMessage =
      typeof appError === "string"
        ? appError
        : appError?.message || profileError;

    return <Card className="p-6 text-zinc-300">{errorMessage}</Card>;
  }

  if (!profile) {
    return (
      <Card className="space-y-4 p-6 text-zinc-300">
        <p>No profile data available yet.</p>
        {user?.id ? (
          <button
            type="button"
            onClick={() => refreshOverview?.(user.id)}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
          >
            Refresh
          </button>
        ) : null}
      </Card>
    );
  }

  const stats = profile?.stats ?? [];
  const weeklyActivity = profile?.weekly_activity ?? [];
  const goals = profile?.goals ?? [];
  const achievements = profile?.achievements ?? [];
  const maxProductive = Math.max(...weeklyActivity.map((item) => item.productive ?? 0), 1);
  const maxOther = Math.max(...weeklyActivity.map((item) => item.other ?? 0), 1);

  return (
    <section className="space-y-8">
      <PageHeader
        variant="profile"
        profileIcon={User}
        title={profile?.display_name ?? overview?.username ?? "Profile"}
        meta={profile?.member_since ? `Member since ${profile.member_since}` : ""}
      />

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
              titleClassName="text-[0.98rem] text-zinc-500"
              valueClassName="text-[2.15rem] sm:text-[2.25rem]"
            />
          );
        })}
      </div>

      <Card className="p-6">
        <div className="space-y-7">
          <div className="space-y-2">
            <h2 className="text-[1.2rem] font-bold text-zinc-50">Weekly Activity</h2>
            <p className="text-[0.98rem] text-zinc-500">Your behavior tracking consistency</p>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weeklyActivity.map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2">
                <div className="flex h-28 w-full flex-col justify-end gap-1.5">
                  <div className={`w-full rounded-t-xl bg-emerald-400 ${levelClass(item.productive, maxProductive, "h-2")}`} />
                  <div className={`w-full rounded-t-xl bg-zinc-600 ${levelClass(item.other, maxOther, "h-2")}`} />
                </div>
                <span className="text-sm text-zinc-500">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-6 border-t border-zinc-800 pt-5">
            <div className="flex items-center gap-2 text-[0.98rem] text-zinc-400">
              <span className="h-3.5 w-3.5 rounded bg-emerald-400" />
              <span>Productive</span>
            </div>
            <div className="flex items-center gap-2 text-[0.98rem] text-zinc-400">
              <span className="h-3.5 w-3.5 rounded bg-zinc-600" />
              <span>Other</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-indigo-400" />
            <h2 className="text-[1.2rem] font-bold text-zinc-50">Weekly Goals</h2>
          </div>

          <div className="space-y-5">
            {goals.map((goal) => (
              <div key={goal.title} className="space-y-2">
                <div className="flex items-center justify-between gap-4 text-[1rem]">
                  <span className="font-medium text-zinc-50">{goal.title}</span>
                  <span className="text-zinc-400">
                    {goal.current} / {goal.total}
                  </span>
                </div>
                <progress
                  max={goal.total}
                  value={goal.current}
                  className={`h-2.5 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-zinc-800 [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:rounded-full ${progressToneClass(goal.tone)}`}
                />
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-indigo-400" />
            <h2 className="text-[1.2rem] font-bold text-zinc-50">Achievements</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {achievements.map((achievement) => (
              <Card key={achievement.title} className="p-5">
                <div className={`space-y-3 ${achievement.unlocked ? "" : "opacity-60"}`}>
                  <div className="text-4xl">{achievement.icon}</div>
                  <div className="space-y-1">
                    <h3 className="text-[1.1rem] font-bold text-zinc-50">{achievement.title}</h3>
                    <p className="text-[0.96rem] text-zinc-500">{achievement.description}</p>
                  </div>
                  {achievement.unlocked ? (
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                      <CheckCircle2 size={14} />
                      <span>Unlocked</span>
                    </div>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>
    </section>
  );
}

export default ProfilePage;
