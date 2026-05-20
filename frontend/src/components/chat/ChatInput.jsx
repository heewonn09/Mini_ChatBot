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
    <div className="relative rounded-[1.7rem] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-3 shadow-[var(--shadow-sm)] backdrop-blur-sm">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="block w-full resize-none bg-transparent px-2 py-2 text-[0.97rem] leading-6 text-[color:var(--ink)] outline-none placeholder:text-[color:var(--ink-soft)] disabled:opacity-50"
        style={{ maxHeight: "180px", minHeight: "44px", paddingRight: "4.25rem" }}
      />
      <button
        type="button"
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f766e_0%,#1b8d84_56%,#dd7a5f_100%)] text-white shadow-[0_18px_35px_rgba(15,118,110,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      >
        <ArrowUp size={17} strokeWidth={2.4} />
      </button>
    </div>
  );
}

export default ChatInput;
