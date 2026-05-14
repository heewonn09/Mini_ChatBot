import { Pencil, Trash2 } from "lucide-react";

function ChatSidebar({ sessions, currentId, onSelect, onNew, onDelete, t }) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[rgba(24,50,53,0.08)] bg-[rgba(247,240,231,0.6)] dark:bg-[rgba(15,20,25,0.6)]">
      <div className="p-3">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded-[1rem] border border-[rgba(24,50,53,0.12)] bg-white/70 px-3 py-2.5 text-sm font-semibold text-[color:var(--ink)] shadow-[var(--shadow-sm)] transition hover:bg-white active:scale-95"
        >
          <Pencil size={14} strokeWidth={2.4} />
          {t("newChat")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {sessions.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-[color:var(--ink-soft)]">{t("noSessions")}</p>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`group relative mb-1 flex cursor-pointer items-center justify-between rounded-[0.85rem] px-3 py-2.5 transition-colors ${
                s.id === currentId
                  ? "bg-[#def2ee] text-[#0f766e]"
                  : "hover:bg-[rgba(24,50,53,0.06)] text-[color:var(--ink)]"
              }`}
            >
              <span className="flex-1 truncate pr-1 text-sm font-medium">{s.title}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(s.id);
                }}
                className="shrink-0 rounded-md p-1 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
              >
                <Trash2 size={13} strokeWidth={2.2} />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

export default ChatSidebar;
