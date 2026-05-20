import { useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

function ChatSidebar({ sessions, currentId, onSelect, onNew, onDelete, onRename, t }) {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef(null);

  function startEdit(e, session) {
    e.stopPropagation();
    setEditingId(session.id);
    setEditValue(session.title);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commitEdit(id) {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== sessions.find((s) => s.id === id)?.title) {
      onRename(id, trimmed);
    }
    setEditingId(null);
  }

  function handleKeyDown(e, id) {
    if (e.key === "Enter") commitEdit(id);
    if (e.key === "Escape") setEditingId(null);
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[rgba(24,50,53,0.08)] bg-[rgba(247,240,231,0.6)] dark:bg-[rgba(15,20,25,0.6)]">
      <div className="p-3">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded-[1rem] border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-3 py-2.5 text-sm font-semibold text-[color:var(--ink)] shadow-[var(--shadow-sm)] transition hover:bg-[color:var(--surface)] active:scale-95"
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
              onClick={() => editingId !== s.id && onSelect(s.id)}
              onDoubleClick={(e) => startEdit(e, s)}
              className={`group relative mb-1 flex cursor-pointer items-center justify-between rounded-[0.85rem] px-3 py-2.5 transition-colors ${
                s.id === currentId
                  ? "bg-[color:var(--teal-soft)] text-[color:var(--teal)]"
                  : "hover:bg-[rgba(24,50,53,0.06)] text-[color:var(--ink)]"
              }`}
            >
              {editingId === s.id ? (
                <input
                  ref={inputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => commitEdit(s.id)}
                  onKeyDown={(e) => handleKeyDown(e, s.id)}
                  onClick={(e) => e.stopPropagation()}
                  maxLength={100}
                  className="flex-1 rounded bg-[color:var(--surface-strong)] px-1 text-sm font-medium text-[color:var(--ink)] outline-none ring-1 ring-[color:var(--teal)]"
                />
              ) : (
                <span className="flex-1 truncate pr-1 text-sm font-medium">{s.title}</span>
              )}
              {editingId !== s.id && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(s.id);
                  }}
                  title={t("deleteSession")}
                  className="shrink-0 rounded-md p-1 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 size={13} strokeWidth={2.2} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

export default ChatSidebar;
