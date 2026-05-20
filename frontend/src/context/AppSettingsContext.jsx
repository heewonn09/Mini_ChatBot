import { createContext, useContext, useEffect, useState } from "react";

const AppSettingsContext = createContext(null);

export function AppSettingsProvider({ children }) {
  const [theme, setTheme] = useState(localStorage.getItem("mindflow_theme") || "light");
  const [lang, setLangState] = useState(localStorage.getItem("mindflow_lang") || "ko");

  useEffect(() => {
    localStorage.setItem("mindflow_theme", theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function setLang(value) {
    localStorage.setItem("mindflow_lang", value);
    setLangState(value);
  }

  return (
    <AppSettingsContext.Provider value={{ theme, setTheme, lang, setLang }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error("useAppSettings must be used inside AppSettingsProvider");
  }
  return context;
}
