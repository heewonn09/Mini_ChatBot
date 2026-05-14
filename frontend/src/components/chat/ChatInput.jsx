import { useEffect, useRef } from "react";
import { ArrowUp } from "lucide-react";

function ChatInput({ value, onChange, onSend, disabled, placeholder }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) onSend();
    }
  };

  return (
    <div className="flex items-end gap-3 rounded-[1.7rem] border border-[rgba(24,50,53,0.1)] bg-white/80 p-2 shadow-[var(--shadow-sm)] backdrop-blur-sm">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 resize-none overflow-y-auto bg-transparent px-3 py-2.5 text-[0.97rem] text-[color:var(--ink)] outline-none placeholder:text-[color:var(--ink-soft)] disabled:opacity-50"
        style={{ maxHeight: "200px" }}
      />
      <button
        type="button"
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="app-primary-button mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] px-0 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ArrowUp size={17} strokeWidth={2.4} />
      </button>
    </div>
  );
}

export default ChatInput;
