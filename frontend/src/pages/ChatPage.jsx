import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";
import { askAssistant, fetchChatBootstrap } from "../api/api";

const fallbackSuggestions = [
  "Why am I unproductive?",
  "Analyze my habits",
  "How can I focus better?",
  "What's my best time to study?",
];

function ChatPage() {
  const { user, t } = useOutletContext();
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
    const data = await askAssistant(user.id, value);
    setMessages([...next, { role: "assistant", text: data.answer }]);
    setSending(false);
  };

  if (loading) {
    return <Card className="p-6 text-zinc-300">{t.chatLoading}</Card>;
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-5xl flex-col space-y-6">
      <PageHeader
        variant="icon"
        badgeIcon={Bot}
        title="Chat Assistant"
        description="Ask me anything about your behavior patterns"
      />

      <div className="flex flex-1 flex-col justify-between gap-6">
        <div className="space-y-4 overflow-y-auto pr-1">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" ? (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white">
                  <Sparkles size={18} strokeWidth={2.2} />
                </div>
              ) : null}

              <div
                className={`max-w-[78%] rounded-[1.45rem] border px-5 py-4 text-[1rem] leading-8 ${
                  message.role === "assistant"
                    ? "border-zinc-800/80 bg-[#101014] text-zinc-50"
                    : "border-violet-500/40 bg-violet-500/10 text-zinc-50"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
              </div>
            </div>
          ))}

          {sending ? (
            <div className="flex gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white">
                <Sparkles size={18} strokeWidth={2.2} />
              </div>
              <div className="rounded-[1.45rem] border border-zinc-800/80 bg-[#101014] px-5 py-4 text-zinc-400">
                Thinking...
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>

        <div className="space-y-4">
          {messages.length === 1 ? (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => send(item)}
                  className="rounded-2xl border border-zinc-800/80 bg-[#101014] px-4 py-2.5 text-[0.98rem] font-medium text-zinc-200 transition hover:border-zinc-700 hover:text-zinc-50"
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex items-center gap-3 rounded-[1.45rem] border border-zinc-800/80 bg-[#101014] p-2.5">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="flex-1 bg-transparent px-3 py-2 text-[1rem] text-zinc-50 outline-none placeholder:text-zinc-500"
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
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={18} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ChatPage;
