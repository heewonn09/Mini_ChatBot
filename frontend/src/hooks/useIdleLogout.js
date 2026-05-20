import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logOut } from "../api/api";

const IDLE_MS = 60 * 60 * 1000; // 1시간
const STORAGE_KEY = "app_last_active";

export default function useIdleLogout() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleVisibility = async () => {
      const now = Date.now();

      if (document.visibilityState === "visible") {
        const last = Number(localStorage.getItem(STORAGE_KEY) || 0);
        if (last > 0 && now - last > IDLE_MS) {
          try { await logOut(); } catch { /* ignore */ }
          navigate("/auth", { replace: true });
        } else {
          localStorage.setItem(STORAGE_KEY, String(now));
        }
      } else {
        // 화면을 벗어날 때 타임스탬프 저장
        localStorage.setItem(STORAGE_KEY, String(now));
      }
    };

    // 마운트 시 현재 시각 기록 (최초 접속)
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [navigate]);
}
