const navItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Log', path: '/log' },
  { label: 'Analysis', path: '/analysis' },
  { label: 'Chat', path: '/chat' },
  { label: 'Profile', path: '/profile' },
];

function Navbar() {
  const pathname = window.location.pathname;

  return (
    <aside className="sticky top-0 h-screen w-full max-w-64 border-r border-zinc-800 bg-zinc-950/70 p-6 backdrop-blur-md">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">MindTrack</p>
        <h1 className="mt-2 text-xl font-semibold text-zinc-100">Behavior Dashboard</h1>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path || (pathname === '/' && item.path === '/dashboard');

          return (
            <a
              key={item.path}
              className={`flex items-center rounded-xl px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-zinc-100'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
              }`}
              href={item.path}
            >
              {item.label}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}

export default Navbar;
