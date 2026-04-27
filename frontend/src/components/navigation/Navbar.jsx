import { NavLink } from "react-router-dom";
import { LayoutDashboard, CirclePlus, LineChart, MessageSquare, Sparkles, User, Languages, Moon, Sun } from "lucide-react";

const navItems = [
  { key: "dashboard", path: "/dashboard", icon: LayoutDashboard },
  { key: "log", path: "/log", icon: CirclePlus },
  { key: "analysis", path: "/analysis", icon: LineChart },
  { key: "chat", path: "/chat", icon: MessageSquare },
  { key: "profile", path: "/profile", icon: User },
];

function linkClassName(isActive) {
  return `relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
    isActive ? "bg-zinc-900 text-zinc-50" : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-100"
  }`;
}

function Navbar({ prefs, onLogout }) {
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-zinc-900 bg-[var(--panel)]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <NavLink to="/dashboard" className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white">
              <Sparkles size={16} strokeWidth={2.3} />
            </span>
            <span className="text-[1.4rem] font-bold tracking-tight text-zinc-50">{prefs.t.appName}</span>
          </NavLink>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.path} to={item.path} className={({ isActive }) => linkClassName(isActive)}>
                  <Icon size={16} strokeWidth={2} />
                  <span>{prefs.t.nav[item.key]}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="ml-auto hidden items-center gap-2 md:flex">
            <button type="button" onClick={() => prefs.changeLocale(prefs.locale === "ko" ? "en" : "ko")} className="rounded-lg border border-zinc-700 px-2 py-1 text-zinc-200"><Languages size={14} /></button>
            <button type="button" onClick={() => prefs.changeTheme(prefs.theme === "dark" ? "light" : "dark")} className="rounded-lg border border-zinc-700 px-2 py-1 text-zinc-200">{prefs.theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}</button>
            <button type="button" onClick={onLogout} className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-200">{prefs.t.logout}</button>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-900 bg-[var(--panel)]/95 px-2 pb-2 pt-2 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition ${
                    isActive ? "bg-zinc-900 text-zinc-50" : "text-zinc-500"
                  }`
                }
              >
                <Icon size={17} strokeWidth={2.1} />
                <span>{prefs.t.nav[item.key]}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export default Navbar;
