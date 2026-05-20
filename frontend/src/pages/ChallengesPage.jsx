import { useState, useEffect, useCallback } from "react";
import { useLang } from "../context/messages";
import {
  fetchChallenges,
  createChallenge,
  joinChallenge,
  leaveChallenge,
  checkinChallenge,
} from "../api/api";
import {
  Trophy,
  Flame,
  Users,
  Clock,
  CheckCircle2,
  Plus,
  Zap,
  Target,
  Star,
  ChevronRight,
  X,
  Calendar,
  Award,
} from "lucide-react";

const CATEGORIES = [
  { key: "", label: "전체", color: "from-slate-500 to-slate-600" },
  { key: "mindfulness", label: "마음챙김", color: "from-purple-500 to-violet-600" },
  { key: "fitness", label: "피트니스", color: "from-orange-500 to-red-500" },
  { key: "habit", label: "습관", color: "from-teal-500 to-emerald-600" },
  { key: "focus", label: "집중력", color: "from-blue-500 to-indigo-600" },
  { key: "other", label: "기타", color: "from-rose-400 to-pink-500" },
];

const CAT_COLORS = {
  mindfulness: { bg: "bg-purple-50", text: "text-purple-700", ring: "ring-purple-200", dot: "bg-purple-500", badge: "bg-purple-100 text-purple-700" },
  fitness: { bg: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-200", dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700" },
  habit: { bg: "bg-teal-50", text: "text-teal-700", ring: "ring-teal-200", dot: "bg-teal-500", badge: "bg-teal-100 text-teal-700" },
  focus: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200", dot: "bg-blue-500", badge: "bg-blue-100 text-blue-700" },
  other: { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200", dot: "bg-rose-500", badge: "bg-rose-100 text-rose-700" },
};

function getCatStyle(cat) {
  return CAT_COLORS[cat] || CAT_COLORS.other;
}

function ProgressRing({ pct, size = 52, stroke = 5, color = "#0f766e" }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 1));
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

function CreateChallengeModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: "", description: "", category: "habit", duration_days: 7 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const DURATION_OPTIONS = [7, 14, 21, 30, 60, 90];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError("제목을 입력해 주세요."); return; }
    setSaving(true);
    try {
      const created = await createChallenge(form);
      onCreated(created);
      onClose();
    } catch {
      setError("챌린지 생성에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-lg rounded-[1.85rem] bg-white shadow-2xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">새 챌린지 만들기</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">챌린지 제목</label>
            <input
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="예: 매일 명상 30일"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              maxLength={60}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">설명</label>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
              placeholder="챌린지 방법과 목표를 설명해 주세요."
              rows={3}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">카테고리</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.filter((c) => c.key).map((c) => (
                <button
                  key={c.key} type="button"
                  onClick={() => setForm((p) => ({ ...p, category: c.key }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ring-2 ${
                    form.category === c.key
                      ? `bg-gradient-to-r ${c.color} text-white ring-transparent shadow`
                      : "bg-slate-50 text-slate-600 ring-slate-200 hover:ring-slate-300"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">기간</label>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d} type="button"
                  onClick={() => setForm((p) => ({ ...p, duration_days: d }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ring-2 ${
                    form.duration_days === d
                      ? "bg-teal-500 text-white ring-transparent shadow"
                      : "bg-slate-50 text-slate-600 ring-slate-200 hover:ring-slate-300"
                  }`}
                >
                  {d}일
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold text-sm shadow hover:shadow-md transition disabled:opacity-60"
          >
            {saving ? "생성 중..." : "챌린지 만들기"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Join Confirm Modal (2-step) ───────────────────────────────────────────────
function JoinConfirmModal({ ch, onClose, onConfirmed }) {
  const [step, setStep] = useState(1);
  const [committed, setCommitted] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const style = getCatStyle(ch.category);

  async function handleConfirm() {
    setJoining(true);
    setError("");
    try {
      await joinChallenge(ch.id);
      onConfirmed();
      onClose();
    } catch (e) {
      setError(e?.response?.data?.detail || "참가에 실패했어요. 다시 시도해 주세요.");
      setJoining(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-md rounded-[1.85rem] bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* step indicator */}
        <div className="flex">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 transition-all duration-300 ${s <= step ? "bg-teal-500" : "bg-slate-100"}`}
            />
          ))}
        </div>

        <div className="p-6 space-y-5">
          {step === 1 ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className={`inline-block mb-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${style.badge}`}>
                    {CATEGORIES.find((c) => c.key === ch.category)?.label || ch.category}
                  </span>
                  <h2 className="text-xl font-extrabold text-slate-800 leading-snug">{ch.title}</h2>
                </div>
                <button onClick={onClose} className="mt-1 p-2 rounded-full hover:bg-slate-100 transition">
                  <X size={16} className="text-slate-400" />
                </button>
              </div>

              {ch.description && (
                <p className="text-sm text-slate-600 leading-relaxed">{ch.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
                  <div className="text-2xl font-black text-teal-600">{ch.duration_days}일</div>
                  <div className="text-xs text-slate-500 mt-0.5">도전 기간</div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
                  <div className="text-2xl font-black text-teal-600">{ch.participant_count.toLocaleString()}</div>
                  <div className="text-xs text-slate-500 mt-0.5">명 참여 중</div>
                </div>
              </div>

              <p className="text-xs text-slate-400 text-center">매일 체크인으로 {ch.duration_days}일 연속 달성을 목표로 합니다.</p>

              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50">
                  취소
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 py-3 text-sm font-bold text-white hover:from-teal-600 hover:to-emerald-600"
                >
                  다음 →
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center pt-2">
                <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-teal-50">
                  <CheckCircle2 size={28} className="text-teal-500" />
                </div>
                <h2 className="text-lg font-extrabold text-slate-800">참가 전 다짐</h2>
                <p className="mt-1 text-sm text-slate-500">아래 항목에 동의하고 챌린지에 참가하세요.</p>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-teal-300 transition">
                <input
                  type="checkbox"
                  checked={committed}
                  onChange={(e) => setCommitted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-teal-500"
                />
                <span className="text-sm text-slate-700 leading-relaxed">
                  <strong className="text-teal-700">{ch.duration_days}일</strong> 동안 매일 체크인하며 꾸준히 참여하겠습니다.
                </span>
              </label>

              {error && <p className="text-xs text-red-500 text-center font-medium">{error}</p>}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50">
                  ← 이전
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!committed || joining}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 py-3 text-sm font-bold text-white hover:from-teal-600 hover:to-emerald-600 disabled:opacity-50"
                >
                  {joining ? "참가 중..." : "참가 확정하기 🎉"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ChallengeCard({ ch, onAction, onJoinRequest }) {
  const [actioning, setActioning] = useState(false);
  const [toast, setToast] = useState(null);
  // Optimistic 로컬 상태 — 체크인 성공 시 즉시 반영
  const [localCh, setLocalCh] = useState(ch);
  const style = getCatStyle(localCh.category);
  const pct = localCh.duration_days > 0 ? localCh.my_completed_days / localCh.duration_days : 0;
  const isComplete = localCh.my_completed_days >= localCh.duration_days;

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function handleJoin() {
    onJoinRequest(ch);
  }

  async function handleLeave() {
    setActioning(true);
    try {
      await leaveChallenge(ch.id);
      showToast("챌린지에서 나갔어요.");
      onAction();
    } catch (e) {
      showToast(e?.response?.data?.detail || "탈퇴에 실패했어요.", false);
    } finally { setActioning(false); }
  }

  async function handleCheckin() {
    setActioning(true);
    // Optimistic update: 즉시 로컬 상태 업데이트
    const nextCompleted = localCh.my_completed_days + 1;
    setLocalCh((prev) => ({
      ...prev,
      my_completed_days: nextCompleted,
      current_streak: (prev.current_streak ?? 0) + 1,
    }));
    try {
      const res = await checkinChallenge(ch.id);
      showToast(res.message || "체크인 완료! 🎉");
      onAction(); // 서버 최신 데이터 동기화
    } catch (e) {
      setLocalCh(ch); // 실패 시 롤백
      showToast(e?.response?.data?.detail || "체크인에 실패했어요.", false);
    } finally { setActioning(false); }
  }

  return (
    <div className={`relative rounded-[1.4rem] border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col gap-4 ${localCh.joined ? "ring-2 ring-teal-300/60" : ""}`}>
      {toast && (
        <div className={`absolute top-3 right-3 text-xs font-semibold px-3 py-1.5 rounded-full shadow z-10 ${toast.ok ? "bg-teal-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {localCh.is_official && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wide">
                <Star size={10} fill="currentColor" /> 공식
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${style.badge}`}>
              {CATEGORIES.find((c) => c.key === localCh.category)?.label || localCh.category}
            </span>
          </div>
          <h3 className="font-bold text-slate-800 text-base leading-snug">{localCh.title}</h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{localCh.description}</p>
        </div>

        {localCh.joined && (
          <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: 52, height: 52 }}>
            <ProgressRing pct={pct} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold text-teal-700">{Math.round(pct * 100)}%</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Users size={12} /> {localCh.participant_count.toLocaleString()}명 참여</span>
        <span className="flex items-center gap-1"><Calendar size={12} /> {localCh.duration_days}일</span>
        {localCh.joined && localCh.current_streak > 0 && (
          <span className="flex items-center gap-1 text-orange-500 font-semibold"><Flame size={12} /> {localCh.current_streak}일 연속</span>
        )}
        {isComplete && localCh.joined && (
          <span className="flex items-center gap-1 text-teal-600 font-semibold"><Award size={12} /> 완료!</span>
        )}
      </div>

      {localCh.joined && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>{localCh.my_completed_days}/{localCh.duration_days}일 완료</span>
            {isComplete && <span className="text-teal-600 font-semibold">🎉 달성!</span>}
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(pct * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {!localCh.joined ? (
          <button
            onClick={handleJoin}
            disabled={actioning}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-semibold shadow hover:shadow-md transition disabled:opacity-60"
          >
            {actioning ? "처리 중..." : "참가하기"}
          </button>
        ) : (
          <>
            <button
              onClick={handleCheckin}
              disabled={actioning || isComplete}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-semibold shadow hover:shadow-md transition disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 size={15} />
              {actioning ? "처리 중..." : "오늘 체크인"}
            </button>
            <button
              onClick={handleLeave}
              disabled={actioning}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition disabled:opacity-60"
            >
              탈퇴
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ChallengesPage() {
  const m = useLang();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState("all"); // "all" | "mine"
  const [joinTarget, setJoinTarget] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const params = category ? { category } : {};
      const data = await fetchChallenges(params);
      setChallenges(data);
    } catch {
      setError("챌린지를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { load(); }, [load]);

  const displayed = tab === "mine" ? challenges.filter((c) => c.joined) : challenges;
  const myJoined = challenges.filter((c) => c.joined);
  const totalStreakDays = myJoined.reduce((s, c) => s + (c.my_streak || 0), 0);
  const totalCompleted = myJoined.reduce((s, c) => s + (c.my_completed_days || 0), 0);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-8 text-white shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 left-8 w-40 h-40 rounded-full bg-white blur-2xl" />
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-6 justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={22} className="text-amber-200" />
              <span className="text-sm font-semibold text-amber-100 uppercase tracking-wider">챌린지 센터</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-1">{m.challenges.title}</h1>
            <p className="text-amber-100 text-sm">{m.challenges.description}</p>
          </div>
          <div className="flex gap-4 sm:gap-6">
            <div className="text-center">
              <div className="text-3xl font-black">{myJoined.length}</div>
              <div className="text-xs text-amber-100 mt-0.5">{m.challenges.joined}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black">{totalStreakDays}</div>
              <div className="text-xs text-amber-100 mt-0.5">연속 합계</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black">{totalCompleted}</div>
              <div className="text-xs text-amber-100 mt-0.5">총 체크인</div>
            </div>
          </div>
        </div>

        {myJoined.length > 0 && (
          <div className="relative mt-5 pt-5 border-t border-white/20">
            <p className="text-xs font-semibold text-amber-100 mb-3 flex items-center gap-1.5">
              <Flame size={13} /> 오늘 체크인이 필요한 챌린지
            </p>
            <div className="flex flex-wrap gap-2">
              {myJoined.filter((c) => c.my_completed_days < c.duration_days).map((c) => (
                <div key={c.id} className="flex items-center gap-2 bg-white/15 backdrop-blur rounded-full px-3 py-1.5 text-xs font-semibold text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                  {c.title}
                  <span className="text-amber-200">{c.my_streak}일 연속</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          {["all", "mine"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                tab === t
                  ? "bg-slate-800 text-white shadow"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t === "all" ? m.challenges.title : `내 챌린지 (${myJoined.length})`}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow hover:shadow-md transition"
        >
          <Plus size={15} /> 챌린지 만들기
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition ring-2 ${
              category === c.key
                ? `bg-gradient-to-r ${c.color} text-white ring-transparent shadow`
                : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-300"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-52 rounded-[1.4rem] bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-slate-500">
          <p>{error}</p>
          <button onClick={load} className="mt-3 text-sm text-teal-600 font-semibold hover:underline">다시 시도</button>
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 flex items-center justify-center">
            <Target size={28} className="text-amber-400" />
          </div>
          <p className="font-semibold text-slate-700">
            {tab === "mine" ? "아직 참가한 챌린지가 없어요." : "챌린지가 없어요."}
          </p>
          <p className="text-sm text-slate-400">
            {tab === "mine" ? "전체 탭에서 마음에 드는 챌린지에 참가해 보세요!" : "새 챌린지를 만들어 보세요!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((ch) => (
            <ChallengeCard key={ch.id} ch={ch} onAction={load} onJoinRequest={setJoinTarget} />
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="rounded-[1.4rem] border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-5 space-y-3">
        <h3 className="font-bold text-amber-800 flex items-center gap-2">
          <Zap size={16} /> 챌린지 성공 팁
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          {[
            { icon: "🌅", title: "같은 시간에 체크인", desc: "매일 같은 시간에 체크인하면 습관 형성이 훨씬 빨라져요." },
            { icon: "📝", title: "행동 기록과 연결", desc: "체크인 후 행동 기록을 남기면 AI 분석도 더 정확해져요." },
            { icon: "🤝", title: "함께하면 더 강력", desc: "친구와 같은 챌린지에 참가하면 완주율이 2배 올라요." },
          ].map((tip) => (
            <div key={tip.title} className="flex gap-3 p-3 rounded-xl bg-white/70">
              <span className="text-xl">{tip.icon}</span>
              <div>
                <div className="font-semibold text-amber-900 text-xs">{tip.title}</div>
                <div className="text-xs text-amber-700 mt-0.5">{tip.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCreate && (
        <CreateChallengeModal
          onClose={() => setShowCreate(false)}
          onCreated={(newCh) => setChallenges((prev) => [newCh, ...prev])}
        />
      )}

      {joinTarget && (
        <JoinConfirmModal
          ch={joinTarget}
          onClose={() => setJoinTarget(null)}
          onConfirmed={() => { setJoinTarget(null); load(); }}
        />
      )}
    </div>
  );
}
