import { NavLink } from "react-router-dom";
import { LayoutDashboard, CirclePlus, LineChart, MessageSquare, User, Sparkles } from "lucide-react";

function Navbar() {
  const menu = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Log", path: "/log", icon: CirclePlus },
    { name: "Analysis", path: "/analysis", icon: LineChart },
    { name: "Chat", path: "/chat", icon: MessageSquare },
    { name: "Profile", path: "/profile", icon: User },
  ];

  return (
    <aside className="w-64 bg-[#070910] border-r border-zinc-800 p-5">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 flex items-center justify-center">
          <Sparkles size={18} />
        </div>
        <h1 className="text-2xl font-bold">Mindflow</h1>
      </div>

      <nav className="flex flex-col gap-2">
        {menu.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `px-4 py-3 rounded-xl text-sm transition flex items-center gap-3 ${
                  isActive
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`
              }
            >
              <Icon size={16} />
              {item.name}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export default Navbar;
