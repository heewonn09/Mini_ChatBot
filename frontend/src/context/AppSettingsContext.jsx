import { createContext, useContext, useEffect, useState } from "react";

const AppSettingsContext = createContext(null);

export function AppSettingsProvider({ children }) {
  const [theme, setTheme] = useState(localStorage.getItem("mindflow_theme") || "light");

  useEffect(() => {
    localStorage.setItem("mindflow_theme", theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <AppSettingsContext.Provider value={{ theme, setTheme }}>
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
