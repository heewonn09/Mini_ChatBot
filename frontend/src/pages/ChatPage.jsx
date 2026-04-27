import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { askAssistant, fetchChatBootstrap, getErrorMessage } from "../api/api";
import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";

const fallbackSuggestions = [
  "Why am I unproductive?",
  "Analyze my habits",
  "How can I focus better?",
  "What's my best time to study?",
];

function ChatPage() {
  const { user } = useOutletContext();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState(fallbackSuggestions);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const load = async () => {
      const bootstrap = await fetchChatBootstrap(user.id);
      if (!active) return;
      setMessages([{ role: "assistant", text: bootstrap.intro }]);
      setSuggestions(bootstrap.suggested_prompts?.length ? bootstrap.suggested_prompts : fallbackSuggestions);
      setLoading(false);
    };

    load();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = async (value) => {
    if (!value.trim()) return;
    const next = [...messages, { role: "user", text: value }];
    setMessages(next);
    setInput("");
    setSending(true);

    try {
      const data = await askAssistant(user.id, value);
      setMessages([...next, { role: "assistant", text: data.answer }]);
    } catch (error) {
      setMessages([
        ...next,
        {
          role: "assistant",
          text: getErrorMessage(error, "I couldn't answer that just now. Please try again in a moment."),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <Card className="app-panel-strong p-6 text-[color:var(--ink-soft)]">Loading chat assistant...</Card>;
  }

  return (
    <section className="space-y-8">
      <PageHeader
        variant="icon"
        badgeIcon={Bot}
        title="Chat Assistant"
        description="Ask for a quick interpretation of your patterns, a focus reset, or a practical next step."
      />

      <div className="grid gap-6 xl:grid-cols-[0.88fr,1.12fr]">
        <Card className="app-panel-strong p-6">
          <div className="space-y-6">
            <div className="rounded-[1.85rem] bg-[linear-gradient(140deg,#183235_0%,#1c4b4e_54%,#0f766e_100%)] p-6 text-white">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-white/14">
                <Sparkles size={20} strokeWidth={2.2} />
              </div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/70">Conversation starter</p>
              <p className="mt-4 text-[1rem] leading-8 text-white/92">{messages[0]?.text}</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <p className="app-kicker">Try asking</p>
                <h2 className="app-heading text-[2rem] text-[color:var(--ink)]">Suggested prompts</h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {suggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => send(item)}
                    className="app-chip text-sm font-semibold"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-[rgba(24,50,53,0.08)] bg-[rgba(247,240,231,0.92)] p-5">
              <p className="app-kicker">Best use</p>
              <p className="mt-3 text-[1rem] leading-7 text-[color:var(--ink-soft)]">
                Use short, direct questions. "What pattern should I fix first?" usually gives better coaching than a long prompt.
              </p>
            </div>
          </div>
        </Card>

        <Card className="flex min-h-[38rem] flex-col p-4 sm:p-5">
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" ? (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1.2rem] bg-[#def2ee] text-[#0f766e]">
                    <Sparkles size={18} strokeWidth={2.2} />
                  </div>
                ) : null}

                <div
                  className={`max-w-[80%] rounded-[1.6rem] px-5 py-4 text-[1rem] leading-8 shadow-[var(--shadow-sm)] ${
                    message.role === "assistant"
                      ? "border border-[rgba(24,50,53,0.08)] bg-white/78 text-[color:var(--ink)]"
                      : "bg-[linear-gradient(135deg,#0f766e_0%,#1b8d84_100%)] text-white"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.text}</p>
                </div>
              </div>
            ))}

            {sending ? (
              <div className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-[1.2rem] bg-[#def2ee] text-[#0f766e]">
                  <Sparkles size={18} strokeWidth={2.2} />
                </div>
                <div className="rounded-[1.6rem] border border-[rgba(24,50,53,0.08)] bg-white/78 px-5 py-4 text-[color:var(--ink-soft)] shadow-[var(--shadow-sm)]">
                  Thinking...
                </div>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>

          <div className="mt-5 border-t border-[rgba(24,50,53,0.08)] pt-5">
            <div className="flex items-center gap-3 rounded-[1.7rem] border border-[rgba(24,50,53,0.08)] bg-white/78 p-2 shadow-[var(--shadow-sm)]">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="flex-1 bg-transparent px-3 py-2 text-[1rem] text-[color:var(--ink)] outline-none placeholder:text-[color:var(--ink-soft)]"
                placeholder="Ask about your habits..."
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    send(input);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => send(input)}
                disabled={sending || !input.trim()}
                className="app-primary-button h-12 w-12 rounded-[1.25rem] px-0"
              >
                <Send size={18} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

export default ChatPage;
