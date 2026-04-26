import { useEffect, useState } from "react";
import {
  bootstrapDemoUser,
  ensureSeedLogs,
  fetchOverview
} from "../api/api";

function useAppData() {
  const [user, setUser] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const u = await bootstrapDemoUser();   // 🔥 핵심
        await ensureSeedLogs(u.id);            // 🔥 데이터 생성

        const o = await fetchOverview(u.id);

        setUser(u);
        setOverview(o);
      } catch (err) {
        console.error(err);
        setError("We couldn't load your Mindflow data.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  return { user, overview, loading, error };
}

export default useAppData;