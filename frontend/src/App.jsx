import AppLayout from './layouts/AppLayout';
import AnalysisPage from './pages/AnalysisPage';
import ChatPage from './pages/ChatPage';
import DashboardPage from './pages/DashboardPage';
import LogPage from './pages/LogPage';
import ProfilePage from './pages/ProfilePage';
import { usePathname } from './hooks/usePathname';

const pageByPath = {
  '/': DashboardPage,
  '/dashboard': DashboardPage,
  '/log': LogPage,
  '/analysis': AnalysisPage,
  '/chat': ChatPage,
  '/profile': ProfilePage,
};

function App() {
  const pathname = usePathname();
  const ActivePage = pageByPath[pathname] ?? DashboardPage;

  return (
    <AppLayout>
      <ActivePage />
    </AppLayout>
  );
}

export default App;
