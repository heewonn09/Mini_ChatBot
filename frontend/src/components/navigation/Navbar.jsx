import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  CirclePlus,
  Grid3x3,
  LayoutDashboard,
  LineChart,
  LogOut,
  MessageSquare,
  Moon,
  Sparkles,
  Sun,
  User,
  Users,
  Trophy,
  X,
} from "lucide-react";
import { fetchNotifications, getStoredToken, getStoredUserId, logOut } from "../../api/api";
import { useAppSettings } from "../../context/AppSettingsContext";
import { useLang } from "../../context/messages";
import NotificationPanel from "../ui/NotificationPanel";

function linkClassName(isActive) {
  return `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
    isActive
      ? "bg-[color:var(--primary)] text-[color:var(--primary-contrast)] shadow-[var(--shadow-sm)]"
      : "border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-muted)] hover:bg-[color:var(--surface)] hover:text-[color:var(--text)]"
  }`;
}

const NAV_PATHS = [
  { key: "dashboard", path: "/dashboard", icon: LayoutDashboard },
  { key: "log",       path: "/log",       icon: CirclePlus },
  { key: "analysis",  path: "/analysis",  icon: LineChart },
  { key: "chat",      path: "/chat",      icon: MessageSquare },
  { key: "community", path: "/community", icon: Users },
  { key: "challenges",path: "/challenges",icon: Trophy },
  { key: "profile",   path: "/profile",   icon: User },
];

// 모바일 하단 탭바에 고정 노출할 핵심 4개
const CORE_PATHS = ["dashboard", "log", "chat", "profile"];
// 더보기 드로어로 숨길 항목
const MORE_PATHS = ["analysis", "community", "challenges"];

function Navbar() {
  const { theme, setTheme } = useAppSettings();
  const m = useLang();
  const userId = getStoredUserId();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const moreDrawerRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    const apiBase = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
    const streamUrl = `${apiBase}/ui/${userId}/notifications/stream`;
    let abortCtrl = new AbortController();
    let retryTimeout = null;

    const connect = async () => {
      const token = getStoredToken();
      if (!token) return;
      try {
        const resp = await fetch(streamUrl, {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortCtrl.signal,
        });
        if (!resp.ok || !resp.body) throw new Error("stream unavailable");
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          for (const line of text.split("\n")) {
            if (line.startsWith("data: ")) {
              try {
                const { unread_count } = JSON.parse(line.slice(6));
                setUnreadCount(unread_count ?? 0);
              } catch { /* malformed chunk */ }
            }
          }
        }
      } catch (e) {
        if (e?.name === "AbortError") return;
        // SSE failed — fall back to one-shot fetch and retry stream in 30s
        try {
          const data = await fetchNotifications(userId);
          setUnreadCount(data.unread_count ?? 0);
        } catch { /* ignore */ }
      }
      retryTimeout = setTimeout(connect, 30000);
    };

    connect();
    return () => { abortCtrl.abort(); clearTimeout(retryTimeout); };
  }, [userId]);

  // 더보기 드로어 외부 클릭 시 닫기
  useEffect(() => {
    if (!moreOpen) return;
    const handleOutside = (e) => {
      if (moreDrawerRef.current && !moreDrawerRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [moreOpen]);

  const handleLogout = async () => {
    setMoreOpen(false);
    await logOut();
    navigate("/auth", { replace: true });
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 px-4 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 shadow-[var(--shadow-lg)] backdrop-blur-xl">
          <NavLink to="/dashboard" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[1.25rem] bg-[linear-gradient(135deg,#0f766e_0%,#1b8d84_56%,#dd7a5f_100%)] text-white">
              <Sparkles size={18} strokeWidth={2.2} />
            </span>
            <div>
              <div className="app-heading text-[1.8rem] leading-none text-[color:var(--ink)]">Mindflow</div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">행동 스튜디오</p>
            </div>
          </NavLink>

          <nav className="hidden items-center gap-2 md:flex">
            {NAV_PATHS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.path} to={item.path} className={({ isActive }) => linkClassName(isActive)}>
                  <Icon size={16} strokeWidth={2.05} />
                  <span>{m.nav[item.key]}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <button type="button" className="app-secondary-button px-3 py-2" aria-label={theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환"} onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? <Moon size={16} /> : <Sun size={16} />}</button>

            <button
              type="button"
              className="app-secondary-button relative px-3 py-2"
              onClick={() => setNotifOpen((v) => !v)}
              aria-label="알림"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#dd7a5f] text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              className="app-secondary-button px-3 py-2"
              aria-label="로그아웃"
              onClick={handleLogout}
            >
              <LogOut size={16} /> <span className="whitespace-nowrap">로그아웃</span>
            </button>
            <div className="items-center gap-3 rounded-full border border-[rgba(24,50,53,0.08)] bg-[rgba(247,240,231,0.92)] px-4 py-2 xl:flex hidden">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0f766e]" />
              <span className="text-sm font-semibold text-[color:var(--ink)]">{m.nav.slogan}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 모바일 하단 탭바 — 핵심 4개 + 더보기 */}
      <nav
        className="fixed inset-x-2 bottom-3 z-40 mx-auto max-w-lg rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-2 shadow-[var(--shadow-lg)] backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex items-center justify-around">
          {NAV_PATHS.filter((item) => CORE_PATHS.includes(item.key)).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-[1.35rem] px-3 py-2 text-[10px] font-semibold transition ${
                    isActive ? "bg-[color:var(--primary)] text-[color:var(--primary-contrast)]" : "text-[color:var(--ink-soft)]"
                  }`
                }
              >
                <Icon size={20} strokeWidth={2.1} />
                <span>{m.nav[item.key]}</span>
              </NavLink>
            );
          })}

          {/* 더보기 버튼 */}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-[1.35rem] px-3 py-2 text-[10px] font-semibold transition ${
              moreOpen ? "bg-[color:var(--primary)] text-[color:var(--primary-contrast)]" : "text-[color:var(--ink-soft)]"
            }`}
            aria-label="더보기"
          >
            <Grid3x3 size={20} strokeWidth={2.1} />
            <span>더보기</span>
          </button>
        </div>
      </nav>

      {/* 더보기 슬라이드업 드로어 */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden" aria-modal="true">
          {/* 배경 오버레이 */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setMoreOpen(false)} />

          {/* 드로어 패널 */}
          <div
            ref={moreDrawerRef}
            className="absolute inset-x-0 bottom-0 rounded-t-[2rem] border-t border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-[0_-8px_40px_rgba(0,0,0,0.12)]"
            style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-[color:var(--ink-soft)] uppercase tracking-widest">메뉴</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(24,50,53,0.07)] text-[color:var(--ink-soft)]"
                aria-label="닫기"
              >
                <X size={16} />
              </button>
            </div>

            {/* 더보기 탭 목록 */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {NAV_PATHS.filter((item) => MORE_PATHS.includes(item.key)).map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      `flex flex-col items-center justify-center gap-1.5 rounded-[1.2rem] py-3 text-[11px] font-semibold transition ${
                        isActive
                          ? "bg-[color:var(--primary)] text-[color:var(--primary-contrast)]"
                          : "bg-[rgba(24,50,53,0.05)] text-[color:var(--ink-soft)]"
                      }`
                    }
                  >
                    <Icon size={22} strokeWidth={2} />
                    <span>{m.nav[item.key]}</span>
                  </NavLink>
                );
              })}
            </div>

            {/* 구분선 */}
            <div className="mb-4 border-t border-[color:var(--border)]" />

            {/* 유틸리티 버튼들 */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { setNotifOpen(true); setMoreOpen(false); }}
                className="relative flex flex-1 items-center justify-center gap-2 rounded-[1.2rem] bg-[rgba(24,50,53,0.05)] py-3 text-sm font-semibold text-[color:var(--ink-soft)] transition"
                aria-label="알림"
              >
                <Bell size={18} strokeWidth={2} />
                <span>알림</span>
                {unreadCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#dd7a5f] text-[9px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setTheme(theme === "light" ? "dark" : "light"); setMoreOpen(false); }}
                className="flex flex-1 items-center justify-center gap-2 rounded-[1.2rem] bg-[rgba(24,50,53,0.05)] py-3 text-sm font-semibold text-[color:var(--ink-soft)] transition"
                aria-label={theme === "light" ? "다크 모드" : "라이트 모드"}
              >
                {theme === "light" ? <Moon size={18} strokeWidth={2} /> : <Sun size={18} strokeWidth={2} />}
                <span>{theme === "light" ? "다크 모드" : "라이트 모드"}</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="flex flex-1 items-center justify-center gap-2 rounded-[1.2rem] bg-[#fef2f2] py-3 text-sm font-semibold text-[#dd7a5f] transition"
                aria-label="로그아웃"
              >
                <LogOut size={18} strokeWidth={2} />
                <span className="whitespace-nowrap">로그아웃</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <NotificationPanel
        userId={userId}
        isOpen={notifOpen}
        onClose={() => setNotifOpen(false)}
        onUnreadChange={setUnreadCount}
      />
    </>
  );
}

export default Navbar;
