import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CirclePlus,
  LineChart,
  MessageSquare,
  Sparkles,
  User,
} from "lucide-react";

const navItems = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Log", path: "/log", icon: CirclePlus },
  { name: "Analysis", path: "/analysis", icon: LineChart },
  { name: "Chat", path: "/chat", icon: MessageSquare },
  { name: "Profile", path: "/profile", icon: User },
];

function linkClassName(isActive) {
  return `relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
    isActive ? "bg-zinc-900 text-zinc-50" : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-100"
  }`;
}

function Navbar() {
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-zinc-900 bg-[#05060a]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-8 px-4 sm:px-6 lg:px-8">
          <NavLink to="/dashboard" className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white">
              <Sparkles size={16} strokeWidth={2.3} />
            </span>
            <span className="text-[1.9rem] font-bold tracking-tight text-zinc-50">Mindflow</span>
          </NavLink>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.path} to={item.path} className={({ isActive }) => linkClassName(isActive)}>
                  <Icon size={16} strokeWidth={2} />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-900 bg-[#05060a]/95 px-2 pb-2 pt-2 backdrop-blur-xl md:hidden">
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
