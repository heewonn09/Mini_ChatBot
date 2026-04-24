import { useOutletContext } from "react-router-dom";

function ProfilePage() {
  const { user, overview } = useOutletContext();

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-[#0b0d15] p-6">
        <h2 className="text-5xl font-bold">{user.username.replace("_", " ")}</h2>
        <p className="text-zinc-400 mt-2">Member behavior profile</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat title="Total Behaviors" value={String(overview.recent_activity.length)} />
        <Stat title="Days Active" value="7" />
        <Stat title="Current Streak" value="7 days" />
        <Stat title="Insights Generated" value={String(overview.insights.length)} />
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-[#0b0d15] p-6">
        <h3 className="text-3xl font-semibold mb-4">Weekly Goals</h3>
        {[
          ["Log 30 behaviors", 24, 30],
          ["Study 20 hours", 16, 20],
          ["Exercise 5 times", 4, 5],
          ["Sleep before 11pm", 3, 7],
        ].map(([title, current, total]) => (
          <div key={title} className="mb-5">
            <div className="flex items-center justify-between mb-1"><span>{title}</span><span className="text-zinc-400">{current} / {total}</span></div>
            <div className="h-2 rounded bg-zinc-800"><div className="h-2 rounded bg-emerald-400" style={{ width: `${(current / total) * 100}%` }} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Stat({ title, value }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0b0d15] p-5">
      <p className="text-zinc-400">{title}</p>
      <h3 className="text-4xl font-semibold mt-2">{value}</h3>
    </div>
  );
}

export default ProfilePage;
