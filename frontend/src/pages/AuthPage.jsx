import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logIn, signUp, getErrorMessage } from "../api/api";

const WELCOME_NEW = "마인드플로우에 오신 것을 환영합니다! 함께 좋은 습관을 만들어가요 🌱";
const WELCOME_BACK = "다시 오신 것을 환영해요! 오늘도 함께 성장해봐요 👋";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "", username_or_email: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [welcome, setWelcome] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      let isNewUser = false;
      if (mode === "signup") {
        const result = await signUp({ username: form.username, email: form.email, password: form.password });
        isNewUser = result.isNewUser;
      } else {
        const result = await logIn({ username_or_email: form.username_or_email, password: form.password });
        isNewUser = result.isNewUser;
      }
      setWelcome(isNewUser ? WELCOME_NEW : WELCOME_BACK);
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
        window.location.reload();
      }, 1800);
    } catch (err) {
      setError(getErrorMessage(err, "인증에 실패했습니다."));
    } finally {
      setLoading(false);
    }
  };

  if (welcome) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-4">
        <div className="text-center">
          <div className="mb-4 text-5xl">🌿</div>
          <p className="text-xl font-semibold text-[color:var(--ink)]">{welcome}</p>
          <p className="mt-2 text-sm text-[color:var(--ink-soft)]">대시보드로 이동 중...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-4">
      <section className="app-panel app-panel-strong w-full rounded-[1.8rem] border p-8 shadow-[var(--shadow-lg)]">
        <h1 className="app-heading text-4xl text-[color:var(--ink)]">마인드플로우</h1>
        <p className="mt-3 text-[color:var(--ink-soft)]">
          {mode === "signup" ? "계정을 만들고 행동 패턴 분석을 시작하세요." : "내 계정으로 안전하게 로그인하세요."}
        </p>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            className={mode === "login" ? "app-primary-button" : "app-secondary-button"}
            onClick={() => { setMode("login"); setError(""); }}
          >
            로그인
          </button>
          <button
            type="button"
            className={mode === "signup" ? "app-primary-button" : "app-secondary-button"}
            onClick={() => { setMode("signup"); setError(""); }}
          >
            회원가입
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" ? (
            <>
              <input className="app-field" placeholder="사용자 이름" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} required />
              <input className="app-field" type="email" placeholder="이메일" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
            </>
          ) : (
            <input className="app-field" type="email" placeholder="이메일" value={form.username_or_email} onChange={(e) => setForm((p) => ({ ...p, username_or_email: e.target.value }))} required />
          )}

          <input className="app-field" type="password" placeholder="비밀번호 (8자 이상)" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required />

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <button type="submit" className="app-primary-button w-full" disabled={loading}>
            {loading ? "처리 중..." : mode === "signup" ? "계정 만들기" : "로그인"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default AuthPage;
