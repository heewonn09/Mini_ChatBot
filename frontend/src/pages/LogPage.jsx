import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  Clock3,
  Coffee,
  Dumbbell,
  Pencil,
  Play,
  Plus,
  Smartphone,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import {
  createBehavior,
  deleteBehavior,
  fetchBehaviors,
  getErrorMessage,
  updateBehavior,
} from "../api/api";
import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";
import ToastContainer from "../components/ui/Toast";
import { useToast } from "../hooks/useToast";

const MAX_TEXT = 300;
import { normalizeCategory, CATEGORY_KO, MOOD_KO } from "../utils/normalize";

const defaultQuickActions = [
  { label: "유튜브", text: "YouTube browsing", tag: "YouTube", Icon: Play, className: "bg-[#f8e2d9] text-[#dd7a5f]" },
  { label: "공부", text: "Study session", tag: "Study", Icon: BookOpen, className: "bg-[#def2ee] text-[#0f766e]" },
  { label: "운동", text: "Workout", tag: "Exercise", Icon: Dumbbell, className: "bg-[#e7eee3] text-[#597b61]" },
  { label: "커피 브레이크", text: "Coffee break", tag: "Break", Icon: Coffee, className: "bg-[#f8ecd7] text-[#b67f20]" },
  { label: "소셜 미디어", text: "Social media scrolling", tag: "Social Media", Icon: Smartphone, className: "bg-[#f5dfd3] text-[#c86f56]" },
];

const moods = [
  { key: "focused", value: "focused", emoji: "🎯", label: "집중" },
  { key: "happy", value: "happy", emoji: "😄", label: "행복" },
  { key: "calm", value: "calm", emoji: "😌", label: "차분" },
  { key: "motivated", value: "motivated", emoji: "💪", label: "의욕" },
  { key: "neutral", value: "neutral", emoji: "😐", label: "보통" },
  { key: "stressed", value: "stressed", emoji: "😰", label: "스트레스" },
  { key: "anxious", value: "anxious", emoji: "😟", label: "불안" },
  { key: "sad", value: "sad", emoji: "😢", label: "슬픔" },
];

function activityToneClass(emotion) {
  if (["happy", "focused", "calm", "motivated"].includes(emotion)) {
    return "bg-[#def2ee] text-[#0f766e]";
  }
  if (["stressed", "anxious", "sad"].includes(emotion)) {
    return "bg-[#f8e2d9] text-[#dd7a5f]";
  }
  return "bg-[#f8ecd7] text-[#b67f20]";
}

function EmojiMoodPicker({ value, onChange, compact = false }) {
  return (
    <div className={`grid grid-cols-4 ${compact ? "gap-1.5" : "gap-2"}`}>
      {moods.map((mood) => (
        <button
          key={mood.key}
          type="button"
          onClick={() => onChange(mood.value)}
          className={`flex flex-col items-center gap-1 rounded-[1.1rem] px-2 py-2 transition ${
            value === mood.value
              ? "bg-white shadow-[var(--shadow-sm)] scale-105"
              : "bg-white/40 hover:bg-white/70"
          }`}
        >
          <span className={compact ? "text-lg leading-none" : "text-2xl leading-none"}>{mood.emoji}</span>
          <span className={`font-semibold text-[color:var(--ink)] ${compact ? "text-[0.65rem]" : "text-xs"}`}>
            {mood.label}
          </span>
        </button>
      ))}
    </div>
  );
}

function LogPage() {
  const { user, overview, refreshOverview } = useOutletContext();
  const { toasts, showToast, dismiss } = useToast();
  const [text, setText] = useState("");
  const [emotion, setEmotion] = useState("neutral");
  const [intensity, setIntensity] = useState(6);
  const [tag, setTag] = useState("Study");
  const [tagFocused, setTagFocused] = useState(false);
  const [customTime, setCustomTime] = useState(false);
  const [timeValue, setTimeValue] = useState("");
  const [list, setList] = useState([]);
  const [relativeBaseTime, setRelativeBaseTime] = useState(0);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ text: "", emotion: "neutral", tag: "" });
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set());

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

  const knownTags = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const t of [
      ...(overview?.habit_frequency ?? []).map((i) => i.tag),
      ...list.map((i) => i.tag),
    ]) {
      if (!t) continue;
      const lower = t.trim().toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(t.trim());
      }
    }
    return result;
  }, [overview, list]);

  const tagSuggestions = useMemo(() => {
    const query = tag.trim().toLowerCase();
    if (!query) return knownTags.slice(0, 8);
    return knownTags
      .filter((t) => t.toLowerCase().includes(query) && t.toLowerCase() !== query)
      .slice(0, 6);
  }, [knownTags, tag]);

  const quickActions = useMemo(() => {
    const presets = new Map(defaultQuickActions.map((item) => [item.tag.toLowerCase(), item]));
    const dynamicTags = [
      ...(overview?.habit_frequency ?? []).map((item) => item.tag),
      ...list.map((item) => item.tag),
    ]
      .filter(Boolean)
      .filter((t, index, arr) => arr.findIndex((v) => v.toLowerCase() === t.toLowerCase()) === index);

    const resolved = dynamicTags
      .map((t) => {
        const preset = presets.get(t.toLowerCase());
        if (preset) return preset;
        return { label: t, text: `${t} session`, tag: t, Icon: Tag, className: "bg-[#f5efe5] text-[#7b6758]" };
      })
      .slice(0, 5);

    if (resolved.length < 5) {
      for (const item of defaultQuickActions) {
        if (resolved.find((e) => e.tag.toLowerCase() === item.tag.toLowerCase())) continue;
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

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ text: item.text, emotion: item.emotion, tag: item.tag ?? "" });
    setEditError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError("");
  };

  const handleEdit = async (id) => {
    if (!editForm.text.trim()) return;
    setSavingEdit(true);
    setEditError("");
    try {
      const updated = await updateBehavior(user.id, id, {
        text: editForm.text,
        emotion: editForm.emotion,
        tag: editForm.tag,
      });
      setList((prev) => prev.map((item) => (item.id === id ? updated : item)));
      setEditingId(null);
      await refreshOverview();
    } catch (error) {
      setEditError(getErrorMessage(error, "수정하지 못했습니다."));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await deleteBehavior(user.id, id);
      setList((prev) => prev.filter((item) => item.id !== id));
      await refreshOverview();
    } catch (error) {
      setLogsError(getErrorMessage(error, "삭제하지 못했습니다."));
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
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
                  <Tag
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--ink-soft)]"
                    size={16}
                  />
                  <input
                    id="behavior-tag"
                    className="app-field pl-11"
                    value={tag}
                    onChange={(event) => setTag(event.target.value)}
                    placeholder="공부, 휴식, 소셜..."
                    onFocus={() => setTagFocused(true)}
                    onBlur={() => setTimeout(() => setTagFocused(false), 150)}
                  />
                  {tagFocused && tagSuggestions.length > 0 ? (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-[1.1rem] border border-[rgba(24,50,53,0.10)] bg-white shadow-lg">
                      {tagSuggestions.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setTag(t);
                            setTagFocused(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm font-semibold text-[color:var(--ink)] hover:bg-[#def2ee] transition"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <label className="block text-[1.02rem] font-bold text-[color:var(--ink)]">시간</label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={customTime}
                    onClick={() => setCustomTime((v) => !v)}
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
              <EmojiMoodPicker value={emotion} onChange={setEmotion} />
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
                  list.map((item) =>
                    editingId === item.id ? (
                      <div
                        key={item.id}
                        className="space-y-3 rounded-[1.4rem] border border-[rgba(24,50,53,0.08)] bg-white/90 px-4 py-4"
                      >
                        <textarea
                          className="app-textarea text-sm"
                          rows={2}
                          value={editForm.text}
                          onChange={(e) => setEditForm((f) => ({ ...f, text: e.target.value }))}
                        />
                        <EmojiMoodPicker
                          value={editForm.emotion}
                          onChange={(v) => setEditForm((f) => ({ ...f, emotion: v }))}
                          compact
                        />
                        <input
                          className="app-field text-sm"
                          value={editForm.tag}
                          onChange={(e) => setEditForm((f) => ({ ...f, tag: e.target.value }))}
                          placeholder="카테고리"
                        />
                        {editError ? <p className="text-xs font-medium text-[#c86f56]">{editError}</p> : null}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(item.id)}
                            disabled={!editForm.text.trim() || savingEdit}
                            className="app-primary-button h-10 flex-1 text-sm"
                          >
                            <Check size={14} />
                            <span>{savingEdit ? "저장 중..." : "저장"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="app-secondary-button h-10 px-4 text-sm"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={item.id}
                        className="rounded-[1.4rem] border border-[rgba(24,50,53,0.08)] bg-white/64 px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] ${activityToneClass(item.emotion)}`}
                              >
                                {MOOD_KO[item.emotion] ?? item.emotion}
                              </span>
                              <span className="text-sm text-[color:var(--ink-soft)]">
                                {CATEGORY_KO[normalizeCategory(item.tag)] ?? item.tag}
                              </span>
                              <span className="ml-auto text-sm text-[color:var(--ink-soft)]">
                                {formatRelativeTime(item.created_at)}
                              </span>
                            </div>
                            <p className="font-semibold text-[color:var(--ink)]">{item.text}</p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              className="flex h-8 w-8 items-center justify-center rounded-[0.75rem] bg-white/60 text-[color:var(--ink-soft)] transition hover:bg-white"
                              title="수정"
                            >
                              <Pencil size={14} strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              disabled={deletingIds.has(item.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-[0.75rem] bg-white/60 text-[#dd7a5f] transition hover:bg-white disabled:opacity-40"
                              title="삭제"
                            >
                              <Trash2 size={14} strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  )
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
