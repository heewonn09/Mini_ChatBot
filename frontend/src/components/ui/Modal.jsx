import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

function Modal({
  isOpen,
  onClose,
  title,
  children,
  onConfirm,
  confirmLabel = "확인",
  cancelLabel = "취소",
  confirmDestructive = false,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-[1.85rem] bg-white/95 p-6 shadow-[var(--shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[color:var(--ink)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[color:var(--ink-soft)] transition hover:bg-black/5"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div className="mb-6 text-sm text-[color:var(--ink-soft)]">{children}</div>

        {onConfirm && (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[0.75rem] px-4 py-2 text-sm font-medium text-[color:var(--ink-soft)] transition hover:bg-black/5"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`rounded-[0.75rem] px-4 py-2 text-sm font-semibold text-white transition active:scale-95 ${
                confirmDestructive
                  ? "bg-[#dd7a5f] hover:bg-[#c96e54]"
                  : "app-primary-button"
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
