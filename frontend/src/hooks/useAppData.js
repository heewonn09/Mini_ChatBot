import { useCallback, useEffect, useMemo, useState } from "react";
import {
  bootstrapDemoUser,
  ensureSeedLogs,
  fetchOverview,
  getErrorMessage,
} from "../api/api";

const FALLBACK_OVERVIEW = {
  welcome_name: "there",
  stat_cards: [],
  daily_timeline: [],
  emotion_trends: [],
  habit_frequency: [],
  insights: [
    {
      title: "No data available",
      description: "Mindflow is in fallback mode. Please verify your API connection and try again.",
      type: "info",
    },
  ],
  recent_activity: [],
};

export default function useAppData() {
  const [user, setUser] = useState(null);
  const [overview, setOverview] = useState(FALLBACK_OVERVIEW);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const mergedOverview = useMemo(
    () => ({
      ...FALLBACK_OVERVIEW,
      ...(overview || {}),
    }),
    [overview]
  );

  const refreshOverview = useCallback(
    async (userId) => {
      const targetId = userId ?? user?.id;
      if (!targetId) {
        console.warn("[useAppData.refreshOverview] Missing userId; returning fallback overview.");
        setOverview(FALLBACK_OVERVIEW);
        return FALLBACK_OVERVIEW;
      }

      try {
        const data = await fetchOverview(targetId);
        const safeData = data || FALLBACK_OVERVIEW;
        setOverview(safeData);
        setError("");
        return safeData;
      } catch (requestError) {
        console.error("[useAppData.refreshOverview] Failed to fetch overview", requestError);
        setError(getErrorMessage(requestError, "We couldn't refresh your dashboard data."));
        setOverview((prev) => prev || FALLBACK_OVERVIEW);
        return null;
      }
    },
    [user]
  );

  useEffect(() => {
    let active = true;

    const init = async () => {
      setLoading(true);
      setError("");

      try {
        // 1) bootstrapDemoUser
        const me = await bootstrapDemoUser();
        if (!active) return;

        if (!me?.id) {
          setUser(null);
          setOverview(FALLBACK_OVERVIEW);
          setError("Unable to bootstrap user session.");
          return;
        }

        setUser(me);

        // 2) ensureSeedLogs (non-fatal)
        try {
          await ensureSeedLogs(me.id);
        } catch (seedError) {
          console.warn("[useAppData.init] ensureSeedLogs failed; continuing.", seedError);
        }

        // 3) fetchOverview (non-fatal fallback)
        try {
          const data = await fetchOverview(me.id);
          if (active) {
            setOverview(data || FALLBACK_OVERVIEW);
          }
        } catch (overviewError) {
          console.warn("[useAppData.init] fetchOverview failed; using fallback overview.", overviewError);
          if (active) {
            setOverview(FALLBACK_OVERVIEW);
            setError(getErrorMessage(overviewError, "We couldn't load your Mindflow overview."));
          }
        }
      } catch (initError) {
        if (active) {
          setUser(null);
          setOverview(FALLBACK_OVERVIEW);
          setError(getErrorMessage(initError, "We couldn't initialize your Mindflow data."));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      active = false;
    };
  }, []);

  return { user, overview: mergedOverview, loading, error, refreshOverview };
}
