import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import ChatSidebar from "./ChatSidebar";

function ChatSidebarMobile({ isOpen, onClose, sessions, currentId, onSelect, onNew, onDelete, onRename, t }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  return (
    <>
      {/* backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}

      {/* slide panel */}
      <div
        ref={panelRef}
        className={`fixed left-0 top-0 z-50 h-full w-72 bg-[rgba(247,240,231,0.97)] shadow-[var(--shadow-lg)] transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-end border-b border-[rgba(24,50,53,0.08)] px-3 py-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[color:var(--ink-soft)] transition hover:bg-black/5"
            aria-label={t("closeSidebar")}
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>
        <div className="h-[calc(100%-3rem)] overflow-hidden">
          <ChatSidebar
            sessions={sessions}
            currentId={currentId}
            onSelect={(id) => { onSelect(id); onClose(); }}
            onNew={() => { onNew(); onClose(); }}
            onDelete={onDelete}
            onRename={onRename}
            t={t}
          />
        </div>
      </div>
    </>
  );
}

export default ChatSidebarMobile;
