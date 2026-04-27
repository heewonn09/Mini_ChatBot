import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Clock3,
  Coffee,
  Dumbbell,
  Frown,
  Meh,
  Plus,
  Smile,
  Smartphone,
  PlayCircle,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";
import { createBehavior, fetchBehaviors } from "../api/api";

const quickActions = [
  {
    label: "YouTube",
    text: "YouTube browsing",
    tag: "YouTube",
    Icon: PlayCircle,
    className: "from-rose-500 to-pink-600",
  },
  {
    label: "Study",
    text: "Study session",
    tag: "Study",
    Icon: BookOpen,
    className: "from-blue-500 to-indigo-600",
  },
  {
    label: "Workout",
    text: "Workout",
    tag: "Exercise",
    Icon: Dumbbell,
    className: "from-emerald-500 to-teal-600",
  },
  {
    label: "Coffee Break",
    text: "Coffee break",
    tag: "Break",
    Icon: Coffee,
    className: "from-amber-500 to-orange-600",
  },
  {
    label: "Social Media",
    text: "Social media scrolling",
    tag: "Social Media",
    Icon: Smartphone,
    className: "from-fuchsia-500 to-pink-600",
  },
];

const moods = [
  { label: "Happy", value: "happy", Icon: Smile, emoji: "😊" },
  { label: "Neutral", value: "neutral", Icon: Meh, emoji: "😐" },
  { label: "Stressed", value: "stressed", Icon: Frown, emoji: "😟" },
];

function LogPage() {
  const { user, refreshOverview } = useOutletContext();
  const [text, setText] = useState("");
  const [emotion, setEmotion] = useState("neutral");
  const [tag, setTag] = useState("Study");
  const [customTime, setCustomTime] = useState(false);
  const [timeValue, setTimeValue] = useState("");
  const [list, setList] = useState([]);
  const [relativeBaseTime, setRelativeBaseTime] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchBehaviors(user.id, 8).then((data) => {
      setList(data);
      setRelativeBaseTime(Date.now());
    });
  }, [user]);

  const canSubmit = useMemo(() => text.trim().length > 0, [text]);

  const setQuickAction = (item) => {
    setText(item.text);
    setTag(item.tag);
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;

    await createBehavior(user.id, {
      text,
      emotion,
      tag,
      intensity: 6,
      created_at: customTime && timeValue ? new Date(timeValue).toISOString() : undefined,
    });

    setText("");
    setTag("Study");
    setCustomTime(false);
    setTimeValue("");

    const data = await fetchBehaviors(user.id, 8);
    setList(data);
    setRelativeBaseTime(Date.now());
    await refreshOverview();
  };

  const formatRelativeTime = (value) => {
    const diffMs = relativeBaseTime - new Date(value).getTime();
    const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffMinutes < 1440) return `${Math.round(diffMinutes / 60)} hours ago`;
    return `${Math.round(diffMinutes / 1440)} days ago`;
  };

  return (
    <section className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        variant="standard"
        title="Log Behavior"
        description="Track your activities and emotions"
      />

      <div className="space-y-4">
        <p className="text-sm font-medium text-zinc-400">Quick Add</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {quickActions.map((item) => {
            const Icon = item.Icon;

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setQuickAction(item)}
                className={`flex min-h-[5.25rem] flex-col items-center justify-center gap-2 rounded-[1.35rem] bg-gradient-to-br ${item.className} text-sm font-medium text-white shadow-lg shadow-black/20 transition hover:brightness-110`}
              >
                <Icon size={20} strokeWidth={2.1} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Card className="p-6">
        <form
          className="space-y-7"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <div className="space-y-3">
            <label htmlFor="behavior-text" className="block text-[1.05rem] font-semibold text-zinc-200">
              What did you do?
            </label>
            <input
              id="behavior-text"
              className="w-full rounded-2xl border border-zinc-700/70 bg-zinc-900/80 px-4 py-3.5 text-lg text-zinc-50 outline-none transition placeholder:text-zinc-500 focus:border-violet-400/60"
              placeholder="e.g., Studied for exam, Watched Netflix..."
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="text-[1.05rem] font-semibold text-zinc-200">How did you feel?</legend>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {moods.map((mood) => {
                const Icon = mood.Icon;
                const active = emotion === mood.value;

                return (
                  <button
                    key={mood.value}
                    type="button"
                    onClick={() => setEmotion(mood.value)}
                    className={`rounded-[1.35rem] border px-5 py-7 text-center transition ${
                      active
                        ? "border-violet-400/70 bg-violet-500/10 text-zinc-50"
                        : "border-zinc-800/90 bg-zinc-900/70 text-zinc-200 hover:border-zinc-700"
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-center text-4xl">{mood.emoji}</div>
                    <div className="flex items-center justify-center gap-2 text-lg font-medium">
                      <Icon size={18} />
                      <span>{mood.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-[1rem] text-zinc-400">
                <Clock3 size={16} />
                <span>{customTime ? "Custom time" : "Current time"}</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={customTime}
                onClick={() => setCustomTime((value) => !value)}
                className={`relative h-7 w-12 rounded-full transition ${customTime ? "bg-violet-500" : "bg-zinc-700"}`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                    customTime ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>

            {customTime ? (
              <input
                type="datetime-local"
                value={timeValue}
                onChange={(event) => setTimeValue(event.target.value)}
                className="w-full rounded-2xl border border-zinc-700/70 bg-zinc-900/80 px-4 py-3 text-zinc-50 outline-none transition focus:border-violet-400/60"
              />
            ) : null}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-[1.35rem] bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-600 px-4 py-4 text-xl font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={20} />
            <span>Log Behavior</span>
          </button>
        </form>
      </Card>

      <div className="space-y-4">
        <h2 className="text-[1.05rem] font-medium text-zinc-300">Recent Activity</h2>
        <div className="space-y-3">
          {list.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-[1.35rem] border border-zinc-800/80 bg-[#101014] px-5 py-4"
            >
              <div className="flex items-center gap-3 text-lg font-medium text-zinc-50">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    item.emotion === "happy"
                      ? "bg-emerald-400"
                      : item.emotion === "stressed"
                      ? "bg-amber-400"
                      : "bg-zinc-500"
                  }`}
                />
                <span>{item.text}</span>
              </div>
              <span className="text-base text-zinc-500">{formatRelativeTime(item.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default LogPage;
