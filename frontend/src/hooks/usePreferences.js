import { useMemo, useState } from "react";
import { messages } from "../i18n";

export default function usePreferences() {
  const [locale, setLocale] = useState(() => localStorage.getItem("locale") || "ko");
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  const t = useMemo(() => messages[locale] || messages.en, [locale]);

  const changeLocale = (next) => {
    setLocale(next);
    localStorage.setItem("locale", next);
  };

  const changeTheme = (next) => {
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return { locale, theme, t, changeLocale, changeTheme };
}
