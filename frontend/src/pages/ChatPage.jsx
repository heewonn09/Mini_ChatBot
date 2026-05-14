import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import {
  askAssistant,
  createChatSession,
  deleteChatSession,
  fetchChatBootstrap,
  fetchChatHistoryBySession,
  fetchChatSessions,
  getErrorMessage,
} from "../api/api";
import { messages as i18nMessages } from "../context/messages";
import ChatSidebar from "../components/chat/ChatSidebar";
import AiMessage from "../components/chat/AiMessage";
import UserMessage from "../components/chat/UserMessage";
import ChatInput from "../components/chat/ChatInput";

const FALLBACK_SUGGESTIONS = [
  "왜 나는 생산적이지 않을까요?",
  "내 습관을 분석해줘",
  "어떻게 하면 더 집중할 수 있나요?",
  "공부하기 가장 좋은 시간대가 언제인가요?",
];

const TYPING_SPEED_MS = 12;

async function streamText(fullText, onUpdate) {
  let displayed = "";
  for (const char of fullText) {
    displayed += char;
    onUpdate(displayed);
    await new Promise((r) => setTimeout(r, TYPING_SPEED_MS));
  }
}

function ChatPage() {
  const { user } = useOutletContext();
  const t = (key) => i18nMessages.ko.chat[key] ?? key;

  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState(FALLBACK_SUGGESTIONS);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef(null);
  const abortRef = useRef(false);

  // 세션 목록 로드
  useEffect(() => {
    if (!user) return;
    fetchChatSessions(user.id)
      .then((data) => setSessions(data.sessions ?? []))
      .catch(() => {});

    fetchChatBootstrap(user.id)
      .then((data) => {
        if (data.suggested_prompts?.length) setSuggestions(data.suggested_prompts);
      })
      .catch(() => {});
  }, [user]);

  // 세션 선택 시 메시지 로드
  const loadSession = useCallback(
    async (sessionId) => {
      if (!user) return;
      abortRef.current = true;
      setCurrentSessionId(sessionId);
      setMessages([]);
      setLoadingMessages(true);
      abortRef.current = false;
      try {
        const data = await fetchChatHistoryBySession(user.id, sessionId);
        if (abortRef.current) return;
        setMessages((data.items ?? []).map((item) => ({ role: item.role, text: item.message })));
      } catch {
        if (!abortRef.current) setMessages([]);
      } finally {
        if (!abortRef.current) setLoadingMessages(false);
      }
    },
    [user]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const handleNewSession = async () => {
    if (!user) return;
    try {
      const session = await createChatSession(user.id);
      setSessions((prev) => [session, ...prev]);
      setCurrentSessionId(session.id);
      setMessages([]);
    } catch {
      /* ignore */
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!user) return;
    try {
      await deleteChatSession(user.id, sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch {
      /* ignore */
    }
  };

  const handleSelectSession = (sessionId) => {
    if (sessionId === currentSessionId) return;
    loadSession(sessionId);
  };

  const send = async (value) => {
    const text = value.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);

    const userMsg = { role: "user", text };
    const placeholder = { role: "assistant", text: "" };
    setMessages((prev) => [...prev, userMsg, placeholder]);

    try {
      const data = await askAssistant(user.id, text, currentSessionId);
      const answer = data.answer;
      const returnedSessionId = data.session_id;

      // 새 세션이 서버에서 생성된 경우 세션 목록 갱신
      if (!currentSessionId || returnedSessionId !== currentSessionId) {
        setCurrentSessionId(returnedSessionId);
        const updatedSessions = await fetchChatSessions(user.id);
        setSessions(updatedSessions.sessions ?? []);
      } else {
        // 제목이 바뀔 수 있으니 갱신
        fetchChatSessions(user.id)
          .then((d) => setSessions(d.sessions ?? []))
          .catch(() => {});
      }

      // 타이핑 시뮬레이션
      await streamText(answer, (partial) => {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", text: partial };
          return next;
        });
      });
    } catch (error) {
      const errText = getErrorMessage(error, "지금은 답변하지 못했어요. 잠시 후 다시 시도해주세요.");
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", text: errText };
        return next;
      });
    } finally {
      setSending(false);
    }
  };

  const handleRegenerate = async () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages((prev) => prev.slice(0, -1));
    await send(lastUser.text);
  };

  return (
    // 레이아웃 컨테이너에서 벗어나 전체 폭·높이 점유
    <div className="-mx-4 -mt-4 flex sm:-mx-6 lg:-mx-8" style={{ height: "calc(100vh - 7rem)" }}>
      {/* 사이드바 */}
      {sidebarOpen && (
        <ChatSidebar
          sessions={sessions}
          currentId={currentSessionId}
          onSelect={handleSelectSession}
          onNew={handleNewSession}
          onDelete={handleDeleteSession}
          t={t}
        />
      )}

      {/* 메인 채팅 영역 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center gap-3 border-b border-[rgba(24,50,53,0.08)] bg-white/60 px-5 py-3 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[color:var(--ink-soft)] transition hover:bg-[rgba(24,50,53,0.06)] hover:text-[color:var(--ink)]"
            title="사이드바 토글"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect y="2" width="16" height="1.5" rx="0.75" />
              <rect y="7.25" width="16" height="1.5" rx="0.75" />
              <rect y="12.5" width="16" height="1.5" rx="0.75" />
            </svg>
          </button>

          <div className="flex h-7 w-7 items-center justify-center rounded-[0.6rem] bg-[#def2ee] text-[#0f766e]">
            <Sparkles size={14} strokeWidth={2.3} />
          </div>
          <span className="text-sm font-semibold text-[color:var(--ink)]">
            {sessions.find((s) => s.id === currentSessionId)?.title ?? t("title")}
          </span>
        </div>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          {loadingMessages ? (
            <div className="flex items-center justify-center py-16 text-sm text-[color:var(--ink-soft)]">
              {t("loading")}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-[#def2ee] text-[#0f766e]">
                <Sparkles size={24} strokeWidth={2} />
              </div>
              <p className="text-base font-semibold text-[color:var(--ink)]">{t("emptyState")}</p>
              <p className="mt-1 text-sm text-[color:var(--ink-soft)]">{t("emptyStateDesc")}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="app-chip text-sm"
                    disabled={sending}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) =>
                msg.role === "assistant" ? (
                  <AiMessage
                    key={idx}
                    content={msg.text}
                    onRegenerate={idx === messages.length - 1 && !sending ? handleRegenerate : null}
                    t={t}
                  />
                ) : (
                  <UserMessage key={idx} content={msg.text} />
                )
              )}

              {sending && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="mb-6 flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.85rem] bg-[#def2ee] text-[#0f766e]">
                    <Sparkles size={15} strokeWidth={2.3} />
                  </div>
                  <div className="rounded-[1.4rem] rounded-tl-[0.4rem] border border-[rgba(24,50,53,0.08)] bg-white/78 px-5 py-4 text-sm text-[color:var(--ink-soft)] shadow-[var(--shadow-sm)]">
                    {t("thinking")}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* 하단 고정 입력창 */}
        <div className="border-t border-[rgba(24,50,53,0.08)] bg-white/60 px-4 py-3 backdrop-blur-sm sm:px-8">
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={() => send(input)}
            disabled={sending}
            placeholder={t("placeholder")}
          />
          <p className="mt-1.5 text-center text-[0.72rem] text-[color:var(--ink-soft)]">
            Shift + Enter로 줄 바꿈 · Enter로 전송
          </p>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
