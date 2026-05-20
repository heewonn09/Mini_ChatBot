import { useRef, useState } from "react";
import { Check, Pencil, X, Zap } from "lucide-react";
import { createBehavior, getErrorMessage } from "../../api/api";

const QUICK_MOODS = [
  { key: "focused",   emoji: "🎯", label: "집중" },
  { key: "happy",     emoji: "😄", label: "행복" },
  { key: "calm",      emoji: "😌", label: "차분" },
  { key: "motivated", emoji: "💪", label: "의욕" },
  { key: "neutral",   emoji: "😐", label: "보통" },
  { key: "stressed",  emoji: "😰", label: "스트레스" },
  { key: "anxious",   emoji: "😟", label: "불안" },
  { key: "sad",       emoji: "😢", label: "슬픔" },
];

const DEFAULT_TAGS = ["Study", "Exercise", "Break", "Work", "Reading"];

function QuickLogFAB({ user, overview, refreshOverview }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [emotion, setEmotion] = useState("neutral");
  const [tag, setTag] = useState("Study");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef(null);

  const recentTags = [
    ...new Set([
      ...(overview?.habit_frequency ?? []).slice(0, 4).map((h) => h.tag),
      ...DEFAULT_TAGS,
    ]),
  ].slice(0, 6);

  function openFAB() {
    setOpen(true);
    setDone(false);
    setError("");
    setText("");
    setEmotion("neutral");
    setTag(recentTags[0] ?? "Study");
    setTimeout(() => textareaRef.current?.focus(), 80);
  }

  function closeFAB() {
    setOpen(false);
  }

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    setError("");
    try {
      await createBehavior(user.id, { text, emotion, tag, intensity: 6 });
      setDone(true);
      refreshOverview?.();
      setTimeout(() => setOpen(false), 900);
    } catch (e) {
      setError(getErrorMessage(e, "저장하지 못했습니다."));
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <>
      {/* FAB button */}
      <button
        type="button"
        onClick={openFAB}
        aria-label="빠른 기록 추가"
        className="fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#0f766e] to-[#1b9e94] text-white shadow-[0_8px_28px_rgba(15,118,110,0.40)] transition hover:scale-105 hover:shadow-[0_12px_36px_rgba(15,118,110,0.50)] active:scale-95"
        style={{
          bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))",
          right: "1rem",
        }}
      >
        <Pencil size={22} strokeWidth={2.2} />
      </button>

      {/* Backdrop + bottom-sheet modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeFAB(); }}
        >
          <div className="w-full max-w-sm rounded-t-[2rem] sm:rounded-[2rem] bg-[color:var(--surface)] shadow-2xl overflow-hidden">
            {/* header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-[#0f766e]" />
                <span className="text-sm font-bold text-[color:var(--ink)]">빠른 기록</span>
              </div>
              <button type="button" onClick={closeFAB} className="p-1 opacity-50 hover:opacity-100 transition">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 pb-6 space-y-4">
              {/* tag chips */}
              <div className="flex flex-wrap gap-2">
                {recentTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTag(t)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      tag === t
                        ? "bg-[#0f766e] text-white shadow"
                        : "bg-[color:var(--surface-soft)] text-[color:var(--ink-soft)] hover:bg-[color:var(--surface-strong)]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* text */}
              <textarea
                ref={textareaRef}
                rows={2}
                className="w-full resize-none rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm text-[color:var(--ink)] placeholder-[color:var(--ink-soft)] focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[rgba(15,118,110,0.15)]"
                placeholder="방금 무슨 일이 있었나요?"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={200}
              />

              {/* emotion picker */}
              <div className="grid grid-cols-4 gap-1.5">
                {QUICK_MOODS.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setEmotion(m.key)}
                    className={`flex flex-col items-center gap-0.5 rounded-xl py-2 text-center transition ${
                      emotion === m.key
                        ? "bg-[rgba(15,118,110,0.12)] ring-1 ring-[#0f766e]"
                        : "hover:bg-[color:var(--surface-soft)]"
                    }`}
                  >
                    <span className="text-lg">{m.emoji}</span>
                    <span className="text-[0.6rem] font-semibold text-[color:var(--ink-soft)]">{m.label}</span>
                  </button>
                ))}
              </div>

              {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

              {/* save button */}
              <button
                type="button"
                onClick={handleSave}
                disabled={!text.trim() || saving || done}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f766e] py-3 text-sm font-bold text-white transition hover:bg-[#0b5c56] disabled:opacity-50"
              >
                {done ? (
                  <><Check size={16} /><span>저장됐어요!</span></>
                ) : saving ? (
                  <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /><span>저장 중...</span></>
                ) : (
                  <><Zap size={16} /><span>저장하기</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default QuickLogFAB;
