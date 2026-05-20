import { useCallback, useEffect, useRef } from "react";
import { ArrowUp } from "lucide-react";

function ChatInput({ value, onChange, onSend, disabled, placeholder }) {
  const ref = useRef(null);

  const resizeTextarea = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    const nextHeight = Math.max(44, Math.min(el.scrollHeight, 200));
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > 200 ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [resizeTextarea, value]);

  useEffect(() => {
    window.addEventListener("resize", resizeTextarea);
    return () => window.removeEventListener("resize", resizeTextarea);
  }, [resizeTextarea]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) onSend();
    }
  };

  return (
    <div className="flex items-end gap-3 rounded-[1.7rem] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-2 shadow-[var(--shadow-sm)] backdrop-blur-sm">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 resize-none bg-transparent px-3 py-2.5 text-[0.97rem] text-[color:var(--ink)] outline-none placeholder:text-[color:var(--ink-soft)] disabled:opacity-50"
        style={{ maxHeight: "200px", minHeight: "44px" }}
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
