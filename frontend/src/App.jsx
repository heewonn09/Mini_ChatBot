import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import AppLayout from "./layouts/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import LogPage from "./pages/LogPage";
import AnalysisPage from "./pages/AnalysisPage";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";
import AuthPage from "./pages/AuthPage";
import usePreferences from "./hooks/usePreferences";

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("auth_user");
    return saved ? JSON.parse(saved) : null;
  });
  const prefs = usePreferences();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", prefs.theme);
  }, [prefs.theme]);

  const onAuth = (nextUser) => {
    setUser(nextUser);
    localStorage.setItem("auth_user", JSON.stringify(nextUser));
  };

  const onLogout = () => {
    setUser(null);
    localStorage.removeItem("auth_user");
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage t={prefs.t} onAuth={onAuth} />} />
        <Route
          path="/"
          element={user ? <AppLayout user={user} prefs={prefs} onLogout={onLogout} /> : <Navigate to="/auth" replace />}
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="log" element={<LogPage />} />
          <Route path="analysis" element={<AnalysisPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
