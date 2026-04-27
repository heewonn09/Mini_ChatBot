import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AppSettingsContext = createContext(null);

const messages = {
  en: {
    nav: { dashboard: "Dashboard", log: "Log", analysis: "Analysis", chat: "Chat", profile: "Profile", studio: "Behavior studio", slogan: "Track. Reflect. Adjust." },
    auth: {
      title: "Welcome to Mindflow",
      subtitle: "Sign up first, then securely log in with your own account.",
      signIn: "Sign in",
      signUp: "Sign up",
      username: "Username",
      email: "Email",
      password: "Password",
      loginId: "Username or email",
      submitLogin: "Login",
      submitSignUp: "Create account",
    },
    common: { loading: "Loading Mindflow data..." },
  },
  ko: {
    nav: { dashboard: "대시보드", log: "기록", analysis: "분석", chat: "채팅", profile: "프로필", studio: "행동 스튜디오", slogan: "기록하고, 돌아보고, 조정하세요." },
    auth: {
      title: "마인드플로우에 오신 것을 환영합니다",
      subtitle: "먼저 회원가입하고, 내 계정으로 안전하게 로그인하세요.",
      signIn: "로그인",
      signUp: "회원가입",
      username: "사용자 이름",
      email: "이메일",
      password: "비밀번호",
      loginId: "사용자 이름 또는 이메일",
      submitLogin: "로그인",
      submitSignUp: "계정 만들기",
    },
    common: { loading: "Mindflow 데이터를 불러오는 중..." },
  },
};

export function AppSettingsProvider({ children }) {
  const [language, setLanguage] = useState(localStorage.getItem("mindflow_lang") || "en");
  const [theme, setTheme] = useState(localStorage.getItem("mindflow_theme") || "light");

  useEffect(() => {
    localStorage.setItem("mindflow_lang", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("mindflow_theme", theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      theme,
      setTheme,
      t: messages[language],
    }),
    [language, theme]
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error("useAppSettings must be used inside AppSettingsProvider");
  }
  return context;
}
