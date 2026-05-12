import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Clock3,
  Coffee,
  Dumbbell,
  Frown,
  Meh,
  Play,
  Plus,
  Smile,
  Smartphone,
  Tag,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { createBehavior, fetchBehaviors, getErrorMessage } from "../api/api";
import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";
import { useAppSettings } from "../context/AppSettingsContext";

const defaultQuickActions = [
  {
    label: "YouTube",
    text: "YouTube browsing",
    tag: "YouTube",
    Icon: Play,
    className: "bg-[#f8e2d9] text-[#dd7a5f]",
  },
  {
    label: "Study",
    text: "Study session",
    tag: "Study",
    Icon: BookOpen,
    className: "bg-[#def2ee] text-[#0f766e]",
  },
  {
    label: "Workout",
    text: "Workout",
    tag: "Exercise",
    Icon: Dumbbell,
    className: "bg-[#e7eee3] text-[#597b61]",
  },
  {
    label: "Coffee Break",
    text: "Coffee break",
    tag: "Break",
    Icon: Coffee,
    className: "bg-[#f8ecd7] text-[#b67f20]",
  },
  {
    label: "Social Media",
    text: "Social media scrolling",
    tag: "Social Media",
    Icon: Smartphone,
    className: "bg-[#f5dfd3] text-[#c86f56]",
  },
];

const moods = [
  {
    key: "happy",
    value: "happy",
    Icon: Smile,
    className: "bg-[#def2ee] text-[#0f766e]",
  },
  {
    key: "neutral",
    value: "neutral",
    Icon: Meh,
    className: "bg-[#f8ecd7] text-[#b67f20]",
  },
  {
    key: "stressed",
    value: "stressed",
    Icon: Frown,
    className: "bg-[#f8e2d9] text-[#dd7a5f]",
  },
];

function getMoodText(t, key) {
  if (key === "happy") return { label: t.log.moodHappy, description: t.log.moodHappyDesc };
  if (key === "neutral") return { label: t.log.moodNeutral, description: t.log.moodNeutralDesc };
  return { label: t.log.moodStressed, description: t.log.moodStressedDesc };
}

function toCode(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function activityToneClass(emotion) {
  if (emotion === "happy" || emotion === "focused" || emotion === "motivated") {
    return "bg-[#def2ee] text-[#0f766e]";
  }
  if (emotion === "stressed" || emotion === "anxious" || emotion === "sad") {
    return "bg-[#f8e2d9] text-[#dd7a5f]";
  }
  return "bg-[#f8ecd7] text-[#b67f20]";
}

function LogPage() {
  const { t } = useAppSettings();
  const { user, overview, refreshOverview } = useOutletContext();
  const [text, setText] = useState("");
  const [emotion, setEmotion] = useState("neutral");
  const [tag, setTag] = useState("Study");
  const [customTime, setCustomTime] = useState(false);
  const [timeValue, setTimeValue] = useState("");
  const [list, setList] = useState([]);
  const [relativeBaseTime, setRelativeBaseTime] = useState(0);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadLogs = async () => {
      setLogsLoading(true);
      setLogsError("");

      try {
        const data = await fetchBehaviors(user.id, 8);
        setList(data);
        setRelativeBaseTime(Date.now());
      } catch (error) {
        setLogsError(getErrorMessage(error, t("log.loadError")));
      } finally {
        setLogsLoading(false);
      }
    };

    loadLogs();
  }, [user]);

  const canSubmit = useMemo(() => text.trim().length > 0, [text]);

  const quickActions = useMemo(() => {
    const presets = new Map(defaultQuickActions.map((item) => [item.tag.toLowerCase(), item]));
    const dynamicTags = [
      ...(overview?.habit_frequency ?? []).map((item) => item.tag),
      ...list.map((item) => item.tag),
    ]
      .filter(Boolean)
      .filter((tag, index, array) => array.findIndex((value) => value.toLowerCase() === tag.toLowerCase()) === index);

    const resolved = dynamicTags
      .map((tag) => {
        const preset = presets.get(tag.toLowerCase());
        if (preset) return preset;

        return {
          label: tag,
          text: `${tag} session`,
          tag,
          Icon: Tag,
          className: "bg-[#f5efe5] text-[#7b6758]",
        };
      })
      .slice(0, 5);

    if (resolved.length < 5) {
      for (const item of defaultQuickActions) {
        if (resolved.find((entry) => entry.tag.toLowerCase() === item.tag.toLowerCase())) continue;
        resolved.push(item);
        if (resolved.length === 5) break;
      }
    }

    return resolved;
  }, [list, overview]);

  const setQuickAction = (item) => {
    setText(item.text);
    setTag(item.tag);
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;

    setSubmitting(true);
    setLogsError("");

    try {
      await createBehavior(user.id, {
        text,
        emotion,
        tag,
        intensity: 6,
        created_at: customTime && timeValue ? new Date(timeValue).toISOString() : undefined,
      });

      setText("");
      setTag("Study");
      setEmotion("neutral");
      setCustomTime(false);
      setTimeValue("");

      const data = await fetchBehaviors(user.id, 8);
      setList(data);
      setRelativeBaseTime(Date.now());
      await refreshOverview();
    } catch (error) {
      setLogsError(getErrorMessage(error, t("log.saveError")));
    } finally {
      setSubmitting(false);
    }
  };

  const formatRelativeTime = (value) => {
    const diffMs = relativeBaseTime - new Date(value).getTime();
    const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffMinutes < 1440) return `${Math.round(diffMinutes / 60)} hours ago`;
    return `${Math.round(diffMinutes / 1440)} days ago`;
  };

  return (
    <section className="space-y-8">
      <PageHeader
        variant="standard"
        title={t.log.title}
        description={
          overview?.habit_frequency?.length
            ? t.log.descriptionWithTag.replace("{tag}", overview.habit_frequency[0].tag)
            : t.log.descriptionDefault
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <Card className="app-panel-strong p-7">
          <form
            className="space-y-7"
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
          >
            <div className="space-y-3">
              <label htmlFor="behavior-text" className="block text-[1.02rem] font-bold text-[color:var(--ink)]">
                {t.log.whatHappened}
              </label>
              <textarea
                id="behavior-text"
                className="app-textarea"
                placeholder={t.log.happenedPlaceholder}
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-3">
                <label htmlFor="behavior-tag" className="block text-[1.02rem] font-bold text-[color:var(--ink)]">
                  {t.log.category}
                </label>
                <div className="relative">
                  <Tag className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--ink-soft)]" size={16} />
                  <input
                    id="behavior-tag"
                    className="app-field pl-11"
                    value={tag}
                    onChange={(event) => setTag(event.target.value)}
                    placeholder={t.log.categoryPlaceholder}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <label className="block text-[1.02rem] font-bold text-[color:var(--ink)]">{t.log.time}</label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={customTime}
                    onClick={() => setCustomTime((value) => !value)}
                    className={`relative h-8 w-14 rounded-full transition ${
                      customTime ? "bg-[#0f766e]" : "bg-[rgba(24,50,53,0.18)]"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${
                        customTime ? "left-7" : "left-1"
                      }`}
                    />
                  </button>
                </div>

                {customTime ? (
                  <input
                    type="datetime-local"
                    value={timeValue}
                    onChange={(event) => setTimeValue(event.target.value)}
                    className="app-field"
                  />
                ) : (
                  <div className="app-field flex items-center gap-3 text-[color:var(--ink-soft)]">
                    <Clock3 size={16} />
                    <span>{t.log.useCurrentTime}</span>
                  </div>
                )}
              </div>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-[1.02rem] font-bold text-[color:var(--ink)]">{t.log.moodQuestion}</legend>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {moods.map((mood) => {
                  const Icon = mood.Icon;
                  const active = emotion === mood.value;

                  return (
                    <button
                      key={mood.value}
                      type="button"
                      onClick={() => setEmotion(mood.value)}
                      className={`rounded-[1.55rem] border px-4 py-5 text-left transition ${
                        active
                          ? "border-transparent bg-white shadow-[var(--shadow-sm)]"
                          : "border-[rgba(24,50,53,0.08)] bg-white/54 hover:bg-white/76"
                      }`}
                    >
                      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-[1.1rem] ${mood.className}`}>
                        <Icon size={18} strokeWidth={2.1} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[1rem] font-bold text-[color:var(--ink)]">{getMoodText(t, mood.key).label}</p>
                        <p className="text-sm leading-6 text-[color:var(--ink-soft)]">{getMoodText(t, mood.key).description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <button type="submit" disabled={!canSubmit || submitting} className="app-primary-button w-full text-lg">
              <Plus size={20} />
              <span>{submitting ? t.log.saving : t.log.saveMoment}</span>
            </button>

            {logsError ? <p className="text-sm font-medium text-[#c86f56]">{logsError}</p> : null}
          </form>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="space-y-5">
              <div className="space-y-1">
                <p className="app-kicker">{t.log.fastCapture}</p>
                <h2 className="app-heading text-[2rem] text-[color:var(--ink)]">{t.log.quickActions}</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((item) => {
                  const Icon = item.Icon;

                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setQuickAction(item)}
                      className={`flex min-h-[6rem] flex-col items-start justify-between rounded-[1.45rem] px-4 py-4 text-left transition hover:-translate-y-0.5 ${item.className}`}
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-white/65">
                        <Icon size={18} strokeWidth={2.2} />
                      </span>
                      <div className="space-y-1">
                        <p className="text-[1rem] font-bold">{item.label}</p>
                        <p className="text-sm opacity-80">{t(`categories.${toCode(item.tag)}`)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-[1.55rem] border border-[rgba(24,50,53,0.08)] bg-[rgba(247,240,231,0.92)] p-5">
                <p className="app-kicker">{t.log.trackingTip}</p>
                <p className="mt-3 text-[1rem] leading-7 text-[color:var(--ink-soft)]">
                  {t.log.trackingTipDesc}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="app-kicker">{t.log.latestEntries}</p>
                  <h2 className="app-heading text-[2rem] text-[color:var(--ink)]">{t.log.recentActivity}</h2>
                </div>
                <span className="app-chip text-sm">{`${list.length} ${t.log.logs}`}</span>
              </div>

              <div className="space-y-3">
                {logsLoading ? (
                  <div className="rounded-[1.4rem] border border-[rgba(24,50,53,0.08)] bg-white/64 px-4 py-4 text-[color:var(--ink-soft)]">
                    {t.log.loadingRecent}
                  </div>
                ) : list.length ? (
                  list.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[1.4rem] border border-[rgba(24,50,53,0.08)] bg-white/64 px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] ${activityToneClass(item.emotion)}`}>
                              {t(`mood.${toCode(item.emotion)}`)}
                            </span>
                            <span className="text-sm text-[color:var(--ink-soft)]">{t(`categories.${toCode(item.tag)}`)}</span>
                          </div>
                          <p className="font-semibold text-[color:var(--ink)]">{item.text}</p>
                        </div>
                        <span className="text-sm text-[color:var(--ink-soft)]">{formatRelativeTime(item.created_at)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.4rem] border border-[rgba(24,50,53,0.08)] bg-white/64 px-4 py-4 text-[color:var(--ink-soft)]">
                    {t.log.noRecent}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

export default LogPage;
