import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Clock3 } from "lucide-react";
import { createBehavior, fetchBehaviors } from "../api/api";

const moods = ["happy", "neutral", "stressed"];

function LogPage() {
  const { user, refreshOverview } = useOutletContext();
  const [text, setText] = useState("");
  const [emotion, setEmotion] = useState("neutral");
  const tag = "Study";
  const [list, setList] = useState([]);

  useEffect(() => {
    if (!user) return;
    fetchBehaviors(user.id, 8).then(setList);
  }, [user]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    await createBehavior(user.id, { text, emotion, tag, intensity: 6 });
    setText("");
    const data = await fetchBehaviors(user.id, 8);
    setList(data);
    await refreshOverview();
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-[#0b0d15] p-6 max-w-4xl">
        <h2 className="text-3xl font-semibold">What did you do?</h2>
        <input
          className="w-full mt-4 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-lg"
          placeholder="e.g., Studied for exam, Watched Netflix..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <h3 className="text-xl mt-6 mb-3">How did you feel?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {moods.map((m) => (
            <button
              key={m}
              onClick={() => setEmotion(m)}
              className={`rounded-xl border p-4 text-lg ${emotion === m ? "border-indigo-400 bg-indigo-500/20" : "border-zinc-700 bg-zinc-900"}`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 text-zinc-400">
          <Clock3 size={16} /> Current time
        </div>

        <button onClick={handleSubmit} className="w-full mt-6 rounded-xl py-4 text-xl font-semibold bg-gradient-to-r from-indigo-500 to-fuchsia-600">
          + Log Behavior
        </button>
      </div>

      <div className="max-w-4xl">
        <h3 className="text-2xl mb-3">Recent Activity</h3>
        <div className="space-y-3">
          {list.map((item) => (
            <div key={item.id} className="rounded-xl border border-zinc-800 bg-[#0b0d15] p-4 flex items-center justify-between">
              <div>{item.text}</div>
              <div className="text-zinc-500">{new Date(item.created_at).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default LogPage;
