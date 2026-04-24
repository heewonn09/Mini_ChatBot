import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { askAssistant } from "../api/api";

const suggestions = [
  "Why am I unproductive?",
  "Analyze my habits",
  "How can I focus better?",
  "What's my best time to study?",
];

function ChatPage() {
  const { user } = useOutletContext();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! I'm your behavior analysis assistant. What would you like to know?",
    },
  ]);

  const send = async (value) => {
    if (!value.trim()) return;
    const next = [...messages, { role: "user", text: value }];
    setMessages(next);
    setInput("");
    const data = await askAssistant(user.id, value);
    setMessages([...next, { role: "assistant", text: data.answer }]);
  };

  return (
    <section className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-5xl font-bold">Chat Assistant</h2>
        <p className="text-zinc-400 mt-2">Ask me anything about your behavior patterns</p>
      </div>

      <div className="space-y-3 min-h-[420px]">
        {messages.map((message, idx) => (
          <div key={idx} className={`rounded-xl border p-4 ${message.role === "assistant" ? "border-zinc-700 bg-zinc-900" : "border-indigo-500/40 bg-indigo-500/10"}`}>
            <p className="whitespace-pre-wrap">{message.text}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((item) => (
          <button key={item} onClick={() => send(item)} className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2">
            {item}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3" placeholder="Ask about your habits..." />
        <button onClick={() => send(input)} className="rounded-xl px-5 bg-gradient-to-r from-indigo-500 to-fuchsia-600">Send</button>
      </div>
    </section>
  );
}

export default ChatPage;
