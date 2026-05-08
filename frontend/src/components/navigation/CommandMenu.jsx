import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSettings } from "../../context/AppSettingsContext";
import useAppData from "../../hooks/useAppData";
import { normalizeCategory } from "../../i18n/normalize";

function CommandMenu() {
  const { t } = useAppSettings();
  const navigate = useNavigate();
  const { overview } = useAppData();
  const [open, setOpen] = useState(false);

  const recentCommands = (overview?.recent_activity ?? []).slice(0, 3).map((item) => ({
    label: `${t("command.recent")}: ${t(`categories.${normalizeCategory(item.tag)}`)} · ${item.text.slice(0, 28)}`,
    action: () => navigate("/log"),
  }));

  const commands = useMemo(
    () => [
      { label: t("command.log"), action: () => navigate("/log") },
      { label: t("command.dashboard"), action: () => navigate("/") },
      { label: t("command.analysis"), action: () => navigate("/analysis") },
      { label: t("command.profile"), action: () => navigate("/profile") },
      ...recentCommands,
    ],
    [navigate, recentCommands, t]
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
        <p className="px-3 py-2 text-sm text-[color:var(--ink-soft)]">{t("command.hint")}</p>
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
