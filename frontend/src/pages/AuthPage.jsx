import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logIn, signUp, getErrorMessage, requestPasswordReset, confirmPasswordReset } from "../api/api";

const WELCOME_NEW = "마인드플로우에 오신 것을 환영합니다! 함께 좋은 습관을 만들어가요 🌱";
const WELCOME_BACK = "다시 오신 것을 환영해요! 오늘도 함께 성장해봐요 👋";

function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token");

  const [mode, setMode] = useState(resetToken ? "reset" : "login");
  const [form, setForm] = useState({
    username: "", email: "", password: "", username_or_email: "",
    forgotEmail: "", newPassword: "", confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [welcome, setWelcome] = useState("");

  useEffect(() => {
    if (resetToken) setMode("reset");
  }, [resetToken]);

  const switchMode = (m) => { setMode(m); setError(""); setSuccess(""); };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (mode === "signup") {
        const result = await signUp({ username: form.username, email: form.email, password: form.password });
        setWelcome(result.isNewUser ? WELCOME_NEW : WELCOME_BACK);
        setTimeout(() => { navigate("/dashboard", { replace: true }); window.location.reload(); }, 1800);

      } else if (mode === "login") {
        const result = await logIn({ username_or_email: form.username_or_email, password: form.password });
        setWelcome(result.isNewUser ? WELCOME_NEW : WELCOME_BACK);
        setTimeout(() => { navigate("/dashboard", { replace: true }); window.location.reload(); }, 1800);

      } else if (mode === "forgot") {
        const res = await requestPasswordReset(form.forgotEmail);
        setSuccess(res.message ?? "이메일을 확인해주세요.");

      } else if (mode === "reset") {
        if (form.newPassword !== form.confirmPassword) {
          setError("비밀번호가 일치하지 않습니다.");
          return;
        }
        const res = await confirmPasswordReset(resetToken, form.newPassword);
        setSuccess(res.message ?? "비밀번호가 변경됐습니다.");
        setTimeout(() => switchMode("login"), 2000);
      }
    } catch (err) {
      setError(getErrorMessage(err, "요청에 실패했습니다. 다시 시도해주세요."));
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

  const modeLabel = {
    login: "로그인",
    signup: "회원가입",
    forgot: "비밀번호 찾기",
    reset: "새 비밀번호 설정",
  };

  return (
    <main
      className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-8"
      style={{ paddingBottom: "calc(2rem + var(--safe-bottom, 0px))" }}
    >
      <section className="app-panel app-panel-strong w-full rounded-[1.4rem] border p-6 shadow-[var(--shadow-lg)] sm:rounded-[1.8rem] sm:p-8">
        <h1 className="app-heading text-3xl text-[color:var(--ink)] sm:text-4xl">마인드플로우</h1>
        <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
          {mode === "signup" && "계정을 만들고 행동 패턴 분석을 시작하세요."}
          {mode === "login" && "내 계정으로 안전하게 로그인하세요."}
          {mode === "forgot" && "가입한 이메일을 입력하면 재설정 링크를 보내드립니다."}
          {mode === "reset" && "새 비밀번호를 입력해주세요."}
        </p>

        {/* 로그인/회원가입 탭 (forgot/reset 모드에서는 숨김) */}
        {(mode === "login" || mode === "signup") && (
          <div className="mt-6 flex gap-2">
            <button type="button" className={mode === "login" ? "app-primary-button" : "app-secondary-button"} onClick={() => switchMode("login")}>로그인</button>
            <button type="button" className={mode === "signup" ? "app-primary-button" : "app-secondary-button"} onClick={() => switchMode("signup")}>회원가입</button>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">

          {/* 회원가입 필드 */}
          {mode === "signup" && (
            <>
              <input className="app-field" placeholder="사용자 이름" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} required />
              <input className="app-field" type="email" placeholder="이메일" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
              <input className="app-field" type="password" placeholder="비밀번호 (8자 이상)" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required />
            </>
          )}

          {/* 로그인 필드 */}
          {mode === "login" && (
            <>
              <input className="app-field" type="email" placeholder="이메일" value={form.username_or_email} onChange={(e) => setForm((p) => ({ ...p, username_or_email: e.target.value }))} required />
              <input className="app-field" type="password" placeholder="비밀번호" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required />
              <button type="button" onClick={() => switchMode("forgot")} className="text-xs text-[color:var(--ink-soft)] underline underline-offset-2 hover:text-[color:var(--ink)]">
                비밀번호를 잊으셨나요?
              </button>
            </>
          )}

          {/* 비밀번호 찾기 필드 */}
          {mode === "forgot" && (
            <>
              <input className="app-field" type="email" placeholder="가입한 이메일" value={form.forgotEmail} onChange={(e) => setForm((p) => ({ ...p, forgotEmail: e.target.value }))} required />
            </>
          )}

          {/* 비밀번호 재설정 필드 */}
          {mode === "reset" && (
            <>
              <input className="app-field" type="password" placeholder="새 비밀번호 (8자 이상)" value={form.newPassword} onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))} required minLength={8} />
              <input className="app-field" type="password" placeholder="비밀번호 확인" value={form.confirmPassword} onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))} required minLength={8} />
            </>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm font-semibold text-[#0f766e]">{success}</p>}

          <button type="submit" className="app-primary-button w-full" disabled={loading}>
            {loading ? "처리 중..." : modeLabel[mode]}
          </button>

          {/* 비밀번호 찾기/재설정 모드에서 로그인으로 돌아가기 */}
          {(mode === "forgot" || mode === "reset") && (
            <button type="button" onClick={() => switchMode("login")} className="w-full text-center text-sm text-[color:var(--ink-soft)] underline underline-offset-2">
              로그인으로 돌아가기
            </button>
          )}
        </form>
      </section>
    </main>
  );
}

export default AuthPage;
