import { useState } from "react";
import Card from "../components/ui/Card";
import { createUser, loginUser } from "../api/api";

function AuthPage({ t, onAuth }) {
  const [mode, setMode] = useState("signup");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      if (mode === "signup") {
        const user = await createUser({ username, email });
        onAuth(user);
      } else {
        const user = await loginUser(identifier);
        onAuth(user);
      }
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to authenticate.");
    }
  };

  return (
    <div className="mx-auto mt-20 max-w-lg px-4">
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-zinc-50">{t.authTitle}</h1>
        <p className="mt-2 text-zinc-400">{t.authDesc}</p>

        <div className="mt-5 flex gap-2">
          {["signup", "login"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`rounded-xl px-4 py-2 ${mode === item ? "bg-violet-500 text-white" : "bg-zinc-800 text-zinc-300"}`}
            >
              {item === "signup" ? t.signup : t.login}
            </button>
          ))}
        </div>

        <form className="mt-5 space-y-3" onSubmit={submit}>
          {mode === "signup" ? (
            <>
              <input className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50" placeholder={t.username} value={username} onChange={(e) => setUsername(e.target.value)} />
              <input className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50" placeholder={t.email} value={email} onChange={(e) => setEmail(e.target.value)} />
            </>
          ) : (
            <input className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50" placeholder={t.identifier} value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          )}

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-600 px-4 py-2 font-semibold text-white">
            {t.submit}
          </button>
        </form>
      </Card>
    </div>
  );
}

export default AuthPage;
