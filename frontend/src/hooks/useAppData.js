import { useCallback, useEffect, useState } from "react";
import { bootstrapDemoUser, ensureSeedLogs, fetchOverview } from "../api/api";

export default function useAppData() {
  const [user, setUser] = useState(null);
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
      try {
        setLoading(true);
        setError("");
        const createdUser = await bootstrapDemoUser();
        setUser(createdUser);
        await ensureSeedLogs(createdUser.id);
        const data = await fetchOverview(createdUser.id);
        setOverview(data);
      } catch {
        setError("We couldn't load your Mindflow data.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  return { user, overview, loading, error, refreshOverview };
}
