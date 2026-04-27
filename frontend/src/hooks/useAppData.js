import { useCallback, useEffect, useState } from "react";
import { ensureSeedLogs, fetchOverview } from "../api/api";

export default function useAppData(user) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshOverview = useCallback(async (userId) => {
    const targetId = userId ?? user?.id;
    if (!targetId) return null;
    const data = await fetchOverview(targetId);
    setOverview(data);
    return data;
  }, [user]);

  useEffect(() => {
    const init = async () => {
      if (!user?.id) {
        setOverview(null);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError("");
        await ensureSeedLogs(user.id);
        const data = await fetchOverview(user.id);
        setOverview(data);
      } catch {
        setError("We couldn't load your Mindflow data.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [user]);

  return { user, overview, loading, error, refreshOverview };
}
