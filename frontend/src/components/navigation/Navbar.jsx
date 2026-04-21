import { NavLink } from "react-router-dom";

function Navbar() {
  const menu = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Log", path: "/log" },
    { name: "Analysis", path: "/analysis" },
    { name: "Chat", path: "/chat" },
    { name: "Profile", path: "/profile" },
  ];

  return (
    <aside className="w-60 bg-zinc-900 border-r border-zinc-800 p-4">
      <h1 className="text-xl font-bold mb-6">MindTrack</h1>

      <nav className="flex flex-col gap-2">
        {menu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `px-4 py-2 rounded-lg text-sm transition ${
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`
            }
          >
            {item.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Navbar;