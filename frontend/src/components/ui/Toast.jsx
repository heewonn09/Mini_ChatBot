import { useEffect, useRef } from "react";
import { CheckCircle, Info, X, XCircle } from "lucide-react";

const ICONS = {
  success: <CheckCircle size={16} strokeWidth={2.2} />,
  error: <XCircle size={16} strokeWidth={2.2} />,
  info: <Info size={16} strokeWidth={2.2} />,
};

const COLORS = {
  success: "bg-[#def2ee] text-[#0f766e] border-[rgba(15,118,110,0.2)]",
  error: "bg-[#f8e2d9] text-[#c86f56] border-[rgba(200,111,86,0.2)]",
  info: "bg-[#f8ecd7] text-[#b67f20] border-[rgba(182,127,32,0.2)]",
};

function ToastItem({ toast, onDismiss }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    requestAnimationFrame(() => el.classList.remove("opacity-0", "translate-y-2"));
  }, []);

  return (
    <div
      ref={ref}
      className={`flex items-center gap-3 rounded-[1.1rem] border px-4 py-3 text-sm font-semibold shadow-[var(--shadow-sm)] backdrop-blur-sm transition-all duration-300 opacity-0 translate-y-2 ${COLORS[toast.type] ?? COLORS.info}`}
    >
      {ICONS[toast.type] ?? ICONS.info}
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X size={14} strokeWidth={2.4} />
      </button>
    </div>
  );
}

function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2 md:bottom-8">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
