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
import ToastContainer from "../components/ui/Toast";
import { useToast } from "../hooks/useToast";

const MAX_TEXT = 300;
import { normalizeCategory, CATEGORY_KO, MOOD_KO } from "../utils/normalize";

const defaultQuickActions = [
  {
    label: "유튜브",
    text: "YouTube browsing",
    tag: "YouTube",
    Icon: Play,
    className: "bg-[#f8e2d9] text-[#dd7a5f]",
  },
  {
    label: "공부",
    text: "Study session",
    tag: "Study",
    Icon: BookOpen,
    className: "bg-[#def2ee] text-[#0f766e]",
  },
  {
    label: "운동",
    text: "Workout",
    tag: "Exercise",
    Icon: Dumbbell,
    className: "bg-[#e7eee3] text-[#597b61]",
  },
  {
    label: "커피 브레이크",
    text: "Coffee break",
    tag: "Break",
    Icon: Coffee,
    className: "bg-[#f8ecd7] text-[#b67f20]",
  },
  {
    label: "소셜 미디어",
    text: "Social media scrolling",
    tag: "Social Media",
    Icon: Smartphone,
    className: "bg-[#f5dfd3] text-[#c86f56]",
  },
];

const MOOD_TEXT = {
  happy: { label: "행복", description: "가볍고 의욕이 있으며 리듬이 좋은 상태예요." },
  neutral: { label: "보통", description: "안정적이고 강도가 낮은 상태예요." },
  stressed: { label: "스트레스", description: "지치고 산만하거나 과부하된 상태예요." },
};

const moods = [
  { key: "happy", value: "happy", Icon: Smile, className: "bg-[#def2ee] text-[#0f766e]" },
  { key: "neutral", value: "neutral", Icon: Meh, className: "bg-[#f8ecd7] text-[#b67f20]" },
  { key: "stressed", value: "stressed", Icon: Frown, className: "bg-[#f8e2d9] text-[#dd7a5f]" },
];

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
  const { user, overview, refreshOverview } = useOutletContext();
  const { toasts, showToast, dismiss } = useToast();
  const [text, setText] = useState("");
  const [emotion, setEmotion] = useState("neutral");
  const [intensity, setIntensity] = useState(6);
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
        setLogsError(getErrorMessage(error, "최근 활동을 불러오지 못했습니다."));
      } finally {
        setLogsLoading(false);
      }
    };

    loadLogs();
  }, [user]);

  const canSubmit = useMemo(() => text.trim().length > 0 && text.length <= MAX_TEXT, [text]);

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
        intensity,
        created_at: customTime && timeValue ? new Date(timeValue).toISOString() : undefined,
      });

      setText("");
      setTag("Study");
      setEmotion("neutral");
      setIntensity(6);
      setCustomTime(false);
      setTimeValue("");

      const data = await fetchBehaviors(user.id, 8);
      setList(data);
      setRelativeBaseTime(Date.now());
      await refreshOverview();
      showToast("기록이 저장됐어요!", "success");
    } catch (error) {
      setLogsError(getErrorMessage(error, "저장하지 못했습니다. 다시 시도해주세요."));
    } finally {
      setSubmitting(false);
    }
  };

  const formatRelativeTime = (value) => {
    const diffMs = relativeBaseTime - new Date(value).getTime();
    const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

    if (diffMinutes < 60) return `${diffMinutes}분 전`;
    if (diffMinutes < 1440) return `${Math.round(diffMinutes / 60)}시간 전`;
    return `${Math.round(diffMinutes / 1440)}일 전`;
  };

  const topTag = overview?.habit_frequency?.length ? overview.habit_frequency[0].tag : null;

  return (
    <>
    <ToastContainer toasts={toasts} onDismiss={dismiss} />
    <section className="space-y-8">
      <PageHeader
        variant="standard"
        title="행동 기록"
        description={
          topTag
            ? `무슨 일이 있었고, 어떤 기분이었는지, 언제였는지 기록해보세요. 지금 가장 많이 반복된 패턴은 ${topTag}입니다.`
            : "무슨 일이 있었고, 어떤 기분이었는지, 언제였는지 기록하면 패턴 지도가 더 선명해집니다."
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
              <div className="flex items-center justify-between">
                <label htmlFor="behavior-text" className="block text-[1.02rem] font-bold text-[color:var(--ink)]">
                  무슨 일이 있었나요?
                </label>
                <span className={`text-xs font-medium tabular-nums ${text.length > MAX_TEXT ? "text-[#c86f56]" : "text-[color:var(--ink-soft)]"}`}>
                  {text.length}/{MAX_TEXT}
                </span>
              </div>
              <textarea
                id="behavior-text"
                className="app-textarea"
                placeholder="예: 한 시간 공부했고, 자기 전에는 쇼츠를 오래 봤고, 잠깐 러닝을 했어요..."
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={MAX_TEXT + 20}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-3">
                <label htmlFor="behavior-tag" className="block text-[1.02rem] font-bold text-[color:var(--ink)]">
                  카테고리
                </label>
                <div className="relative">
                  <Tag className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--ink-soft)]" size={16} />
                  <input
                    id="behavior-tag"
                    className="app-field pl-11"
                    value={tag}
                    onChange={(event) => setTag(event.target.value)}
                    placeholder="공부, 휴식, 소셜..."
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <label className="block text-[1.02rem] font-bold text-[color:var(--ink)]">시간</label>
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
                    <span>현재 시간 사용</span>
                  </div>
                )}
              </div>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-[1.02rem] font-bold text-[color:var(--ink)]">기분은 어땠나요?</legend>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {moods.map((mood) => {
                  const Icon = mood.Icon;
                  const active = emotion === mood.value;
                  const moodText = MOOD_TEXT[mood.key];

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
                        <p className="text-[1rem] font-bold text-[color:var(--ink)]">{moodText.label}</p>
                        <p className="text-sm leading-6 text-[color:var(--ink-soft)]">{moodText.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="intensity-slider" className="block text-[1.02rem] font-bold text-[color:var(--ink)]">
                  강도
                </label>
                <span className="text-sm font-bold text-[color:var(--ink)]">
                  {intensity} / 10
                </span>
              </div>
              <input
                id="intensity-slider"
                type="range"
                min={1}
                max={10}
                step={1}
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="w-full cursor-pointer accent-[#0f766e]"
              />
              <div className="flex justify-between text-xs text-[color:var(--ink-soft)]">
                <span>낮음</span>
                <span>보통</span>
                <span>높음</span>
              </div>
            </div>

            <button type="submit" disabled={!canSubmit || submitting} className="app-primary-button w-full text-lg">
              <Plus size={20} />
              <span>{submitting ? "저장 중..." : "지금 이 순간 저장"}</span>
            </button>

            {logsError ? <p className="text-sm font-medium text-[#c86f56]">{logsError}</p> : null}
          </form>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="space-y-5">
              <div className="space-y-1">
                <p className="app-kicker">빠른 기록</p>
                <h2 className="app-heading text-[2rem] text-[color:var(--ink)]">빠른 액션</h2>
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
                        <p className="text-sm opacity-80">{CATEGORY_KO[normalizeCategory(item.tag)] ?? item.tag}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-[1.55rem] border border-[rgba(24,50,53,0.08)] bg-[rgba(247,240,231,0.92)] p-5">
                <p className="app-kicker">기록 팁</p>
                <p className="mt-3 text-[1rem] leading-7 text-[color:var(--ink-soft)]">
                  짧고 솔직하게 기록하세요. 완벽한 문장보다 반복되는 작은 순간에서 더 좋은 인사이트가 나옵니다.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="app-kicker">최근 기록</p>
                  <h2 className="app-heading text-[2rem] text-[color:var(--ink)]">최근 활동</h2>
                </div>
                <span className="app-chip text-sm">{`${list.length}개 기록`}</span>
              </div>

              <div className="space-y-3">
                {logsLoading ? (
                  <div className="rounded-[1.4rem] border border-[rgba(24,50,53,0.08)] bg-white/64 px-4 py-4 text-[color:var(--ink-soft)]">
                    최근 활동을 불러오는 중...
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
                              {MOOD_KO[item.emotion] ?? item.emotion}
                            </span>
                            <span className="text-sm text-[color:var(--ink-soft)]">{CATEGORY_KO[normalizeCategory(item.tag)] ?? item.tag}</span>
                          </div>
                          <p className="font-semibold text-[color:var(--ink)]">{item.text}</p>
                        </div>
                        <span className="text-sm text-[color:var(--ink-soft)]">{formatRelativeTime(item.created_at)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.4rem] border border-[rgba(24,50,53,0.08)] bg-white/64 px-4 py-4 text-[color:var(--ink-soft)]">
                    최근 활동이 없습니다.
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
    </>
  );
}

export default LogPage;
