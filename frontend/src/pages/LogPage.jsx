import { useEffect, useMemo, useState } from "react";
import {
  BookOpen, Check, Clock3, Coffee, Dumbbell, Flame,
  Music, Pencil, Plus, Smartphone, Sparkles, Tag,
  Trash2, TrendingUp, X, Zap,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import {
  createBehavior, deleteBehavior, fetchBehaviors,
  getErrorMessage, updateBehavior,
} from "../api/api";
import ToastContainer from "../components/ui/Toast";
import { useToast } from "../hooks/useToast";
import { normalizeCategory, CATEGORY_KO, MOOD_KO } from "../utils/normalize";

const MAX_TEXT = 300;

// ── Emotion config ────────────────────────────────────────────────────────────
const MOODS = [
  { key: "focused",   emoji: "🎯", label: "집중",      bg: "bg-blue-50",   ring: "ring-blue-300",   text: "text-blue-700",   dot: "bg-blue-400" },
  { key: "happy",     emoji: "😄", label: "행복",      bg: "bg-amber-50",  ring: "ring-amber-300",  text: "text-amber-700",  dot: "bg-amber-400" },
  { key: "calm",      emoji: "😌", label: "차분",      bg: "bg-teal-50",   ring: "ring-teal-300",   text: "text-teal-700",   dot: "bg-teal-400" },
  { key: "motivated", emoji: "💪", label: "의욕",      bg: "bg-violet-50", ring: "ring-violet-300", text: "text-violet-700", dot: "bg-violet-400" },
  { key: "neutral",   emoji: "😐", label: "보통",      bg: "bg-slate-50",  ring: "ring-slate-300",  text: "text-slate-600",  dot: "bg-slate-400" },
  { key: "stressed",  emoji: "😰", label: "스트레스",  bg: "bg-orange-50", ring: "ring-orange-300", text: "text-orange-700", dot: "bg-orange-400" },
  { key: "anxious",   emoji: "😟", label: "불안",      bg: "bg-rose-50",   ring: "ring-rose-300",   text: "text-rose-700",   dot: "bg-rose-400" },
  { key: "sad",       emoji: "😢", label: "슬픔",      bg: "bg-indigo-50", ring: "ring-indigo-300", text: "text-indigo-600", dot: "bg-indigo-400" },
];

const moodMap = Object.fromEntries(MOODS.map((m) => [m.key, m]));

// ── Behavior categories ───────────────────────────────────────────────────────
const QUICK_CATS = [
  { tag: "Study",       label: "공부",    emoji: "📚", color: "from-teal-400 to-emerald-500" },
  { tag: "Exercise",    label: "운동",    emoji: "🏃", color: "from-orange-400 to-amber-500" },
  { tag: "YouTube",     label: "유튜브",  emoji: "▶️", color: "from-red-400 to-rose-500" },
  { tag: "Break",       label: "휴식",    emoji: "☕", color: "from-amber-400 to-yellow-500" },
  { tag: "Social Media",label: "소셜",    emoji: "📱", color: "from-purple-400 to-violet-500" },
  { tag: "Work",        label: "업무",    emoji: "💼", color: "from-blue-400 to-indigo-500" },
  { tag: "Reading",     label: "독서",    emoji: "📖", color: "from-green-400 to-teal-500" },
  { tag: "Music",       label: "음악",    emoji: "🎵", color: "from-pink-400 to-rose-500" },
];
const QUICK_MAP = Object.fromEntries(QUICK_CATS.map((c) => [c.tag.toLowerCase(), c]));

// ── Intensity helpers ─────────────────────────────────────────────────────────
function intensityColor(val) {
  if (val <= 3) return "from-emerald-400 to-green-500";
  if (val <= 6) return "from-amber-400 to-orange-500";
  return "from-orange-500 to-red-500";
}
function intensityLabel(val) {
  if (val <= 3) return "낮음";
  if (val <= 6) return "보통";
  if (val <= 8) return "높음";
  return "매우 높음";
}

// ── MoodPicker ────────────────────────────────────────────────────────────────
function MoodPicker({ value, onChange, compact = false }) {
  return (
    <div className={`grid grid-cols-4 ${compact ? "gap-2" : "gap-3"}`}>
      {MOODS.map((m) => {
        const selected = value === m.key;
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => onChange(m.key)}
            className={`
              flex flex-col items-center rounded-2xl border-2 transition-all duration-200
              ${compact ? "gap-1 py-2 px-1" : "gap-2 py-3 px-2"}
              ${selected
                ? `${m.bg} border-current ${m.text} shadow-md scale-105`
                : "bg-white/50 border-transparent hover:bg-white hover:shadow-sm hover:scale-102"
              }
            `}
          >
            <span className={compact ? "text-xl" : "text-2xl"}>{m.emoji}</span>
            <span className={`font-semibold leading-none ${compact ? "text-[0.65rem]" : "text-xs"} ${selected ? m.text : "text-slate-500"}`}>
              {m.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── IntensityBar ──────────────────────────────────────────────────────────────
function IntensityBar({ value, onChange }) {
  const pct = ((value - 1) / 9) * 100;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-600">강도</span>
        <div className={`flex items-center gap-2 rounded-full bg-gradient-to-r px-3 py-1 text-white text-sm font-bold ${intensityColor(value)}`}>
          <Zap size={12} />
          <span>{value} / 10 · {intensityLabel(value)}</span>
        </div>
      </div>
      <div className="relative h-3 rounded-full bg-slate-100">
        <div
          className={`absolute left-0 top-0 h-3 rounded-full bg-gradient-to-r transition-all duration-200 ${intensityColor(value)}`}
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={1} max={10} step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      <div className="flex justify-between text-[0.7rem] font-medium text-slate-400">
        <span>낮음</span><span>보통</span><span>높음</span>
      </div>
    </div>
  );
}

// ── LogCard ───────────────────────────────────────────────────────────────────
function LogCard({ item, editingId, editForm, setEditForm, editError, savingEdit,
  startEdit, cancelEdit, handleEdit, handleDelete, deletingIds, formatRelativeTime }) {
  const mood = moodMap[item.emotion] ?? moodMap.neutral;
  const catInfo = QUICK_MAP[item.tag?.toLowerCase()] ?? null;

  if (editingId === item.id) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-md space-y-4">
        <textarea
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-teal-300"
          rows={2}
          value={editForm.text}
          onChange={(e) => setEditForm((f) => ({ ...f, text: e.target.value }))}
        />
        <MoodPicker value={editForm.emotion} onChange={(v) => setEditForm((f) => ({ ...f, emotion: v }))} compact />
        <input
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
          value={editForm.tag}
          onChange={(e) => setEditForm((f) => ({ ...f, tag: e.target.value }))}
          placeholder="카테고리"
        />
        {editError && <p className="text-xs text-rose-500 font-medium">{editError}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleEdit(item.id)}
            disabled={!editForm.text.trim() || savingEdit}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-500 py-2.5 text-sm font-bold text-white transition hover:bg-teal-600 disabled:opacity-50"
          >
            <Check size={14} />{savingEdit ? "저장 중..." : "저장"}
          </button>
          <button type="button" onClick={cancelEdit}
            className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-500 transition hover:bg-slate-50"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      {/* color accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-3xl ${mood.dot}`} />

      <div className="flex items-start gap-4 pl-3">
        {/* emotion bubble */}
        <div className={`shrink-0 flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${mood.bg}`}>
          {mood.emoji}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${mood.bg} ${mood.text}`}>
              {mood.label}
            </span>
            {catInfo
              ? <span className="text-xs font-semibold text-slate-500">{catInfo.emoji} {catInfo.label}</span>
              : item.tag && <span className="text-xs font-semibold text-slate-500">#{item.tag}</span>
            }
            {item.intensity && (
              <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                <Zap size={10} />{item.intensity}/10
              </span>
            )}
            <span className="ml-auto text-xs text-slate-400">{formatRelativeTime(item.created_at)}</span>
          </div>
          <p className="text-sm font-medium text-slate-700 leading-relaxed">{item.text}</p>
        </div>

        {/* action buttons — visible on hover */}
        <div className="flex shrink-0 flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={() => startEdit(item)}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-400 transition hover:bg-teal-100 hover:text-teal-600"
          >
            <Pencil size={13} />
          </button>
          <button type="button" onClick={() => handleDelete(item.id)}
            disabled={deletingIds.has(item.id)}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-400 transition hover:bg-rose-100 hover:text-rose-500 disabled:opacity-40"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
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
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ text: "", emotion: "neutral", tag: "" });
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [logsError, setLogsError] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLogsLoading(true);
      try {
        const data = await fetchBehaviors(user.id, 12);
        setList(data);
        setRelativeBaseTime(Date.now());
      } catch (e) {
        setLogsError(getErrorMessage(e, "불러오지 못했습니다."));
      } finally { setLogsLoading(false); }
    };
    load();
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
      if (!seen.has(lower)) { seen.add(lower); result.push(t.trim()); }
    }
    return result;
  }, [overview, list]);

  const tagSuggestions = useMemo(() => {
    const q = tag.trim().toLowerCase();
    if (!q) return knownTags.slice(0, 6);
    return knownTags.filter((t) => t.toLowerCase().includes(q) && t.toLowerCase() !== q).slice(0, 5);
  }, [knownTags, tag]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await createBehavior(user.id, {
        text, emotion, tag, intensity,
        created_at: customTime && timeValue ? new Date(timeValue).toISOString() : undefined,
      });
      setText(""); setTag("Study"); setEmotion("neutral"); setIntensity(6);
      setCustomTime(false); setTimeValue("");
      const data = await fetchBehaviors(user.id, 12);
      setList(data);
      setRelativeBaseTime(Date.now());
      await refreshOverview();
      showToast("기록이 저장됐어요! ✨", "success");
    } catch (e) {
      showToast(getErrorMessage(e, "저장하지 못했습니다."), "error");
    } finally { setSubmitting(false); }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ text: item.text, emotion: item.emotion ?? "neutral", tag: item.tag ?? "" });
    setEditError("");
  };
  const cancelEdit = () => { setEditingId(null); setEditError(""); };
  const handleEdit = async (id) => {
    if (!editForm.text.trim()) return;
    setSavingEdit(true); setEditError("");
    try {
      const updated = await updateBehavior(user.id, id, editForm);
      setList((prev) => prev.map((i) => (i.id === id ? updated : i)));
      setEditingId(null);
      await refreshOverview();
    } catch (e) { setEditError(getErrorMessage(e, "수정하지 못했습니다.")); }
    finally { setSavingEdit(false); }
  };
  const handleDelete = async (id) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await deleteBehavior(user.id, id);
      setList((prev) => prev.filter((i) => i.id !== id));
      await refreshOverview();
      showToast("기록을 삭제했어요.", "info");
    } catch (e) { showToast(getErrorMessage(e, "삭제하지 못했습니다."), "error"); }
    finally {
      setDeletingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const formatRelativeTime = (value) => {
    const diff = relativeBaseTime - new Date(value).getTime();
    const mins = Math.max(1, Math.round(diff / 60000));
    if (mins < 60) return `${mins}분 전`;
    if (mins < 1440) return `${Math.round(mins / 60)}시간 전`;
    return `${Math.round(mins / 1440)}일 전`;
  };

  // quick stat from overview
  const streakDays = overview?.stat_cards?.find((s) => s.icon === "flame")?.value ?? "0";
  const todayCount = list.filter((i) => {
    const d = new Date(i.created_at); const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  }).length;

  const selectedMood = moodMap[emotion] ?? moodMap.neutral;

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <div className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-600 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-teal-100">
              <Sparkles size={16} />
              <span className="text-sm font-semibold uppercase tracking-wider">행동 기록</span>
            </div>
            <h1 className="text-3xl font-black leading-tight">
              오늘의 순간을<br />기록해보세요
            </h1>
            <p className="mt-2 text-teal-100 text-sm">작고 솔직한 기록이 쌓여 인사이트가 됩니다.</p>
          </div>

          {/* stat chips */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center rounded-2xl bg-white/15 px-5 py-4 backdrop-blur-sm">
              <Flame size={20} className="mb-1 text-amber-300" />
              <span className="text-2xl font-black">{streakDays}</span>
              <span className="text-xs text-teal-100">연속</span>
            </div>
            <div className="flex flex-col items-center rounded-2xl bg-white/15 px-5 py-4 backdrop-blur-sm">
              <TrendingUp size={20} className="mb-1 text-green-300" />
              <span className="text-2xl font-black">{todayCount}</span>
              <span className="text-xs text-teal-100">오늘 기록</span>
            </div>
            <div className="flex flex-col items-center rounded-2xl bg-white/15 px-5 py-4 backdrop-blur-sm">
              <Zap size={20} className="mb-1 text-yellow-300" />
              <span className="text-2xl font-black">{list.length}</span>
              <span className="text-xs text-teal-100">최근 기록</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        {/* ── Form column ────────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* main form card */}
          <div className="overflow-hidden rounded-3xl bg-white shadow-lg border border-slate-100">
            {/* card header */}
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-700">새 기록 추가</h2>
              <p className="text-xs text-slate-400 mt-0.5">무슨 일이 있었는지 솔직하게 남겨보세요</p>
            </div>

            <div className="p-6 space-y-7">
              {/* text area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700">무슨 일이 있었나요?</label>
                  <span className={`text-xs font-mono font-semibold ${text.length > MAX_TEXT ? "text-rose-500" : "text-slate-400"}`}>
                    {text.length}/{MAX_TEXT}
                  </span>
                </div>
                <textarea
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 placeholder-slate-400 transition focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100"
                  rows={4}
                  placeholder="예: 한 시간 공부했고, 저녁엔 운동을 빠졌어요. 유튜브를 두 시간 봤는데 후회됩니다..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={MAX_TEXT + 20}
                />
              </div>

              {/* quick category chips */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">카테고리</label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_CATS.map((c) => (
                    <button
                      key={c.tag}
                      type="button"
                      onClick={() => setTag(c.tag)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all
                        ${tag === c.tag
                          ? `bg-gradient-to-r ${c.color} text-white shadow-md scale-105`
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                    >
                      <span>{c.emoji}</span><span>{c.label}</span>
                    </button>
                  ))}
                </div>
                {/* custom tag input */}
                <div className="relative">
                  <Tag size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="직접 입력..."
                    onFocus={() => setTagFocused(true)}
                    onBlur={() => setTimeout(() => setTagFocused(false), 150)}
                  />
                  {tagFocused && tagSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      {tagSuggestions.map((t) => (
                        <button key={t} type="button"
                          onMouseDown={(e) => { e.preventDefault(); setTag(t); setTagFocused(false); }}
                          className="w-full px-4 py-2.5 text-left text-sm font-semibold text-slate-600 hover:bg-teal-50 hover:text-teal-700 transition"
                        >
                          #{t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* time toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700">시간 설정</label>
                  <button
                    type="button"
                    onClick={() => setCustomTime((v) => !v)}
                    className={`relative h-7 w-12 rounded-full transition-colors duration-200 ${customTime ? "bg-teal-500" : "bg-slate-200"}`}
                  >
                    <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all duration-200 ${customTime ? "left-5" : "left-0.5"}`} />
                  </button>
                </div>
                {customTime
                  ? <input type="datetime-local" value={timeValue} onChange={(e) => setTimeValue(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100" />
                  : <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-400">
                      <Clock3 size={14} /><span>현재 시간으로 저장</span>
                    </div>
                }
              </div>

              {/* emotion picker */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700">지금 기분이 어때요?</label>
                  <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${selectedMood.bg} ${selectedMood.text}`}>
                    <span>{selectedMood.emoji}</span><span>{selectedMood.label}</span>
                  </span>
                </div>
                <MoodPicker value={emotion} onChange={setEmotion} />
              </div>

              {/* intensity */}
              <IntensityBar value={intensity} onChange={setIntensity} />

              {/* submit */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 py-4 text-base font-bold text-white shadow-lg transition hover:from-teal-600 hover:to-emerald-600 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting
                  ? <><div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /><span>저장 중...</span></>
                  : <><Plus size={20} /><span>지금 이 순간 저장</span></>
                }
              </button>
            </div>
          </div>

          {/* trending tips card */}
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100">
                <Sparkles size={18} className="text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-violet-700">기록 팁</p>
                <p className="mt-1 text-sm text-violet-600 leading-relaxed">
                  완벽한 문장 대신 짧고 솔직하게 써보세요. 반복되는 작은 순간이 쌓여 패턴이 보입니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column ───────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* quick actions */}
          <div className="overflow-hidden rounded-3xl bg-white shadow-lg border border-slate-100">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-700">⚡ 빠른 기록</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4">
              {QUICK_CATS.slice(0, 6).map((c) => (
                <button
                  key={c.tag}
                  type="button"
                  onClick={() => setTag(c.tag)}
                  className={`relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${c.color}`}
                >
                  <div className="absolute -right-2 -top-2 text-4xl opacity-20">{c.emoji}</div>
                  <span className="text-2xl">{c.emoji}</span>
                  <p className="mt-2 text-sm font-bold text-white">{c.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* recent logs */}
          <div className="overflow-hidden rounded-3xl bg-white shadow-lg border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-700">📋 최근 기록</h2>
              <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-700">
                {list.length}개
              </span>
            </div>

            <div className="max-h-[540px] overflow-y-auto p-4 space-y-3">
              {logsLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded-3xl bg-slate-100" />
                  ))}
                </div>
              ) : list.length ? (
                list.map((item) => (
                  <LogCard
                    key={item.id}
                    item={item}
                    editingId={editingId}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    editError={editError}
                    savingEdit={savingEdit}
                    startEdit={startEdit}
                    cancelEdit={cancelEdit}
                    handleEdit={handleEdit}
                    handleDelete={handleDelete}
                    deletingIds={deletingIds}
                    formatRelativeTime={formatRelativeTime}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
                  <span className="text-4xl mb-3">📝</span>
                  <p className="text-sm font-medium">아직 기록이 없어요</p>
                  <p className="text-xs mt-1">첫 번째 기록을 남겨보세요!</p>
                </div>
              )}
              {logsError && <p className="text-xs text-rose-500 text-center">{logsError}</p>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default LogPage;
