/**
 * You are a senior React frontend engineer.
 *
 * Refactor this App component into a proper routing structure using react-router-dom.
 *
 * Requirements:
 * - Replace custom routing (usePathname) with react-router-dom
 * - Use BrowserRouter, Routes, Route
 * - Wrap pages with AppLayout
 * - Do NOT break existing components
 *
 * Pages:
 * - DashboardPage (/, /dashboard)
 * - LogPage (/log)
 * - AnalysisPage (/analysis)
 * - ChatPage (/chat)
 * - ProfilePage (/profile)
 *
 * Only modify this file.
 */
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import AnalysisPage from "./pages/AnalysisPage";
import ChatPage from "./pages/ChatPage";
import DashboardPage from "./pages/DashboardPage";
import LogPage from "./pages/LogPage";
import ProfilePage from "./pages/ProfilePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          }
        />
        <Route
          path="/dashboard"
          element={
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          }
        />
        <Route
          path="/log"
          element={
            <AppLayout>
              <LogPage />
            </AppLayout>
          }
        />
        <Route
          path="/analysis"
          element={
            <AppLayout>
              <AnalysisPage />
            </AppLayout>
          }
        />
        <Route
          path="/chat"
          element={
            <AppLayout>
              <ChatPage />
            </AppLayout>
          }
        />
        <Route
          path="/profile"
          element={
            <AppLayout>
              <ProfilePage />
            </AppLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
