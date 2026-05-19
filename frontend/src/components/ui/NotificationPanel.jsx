import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Flame, Target, Trophy, UserPlus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "../../api/api";

function _relTime(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

const TYPE_ICON = {
  streak_alert: Flame,
  achievement: Trophy,
  challenge_reminder: Target,
  follow: UserPlus,
};

const TYPE_DEST = {
  challenge_reminder: "/challenges",
  follow: "/community",
  achievement: "/profile",
};

function NotificationPanel({ userId, isOpen, onClose, onUnreadChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen || !userId) return;
    setLoading(true);
    fetchNotifications(userId)
      .then((data) => {
        setItems(data.items ?? []);
        onUnreadChange?.(data.unread_count ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, userId]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKey);
      document.addEventListener("mousedown", handleClick);
    }
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isOpen, onClose]);

  async function handleRead(notif) {
    if (!notif.is_read) {
      await markNotificationRead(userId, notif.id).catch(() => {});
      setItems((prev) => prev.map((n) => n.id === notif.id ? { ...n, is_read: true } : n));
      onUnreadChange?.(Math.max(0, items.filter((n) => !n.is_read).length - 1));
    }
    const dest = TYPE_DEST[notif.type] ?? "/dashboard";
    onClose();
    navigate(dest);
  }

  async function handleReadAll() {
    await markAllNotificationsRead(userId).catch(() => {});
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    onUnreadChange?.(0);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" aria-modal="true">
      <div
        ref={panelRef}
        className="absolute right-4 top-20 w-80 rounded-[1.85rem] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[var(--shadow-lg)] backdrop-blur-xl sm:right-8"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-[#0f766e]" />
            <span className="text-sm font-bold text-[color:var(--ink)]">알림</span>
          </div>
          <div className="flex items-center gap-2">
            {items.some((n) => !n.is_read) && (
              <button
                type="button"
                onClick={handleReadAll}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-[#0f766e] hover:bg-[rgba(15,118,110,0.08)] transition"
              >
                <CheckCheck size={13} />
                모두 읽음
              </button>
            )}
            <button type="button" onClick={onClose} className="p-1 opacity-50 hover:opacity-100 transition">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto px-3 pb-4 space-y-1">
          {loading && (
            <p className="py-6 text-center text-sm text-[color:var(--ink-soft)]">불러오는 중...</p>
          )}
          {!loading && items.length === 0 && (
            <p className="py-8 text-center text-sm text-[color:var(--ink-soft)]">새 알림이 없습니다.</p>
          )}
          {!loading && items.map((notif) => {
            const Icon = TYPE_ICON[notif.type] ?? Bell;
            const ago = notif.created_at ? _relTime(notif.created_at) : null;
            return (
              <button
                key={notif.id}
                type="button"
                onClick={() => handleRead(notif)}
                className={`w-full flex items-start gap-3 rounded-[1.25rem] px-3 py-3 text-left transition hover:bg-[rgba(24,50,53,0.06)] ${
                  notif.is_read ? "opacity-60" : ""
                }`}
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(15,118,110,0.1)]">
                  <Icon size={14} className="text-[#0f766e]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[color:var(--ink)] truncate">{notif.title}</p>
                  {notif.body && (
                    <p className="text-xs text-[color:var(--ink-soft)] mt-0.5 line-clamp-2">{notif.body}</p>
                  )}
                  {ago && <p className="text-[11px] text-[color:var(--ink-soft)] mt-1 opacity-70">{ago}</p>}
                </div>
                {!notif.is_read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#0f766e]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default NotificationPanel;
