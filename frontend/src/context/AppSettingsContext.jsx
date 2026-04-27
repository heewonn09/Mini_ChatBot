import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { messages } from "./messages";

const AppSettingsContext = createContext(null);

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

// eslint-disable-next-line react-refresh/only-export-components
export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error("useAppSettings must be used inside AppSettingsProvider");
  }
  return context;
}
