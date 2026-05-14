import { useState } from "react";
import { Check, Copy, RefreshCw, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownComponents = {
  code({ inline, children, ...props }) {
    if (inline) {
      return (
        <code
          className="rounded bg-[rgba(15,118,110,0.1)] px-1 py-0.5 text-[0.85em] font-mono text-[#0f766e]"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <pre className="my-3 overflow-x-auto rounded-[0.85rem] bg-[#1a2a2e] p-4 text-sm">
        <code className="font-mono text-emerald-300" {...props}>
          {children}
        </code>
      </pre>
    );
  },
  p({ children }) {
    return <p className="mb-2 last:mb-0 leading-7">{children}</p>;
  },
  ul({ children }) {
    return <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>;
  },
  strong({ children }) {
    return <strong className="font-semibold text-[color:var(--ink)]">{children}</strong>;
  },
};

function AiMessage({ content, onRegenerate, t }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="group mb-6 flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.85rem] bg-[#def2ee] text-[#0f766e]">
        <Sparkles size={15} strokeWidth={2.3} />
      </div>

      <div className="flex-1 max-w-3xl">
        <div className="rounded-[1.4rem] rounded-tl-[0.4rem] border border-[rgba(24,50,53,0.08)] bg-white/78 px-5 py-4 text-[0.97rem] text-[color:var(--ink)] shadow-[var(--shadow-sm)]">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {content}
          </ReactMarkdown>
        </div>

        <div className="mt-1.5 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[color:var(--ink-soft)] hover:text-[color:var(--ink)] transition-colors"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? t("copied") : t("copy")}
          </button>
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[color:var(--ink-soft)] hover:text-[color:var(--ink)] transition-colors"
            >
              <RefreshCw size={12} />
              {t("regenerate")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AiMessage;
