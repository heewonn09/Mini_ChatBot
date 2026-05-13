import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAppData from "../../hooks/useAppData";
import { normalizeCategory, CATEGORY_KO } from "../../utils/normalize";

function CommandMenu() {
  const navigate = useNavigate();
  const { overview } = useAppData();
  const [open, setOpen] = useState(false);

  const recentCommands = (overview?.recent_activity ?? []).slice(0, 3).map((item) => ({
    label: `최근 활동: ${CATEGORY_KO[normalizeCategory(item.tag)] ?? item.tag} · ${item.text.slice(0, 28)}`,
    action: () => navigate("/log"),
  }));

  const commands = useMemo(
    () => [
      { label: "기록하기", action: () => navigate("/log") },
      { label: "대시보드로 이동", action: () => navigate("/") },
      { label: "분석 열기", action: () => navigate("/analysis") },
      { label: "프로필 열기", action: () => navigate("/profile") },
      ...recentCommands,
    ],
    [navigate, recentCommands]
  );

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((v) => !v);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 pt-24" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl rounded-2xl border border-white/30 bg-white/80 p-3 backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
        <p className="px-3 py-2 text-sm text-[color:var(--ink-soft)]">이동할 메뉴를 선택하세요...</p>
        {commands.map((command) => (
          <button
            key={command.label}
            type="button"
            onClick={() => {
              command.action();
              setOpen(false);
            }}
            className="w-full rounded-xl px-3 py-2 text-left font-semibold hover:bg-black/5"
          >
            {command.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default CommandMenu;
