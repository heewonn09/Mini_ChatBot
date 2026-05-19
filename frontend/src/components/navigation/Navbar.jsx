import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  CirclePlus,
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
} from "lucide-react";
import { fetchNotifications, getStoredUserId, logOut } from "../../api/api";
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

function Navbar() {
  const { theme, setTheme } = useAppSettings();
  const m = useLang();
  const userId = getStoredUserId();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const poll = async () => {
      try {
        const data = await fetchNotifications(userId);
        setUnreadCount(data.unread_count ?? 0);
      } catch { /* ignore */ }
    };
    poll();
    const id = setInterval(poll, 60000);
    return () => clearInterval(id);
  }, [userId]);

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
              onClick={async () => {
                await logOut();
                navigate("/auth", { replace: true });
              }}
            >
              <LogOut size={16} /> <span>로그아웃</span>
            </button>
            <div className="items-center gap-3 rounded-full border border-[rgba(24,50,53,0.08)] bg-[rgba(247,240,231,0.92)] px-4 py-2 xl:flex hidden">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0f766e]" />
              <span className="text-sm font-semibold text-[color:var(--ink)]">{m.nav.slogan}</span>
            </div>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-2 bottom-3 z-40 mx-auto max-w-lg rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-2 shadow-[var(--shadow-lg)] backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
          {NAV_PATHS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex-shrink-0 flex flex-col items-center gap-1 rounded-[1.35rem] px-2.5 py-2 text-[10px] font-semibold transition ${
                    isActive ? "bg-[color:var(--primary)] text-[color:var(--primary-contrast)]" : "text-[color:var(--ink-soft)]"
                  }`
                }
              >
                <Icon size={17} strokeWidth={2.1} />
                <span>{m.nav[item.key]}</span>
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            className="relative flex-shrink-0 flex flex-col items-center gap-1 rounded-[1.35rem] px-2.5 py-2 text-[10px] font-semibold text-[color:var(--ink-soft)] transition"
            aria-label="알림"
          >
            <Bell size={17} strokeWidth={2.1} />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#dd7a5f] text-[8px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            <span>알림</span>
          </button>
        </div>
      </nav>

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
