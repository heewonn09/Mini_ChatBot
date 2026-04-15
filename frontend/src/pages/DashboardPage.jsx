import PageHeader from '../components/ui/PageHeader';

function DashboardPage() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    mostFrequent: 'YouTube',
    worstTime: '9pm - 12am',
    bestTime: '9am - 12pm',
    weeklyProgress: '+12%',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:8000/api/analysis/1');

        if (!response.ok) {
          throw new Error('API not available');
        }

        const data = await response.json();

        // 👉 여기 핵심
        setStats({
          mostFrequent: data.mostFrequent ?? 'YouTube',
          worstTime: data.worstTime ?? '9pm - 12am',
          bestTime: data.bestTime ?? '9am - 12pm',
          weeklyProgress: data.weeklyProgress ?? '+12%',
        });

      } catch (err) {
        console.log('API 실패 → 기본값 사용');
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleNavigate = (path) => {
    navigate(path);
  };

  return (
    <section>
      <PageHeader
        title="Dashboard"
        description="Your behavior summary, trends, and key insights will live here. Next step: we will add stat cards and charts based on your Figma screen."
      />
    </section>
  );
}

export default DashboardPage;