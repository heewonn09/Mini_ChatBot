import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen, Flame, Heart, MessageCircle, Plus,
  Send, Sparkles, Target, Trophy, Users, X,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import {
  createComment, createPost, deletePost, fetchComments,
  fetchPosts, getErrorMessage, toggleLike,
} from "../api/api";
import ToastContainer from "../components/ui/Toast";
import { useToast } from "../hooks/useToast";

const CATEGORIES = [
  { key: "all",         label: "전체",    emoji: "✨" },
  { key: "general",     label: "일반",    emoji: "💬" },
  { key: "tip",         label: "팁",      emoji: "💡" },
  { key: "question",    label: "질문",    emoji: "❓" },
  { key: "achievement", label: "달성",    emoji: "🏆" },
];

const CAT_COLOR = {
  general:     "bg-slate-100 text-slate-600",
  tip:         "bg-amber-100 text-amber-700",
  question:    "bg-blue-100 text-blue-700",
  achievement: "bg-yellow-100 text-yellow-700",
};
const CAT_LABEL = { general: "일반", tip: "팁", question: "질문", achievement: "달성" };

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  if (m < 1440) return `${Math.floor(m / 60)}시간 전`;
  return `${Math.floor(m / 1440)}일 전`;
}

// ── Create Post Modal ─────────────────────────────────────────────────────────
function CreatePostModal({ onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handle = async () => {
    if (!title.trim() || !content.trim()) { setError("제목과 내용을 입력해주세요."); return; }
    setSaving(true); setError("");
    try {
      const post = await createPost({ title, content, category });
      onCreated(post);
      onClose();
    } catch (e) { setError(getErrorMessage(e, "게시글 작성에 실패했습니다.")); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-800">✍️ 새 게시글</h2>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.slice(1).map((c) => (
              <button key={c.key} onClick={() => setCategory(c.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${category === c.key ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 placeholder-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
          />
          <textarea
            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
            rows={5}
            placeholder="내용을 작성하세요..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={3000}
          />
          {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50">
              취소
            </button>
            <button onClick={handle} disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 py-3 text-sm font-bold text-white hover:from-teal-600 hover:to-emerald-600 disabled:opacity-50"
            >
              <Send size={14} />{saving ? "등록 중..." : "게시하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Comment section ───────────────────────────────────────────────────────────
function CommentSection({ post, currentUserId }) {
  const [comments, setComments] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchComments(post.id).then(setComments).finally(() => setLoading(false));
  }, [post.id]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setSaving(true);
    try {
      const c = await createComment(post.id, input.trim());
      setComments((prev) => [...prev, c]);
      setInput("");
    } finally { setSaving(false); }
  };

  return (
    <div className="border-t border-slate-100 bg-slate-50/50 px-5 pt-4 pb-5 space-y-3">
      {loading ? (
        <p className="text-xs text-slate-400">댓글 불러오는 중...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-slate-400">첫 댓글을 남겨보세요 👋</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
                {c.author.username[0].toUpperCase()}
              </div>
              <div className="flex-1 rounded-2xl bg-white px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">{c.author.username}</span>
                  <span className="text-xs text-slate-400">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-slate-600 mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm placeholder-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
          placeholder="댓글 달기..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
        />
        <button onClick={handleSend} disabled={saving || !input.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-500 text-white transition hover:bg-teal-600 disabled:opacity-50"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Post Card ─────────────────────────────────────────────────────────────────
function PostCard({ post: initialPost, currentUserId, onDelete }) {
  const [post, setPost] = useState(initialPost);
  const [showComments, setShowComments] = useState(false);
  const [liking, setLiking] = useState(false);

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    try {
      const res = await toggleLike(post.id);
      setPost((p) => ({ ...p, like_count: res.like_count, liked_by_me: res.liked }));
    } finally { setLiking(false); }
  };

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm border border-slate-100 transition hover:shadow-md">
      <div className="p-5">
        {/* author row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 text-sm font-bold text-white">
              {post.author.username[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">{post.author.username}</p>
              <p className="text-xs text-slate-400">{timeAgo(post.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${CAT_COLOR[post.category] ?? CAT_COLOR.general}`}>
              {CAT_LABEL[post.category] ?? post.category}
            </span>
            {post.author.id === currentUserId && (
              <button onClick={() => onDelete(post.id)}
                className="rounded-xl p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-400 transition"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <h3 className="text-base font-bold text-slate-800 mb-1">{post.title}</h3>
        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-4">{post.content}</p>
      </div>

      {/* actions */}
      <div className="flex items-center gap-1 px-5 pb-4">
        <button onClick={handleLike} disabled={liking}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
            post.liked_by_me ? "bg-rose-50 text-rose-500" : "text-slate-400 hover:bg-rose-50 hover:text-rose-400"
          }`}
        >
          <Heart size={15} fill={post.liked_by_me ? "currentColor" : "none"} />
          <span>{post.like_count}</span>
        </button>
        <button onClick={() => setShowComments((v) => !v)}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
            showComments ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-teal-50 hover:text-teal-500"
          }`}
        >
          <MessageCircle size={15} />
          <span>{post.comment_count}</span>
        </button>
      </div>

      {showComments && <CommentSection post={post} currentUserId={currentUserId} />}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CommunityPage() {
  const { user } = useOutletContext();
  const { toasts, showToast, dismiss } = useToast();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const latestIdRef = useRef(null);

  const load = async (cat) => {
    setLoading(true);
    setHasNewPosts(false);
    try {
      const params = cat !== "all" ? { category: cat } : {};
      const data = await fetchPosts(params);
      setPosts(data);
      if (data.length > 0) latestIdRef.current = data[0].id;
    } catch (e) {
      showToast(getErrorMessage(e, "불러오지 못했습니다."), "error");
    } finally { setLoading(false); }
  };

  const pollForNew = useCallback(async () => {
    try {
      const params = category !== "all" ? { category } : {};
      const data = await fetchPosts(params);
      if (data.length > 0 && latestIdRef.current !== null && data[0].id > latestIdRef.current) {
        setHasNewPosts(true);
      }
    } catch { /* ignore poll errors */ }
  }, [category]);

  useEffect(() => { load(category); }, [category]);

  useEffect(() => {
    const id = setInterval(pollForNew, 30000);
    return () => clearInterval(id);
  }, [pollForNew]);

  const handleDelete = async (postId) => {
    try {
      await deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      showToast("게시글을 삭제했어요.", "info");
    } catch (e) { showToast(getErrorMessage(e, "삭제에 실패했습니다."), "error"); }
  };

  const handleCreated = (post) => {
    setPosts((prev) => [post, ...prev]);
    showToast("게시글이 등록됐어요! 🎉", "success");
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}

      {/* Hero */}
      <div className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-violet-200">
              <Users size={16} />
              <span className="text-sm font-semibold uppercase tracking-wider">커뮤니티</span>
            </div>
            <h1 className="text-3xl font-black">함께 성장하는<br />공간</h1>
            <p className="mt-2 text-violet-200 text-sm">습관, 고민, 성취를 나눠보세요.</p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className="flex gap-3">
              <div className="flex flex-col items-center rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
                <Trophy size={18} className="mb-1 text-yellow-300" />
                <span className="text-lg font-black">{posts.length}</span>
                <span className="text-xs text-violet-200">게시글</span>
              </div>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-violet-700 shadow transition hover:shadow-md"
            >
              <Plus size={16} /><span>글 쓰기</span>
            </button>
          </div>
        </div>
      </div>

      {/* category filter */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {CATEGORIES.map((c) => (
          <button key={c.key} onClick={() => setCategory(c.key)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition ${
              category === c.key
                ? "bg-violet-500 text-white shadow"
                : "bg-white text-slate-500 border border-slate-200 hover:border-violet-300 hover:text-violet-600"
            }`}
          >
            <span>{c.emoji}</span><span>{c.label}</span>
          </button>
        ))}
      </div>

      {/* new posts banner */}
      {hasNewPosts && (
        <div className="mb-2 flex items-center justify-between rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
          <p className="text-sm font-semibold text-violet-700">새 게시글이 올라왔어요!</p>
          <button
            onClick={() => load(category)}
            className="rounded-full bg-violet-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-violet-600"
          >
            새로고침
          </button>
        </div>
      )}

      {/* post list */}
      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map((i) => <div key={i} className="h-40 animate-pulse rounded-3xl bg-slate-100" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
          <Sparkles size={40} className="mb-4 text-violet-300" />
          <p className="text-base font-bold">아직 게시글이 없어요</p>
          <p className="text-sm mt-1">첫 번째 이야기를 시작해보세요!</p>
          <button onClick={() => setShowCreate(true)}
            className="mt-5 flex items-center gap-2 rounded-2xl bg-violet-500 px-5 py-3 text-sm font-bold text-white hover:bg-violet-600"
          >
            <Plus size={16} />글 쓰기
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} currentUserId={user?.id} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </>
  );
}
