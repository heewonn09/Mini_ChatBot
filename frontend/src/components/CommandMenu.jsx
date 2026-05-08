import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSettings } from "../context/AppSettingsContext";

function CommandMenu() {
  const { t } = useAppSettings();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const commands = useMemo(() => [
    { key: "dashboard", label: t("command.goDashboard"), action: () => navigate("/dashboard") },
    { key: "log", label: t("command.goLog"), action: () => navigate("/log") },
    { key: "analysis", label: t("command.goAnalysis"), action: () => navigate("/analysis") },
    { key: "profile", label: t("command.goProfile"), action: () => navigate("/profile") },
  ], [navigate, t]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-24" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl rounded-2xl border border-white/30 bg-white/75 p-4 backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
        <p className="mb-2 text-xs font-semibold text-[color:var(--ink-soft)]">{t("command.shortcut")}</p>
        <input className="app-field mb-3" autoFocus placeholder={t("command.hint")} value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="space-y-2">
          {filtered.map((item) => (
            <button key={item.key} className="w-full rounded-xl border border-[color:var(--border)] bg-white/70 px-3 py-2 text-left" onClick={() => { item.action(); setOpen(false); }}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CommandMenu;
