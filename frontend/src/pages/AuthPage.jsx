import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logIn, signUp, getErrorMessage } from "../api/api";
import { useAppSettings } from "../context/AppSettingsContext";

function AuthPage() {
  const { t } = useAppSettings();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "", username_or_email: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "signup") {
        await signUp({ username: form.username, email: form.email, password: form.password });
      } else {
        await logIn({ username_or_email: form.username_or_email, password: form.password });
      }
      navigate("/dashboard", { replace: true });
      window.location.reload();
    } catch (err) {
      setError(getErrorMessage(err, "Authentication failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-4">
      <section className="app-panel app-panel-strong w-full rounded-[1.8rem] border p-8 shadow-[var(--shadow-lg)]">
        <h1 className="app-heading text-4xl text-[color:var(--ink)]">{t.auth.title}</h1>
        <p className="mt-3 text-[color:var(--ink-soft)]">{t.auth.subtitle}</p>

        <div className="mt-6 flex gap-2">
          <button type="button" className="app-secondary-button" onClick={() => setMode("login")}>{t.auth.signIn}</button>
          <button type="button" className="app-secondary-button" onClick={() => setMode("signup")}>{t.auth.signUp}</button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" ? (
            <>
              <input className="app-field" placeholder={t.auth.username} value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} required />
              <input className="app-field" placeholder={t.auth.email} value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
            </>
          ) : (
            <input className="app-field" placeholder={t.auth.loginId} value={form.username_or_email} onChange={(e) => setForm((p) => ({ ...p, username_or_email: e.target.value }))} required />
          )}

          <input className="app-field" type="password" placeholder={t.auth.password} value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required />

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <button type="submit" className="app-primary-button w-full" disabled={loading}>
            {mode === "signup" ? t.auth.submitSignUp : t.auth.submitLogin}
          </button>
        </form>
      </section>
    </main>
  );
}

export default AuthPage;
