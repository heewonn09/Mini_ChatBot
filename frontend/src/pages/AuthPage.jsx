import { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logIn, signUp, getErrorMessage, requestPasswordReset, confirmPasswordReset, kakaoOAuthLogin, googleOAuthLogin } from "../api/api";

const KAKAO_CLIENT_ID = import.meta.env.VITE_KAKAO_CLIENT_ID ?? "";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
const OAUTH_REDIRECT = typeof window !== "undefined" ? window.location.origin + "/auth" : "";

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M9 1C4.582 1 1 3.895 1 7.455c0 2.284 1.52 4.286 3.816 5.438L3.9 16.06c-.07.252.21.455.434.308L8.1 13.85c.3.022.6.033.9.033 4.418 0 8-2.895 8-6.428C17 3.895 13.418 1 9 1z" fill="#191919"/>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function PasswordField({ placeholder, value, onChange, required, minLength }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        className="app-field pr-12"
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        minLength={minLength}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[color:var(--ink-soft)] transition hover:text-[color:var(--ink)]"
        aria-label={show ? "비밀번호 숨기기" : "비밀번호 보기"}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

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

  const handleOAuthCallback = useCallback(async (provider, code) => {
    setLoading(true);
    setError("");
    try {
      const redirectUri = OAUTH_REDIRECT;
      const result = provider === "kakao"
        ? await kakaoOAuthLogin(code, redirectUri)
        : await googleOAuthLogin(code, redirectUri);
      setWelcome(result.isNewUser ? WELCOME_NEW : WELCOME_BACK);
      setTimeout(() => navigate("/dashboard", { replace: true }), 1800);
    } catch (err) {
      setError(getErrorMessage(err, "소셜 로그인에 실패했습니다. 다시 시도해주세요."));
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (resetToken) { setMode("reset"); return; }
    const oauthCode = searchParams.get("code");
    const oauthState = searchParams.get("state");
    if (oauthCode && (oauthState === "kakao" || oauthState === "google")) {
      handleOAuthCallback(oauthState, oauthCode);
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

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
        setTimeout(() => navigate("/dashboard", { replace: true }), 1800);

      } else if (mode === "login") {
        const result = await logIn({ username_or_email: form.username_or_email, password: form.password });
        setWelcome(result.isNewUser ? WELCOME_NEW : WELCOME_BACK);
        setTimeout(() => navigate("/dashboard", { replace: true }), 1800);

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
            <button type="button" className={`${mode === "login" ? "app-primary-button" : "app-secondary-button"} flex-1`} onClick={() => switchMode("login")}>로그인</button>
            <button type="button" className={`${mode === "signup" ? "app-primary-button" : "app-secondary-button"} flex-1`} onClick={() => switchMode("signup")}>회원가입</button>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">

          {/* 회원가입 필드 */}
          {mode === "signup" && (
            <>
              <input className="app-field" placeholder="사용자 이름" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} required />
              <input className="app-field" type="email" placeholder="이메일" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
              <PasswordField placeholder="비밀번호 (8자 이상)" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required />
            </>
          )}

          {/* 로그인 필드 */}
          {mode === "login" && (
            <>
              <input className="app-field" type="email" placeholder="이메일" value={form.username_or_email} onChange={(e) => setForm((p) => ({ ...p, username_or_email: e.target.value }))} required />
              <PasswordField placeholder="비밀번호" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required />
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
              <PasswordField placeholder="새 비밀번호 (8자 이상)" value={form.newPassword} onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))} required minLength={8} />
              <PasswordField placeholder="비밀번호 확인" value={form.confirmPassword} onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))} required minLength={8} />
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

        {/* ─── 소셜 로그인 (로그인/회원가입 모드에서만 표시) ─── */}
        {(mode === "login" || mode === "signup") && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[rgba(24,50,53,0.1)]" />
              <span className="text-xs text-[color:var(--ink-soft)]">또는 소셜 계정으로</span>
              <div className="h-px flex-1 bg-[rgba(24,50,53,0.1)]" />
            </div>

            {/* 카카오 */}
            <button
              type="button"
              disabled={!KAKAO_CLIENT_ID || loading}
              onClick={() => {
                if (!KAKAO_CLIENT_ID) { setError("카카오 클라이언트 ID가 설정되지 않았습니다."); return; }
                const params = new URLSearchParams({ client_id: KAKAO_CLIENT_ID, redirect_uri: OAUTH_REDIRECT, response_type: "code", state: "kakao" });
                window.location.href = `https://kauth.kakao.com/oauth/authorize?${params}`;
              }}
              className="flex w-full items-center justify-center gap-3 rounded-[1rem] bg-[#FEE500] px-4 py-3 text-sm font-bold text-[#191919] transition hover:brightness-95 disabled:opacity-40"
            >
              <KakaoIcon />
              카카오로 시작하기
            </button>

            {/* 구글 */}
            <button
              type="button"
              disabled={!GOOGLE_CLIENT_ID || loading}
              onClick={() => {
                if (!GOOGLE_CLIENT_ID) { setError("구글 클라이언트 ID가 설정되지 않았습니다."); return; }
                const params = new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, redirect_uri: OAUTH_REDIRECT, response_type: "code", scope: "openid email profile", state: "google" });
                window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
              }}
              className="flex w-full items-center justify-center gap-3 rounded-[1rem] border border-[rgba(24,50,53,0.12)] bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
            >
              <GoogleIcon />
              구글로 시작하기
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

export default AuthPage;
