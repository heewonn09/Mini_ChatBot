import { NavLink, useNavigate } from "react-router-dom";
import {
  CirclePlus,
  LayoutDashboard,
  LineChart,
  LogOut,
  MessageSquare,
  Moon,
  Sparkles,
  Sun,
  User,
} from "lucide-react";
import { clearStoredToken } from "../../api/api";
import { useAppSettings } from "../../context/AppSettingsContext";

function linkClassName(isActive) {
  return `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
    isActive
      ? "bg-[color:var(--ink)] text-white shadow-[var(--shadow-sm)]"
      : "border border-[rgba(24,50,53,0.08)] bg-white/66 text-[color:var(--ink-soft)] hover:bg-white hover:text-[color:var(--ink)]"
  }`;
}

function Navbar() {
  const { t, language, setLanguage, theme, setTheme } = useAppSettings();
  const navigate = useNavigate();

  const navItems = [
    { name: t("nav.dashboard"), path: "/dashboard", icon: LayoutDashboard },
    { name: t("nav.log"), path: "/log", icon: CirclePlus },
    { name: t("nav.analysis"), path: "/analysis", icon: LineChart },
    { name: t("nav.chat"), path: "/chat", icon: MessageSquare },
    { name: t("nav.profile"), path: "/profile", icon: User },
  ];

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 px-4 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-[2rem] border border-white/70 bg-white/76 px-4 py-3 shadow-[var(--shadow-lg)] backdrop-blur-xl">
          <NavLink to="/dashboard" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[1.25rem] bg-[linear-gradient(135deg,#0f766e_0%,#1b8d84_56%,#dd7a5f_100%)] text-white">
              <Sparkles size={18} strokeWidth={2.2} />
            </span>
            <div>
              <div className="app-heading text-[1.8rem] leading-none text-[color:var(--ink)]">Mindflow</div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">{t("nav.studio")}</p>
            </div>
          </NavLink>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.path} to={item.path} className={({ isActive }) => linkClassName(isActive)}>
                  <Icon size={16} strokeWidth={2.05} />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <button type="button" className="app-secondary-button px-3 py-2" onClick={() => setLanguage(language === "en" ? "ko" : "en")}>KR/EN</button>
            <button type="button" className="app-secondary-button px-3 py-2" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? <Moon size={16} /> : <Sun size={16} />}</button>
            <button
              type="button"
              className="app-secondary-button px-3 py-2"
              onClick={() => {
                clearStoredToken();
                navigate("/auth", { replace: true });
              }}
            >
              <LogOut size={16} />
            </button>
            <div className="items-center gap-3 rounded-full border border-[rgba(24,50,53,0.08)] bg-[rgba(247,240,231,0.92)] px-4 py-2 xl:flex hidden">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0f766e]" />
              <span className="text-sm font-semibold text-[color:var(--ink)]">{t("nav.slogan")}</span>
            </div>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-[2rem] border border-white/70 bg-white/82 p-2 shadow-[var(--shadow-lg)] backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 rounded-[1.35rem] px-2 py-2 text-[11px] font-semibold transition ${
                    isActive ? "bg-[color:var(--ink)] text-white" : "text-[color:var(--ink-soft)]"
                  }`
                }
              >
                <Icon size={17} strokeWidth={2.1} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export default Navbar;
