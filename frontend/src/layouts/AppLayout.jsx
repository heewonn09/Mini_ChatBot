import Navbar from '../components/navigation/Navbar';

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1b1b24,_#09090b_58%)] text-zinc-100">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col lg:flex-row">
        <Navbar />

        <main className="flex-1 p-6 sm:p-8 lg:p-10">
          <div className="rounded-3xl border border-zinc-800/70 bg-zinc-900/40 p-6 shadow-2xl shadow-black/30 sm:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
