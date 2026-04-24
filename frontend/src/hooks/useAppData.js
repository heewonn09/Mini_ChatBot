import { useCallback, useEffect, useState } from "react";
import { bootstrapDemoUser, ensureSeedLogs, fetchOverview } from "../api/api";

export default function useAppData() {
  const [user, setUser] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshOverview = useCallback(async (userId) => {
    const targetId = userId ?? user?.id;
    if (!targetId) return null;
    const data = await fetchOverview(targetId);
    setOverview(data);
    return data;
  }, [user]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const createdUser = await bootstrapDemoUser();
      setUser(createdUser);
      await ensureSeedLogs(createdUser.id);
      await refreshOverview(createdUser.id);
      setLoading(false);
    };
    init();
  }, [refreshOverview]);

  return { user, overview, loading, refreshOverview };
}
