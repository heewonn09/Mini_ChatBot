import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useLang } from "../../context/messages";

export default function PwaInstallBanner() {
  const m = useLang();
  const [prompt, setPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(
    () => Boolean(localStorage.getItem("pwa-banner-dismissed"))
  );

  useEffect(() => {
    if (dismissed) return;
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [dismissed]);

  if (!prompt || dismissed) return null;

  function handleInstall() {
    prompt.prompt();
    prompt.userChoice.then(() => setPrompt(null));
  }

  function handleDismiss() {
    localStorage.setItem("pwa-banner-dismissed", "1");
    setDismissed(true);
  }

  return (
    <div className="fixed bottom-20 left-3 right-3 z-50 md:bottom-6 md:left-auto md:right-6 md:w-80">
      <div className="flex items-center gap-3 rounded-[1.4rem] border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3 shadow-[var(--shadow-lg)] backdrop-blur-xl">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-gradient-to-br from-[#0f766e] to-[#dd7a5f]">
          <Download size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[color:var(--ink)]">{m.pwa.title}</p>
          <p className="text-xs text-[color:var(--ink-soft)]">{m.pwa.subtitle}</p>
        </div>
        <button
          onClick={handleInstall}
          className="rounded-xl bg-[#0f766e] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#0b5c56]"
        >
          {m.pwa.install}
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 text-[color:var(--ink-soft)] hover:text-[color:var(--ink)] transition"
          aria-label={m.pwa.close}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
