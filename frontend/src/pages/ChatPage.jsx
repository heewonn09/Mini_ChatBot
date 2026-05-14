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

<<<<<<< HEAD
const TYPING_SPEED_MS = 12;

async function streamText(fullText, onUpdate) {
  let displayed = "";
  for (const char of fullText) {
    displayed += char;
    onUpdate(displayed);
    await new Promise((r) => setTimeout(r, TYPING_SPEED_MS));
  }
=======
const PAGE_SIZE = 20;
const TYPING_CHUNK = 3;
const TYPING_INTERVAL_MS = 16;

let _msgId = 0;
function nextId() {
  return ++_msgId;
}
function toMsg(item) {
  return { id: nextId(), role: item.role, text: item.message };
>>>>>>> 26771d48c66de8d847f1f16365b23e49602b46de
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
<<<<<<< HEAD
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef(null);
  const abortRef = useRef(false);
=======
  const [loadingMore, setLoadingMore] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const bottomRef = useRef(null);
  const topSentinelRef = useRef(null);
  const scrollBoxRef = useRef(null);
  const offsetRef = useRef(0);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const typingTimerRef = useRef(null);
>>>>>>> 26771d48c66de8d847f1f16365b23e49602b46de

  // 세션 목록 로드
  useEffect(() => {
    if (!user) return;
    fetchChatSessions(user.id)
      .then((data) => setSessions(data.sessions ?? []))
      .catch(() => {});

<<<<<<< HEAD
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

=======
    const load = async () => {
      try {
        const [bootstrap, history] = await Promise.all([
          fetchChatBootstrap(user.id),
          fetchChatHistory(user.id, 0),
        ]);
        if (!active) return;
        const items = history.items || [];
        const normalized = items.map(toMsg);
        const msgs = normalized.length
          ? normalized
          : [{ id: nextId(), role: "assistant", text: bootstrap.intro }];
        setMessages(msgs);
        hasMoreRef.current = items.length === PAGE_SIZE;
        offsetRef.current = items.length;
        setSuggestions(
          bootstrap.suggested_prompts?.length ? bootstrap.suggested_prompts : FALLBACK_SUGGESTIONS
        );
      } catch {
        if (!active) return;
        setMessages([
          { id: nextId(), role: "assistant", text: "채팅 기록을 불러오지 못했습니다. 새로고침해주세요." },
        ]);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [user]);

  // Scroll to bottom when message count changes or sending state changes
>>>>>>> 26771d48c66de8d847f1f16365b23e49602b46de
  useEffect(() => {
    if (!loadingMore) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, sending, loadingMore]);

  // IntersectionObserver: load older messages when user scrolls to top
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel || !user || loading) return;

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting || loadingMoreRef.current || !hasMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);

        const box = scrollBoxRef.current;
        const prevScrollHeight = box?.scrollHeight ?? 0;

        try {
          const history = await fetchChatHistory(user.id, offsetRef.current);
          const items = history.items || [];
          const older = items.map(toMsg);
          setMessages((prev) => [...older, ...prev]);
          hasMoreRef.current = items.length === PAGE_SIZE;
          offsetRef.current += items.length;

          requestAnimationFrame(() => {
            if (box) box.scrollTop = box.scrollHeight - prevScrollHeight;
          });
        } catch {
          // silently ignore — user can scroll up again
        } finally {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      },
      { root: scrollBoxRef.current, threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [user, loading]);

  // Cleanup typing timer on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, []);

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
<<<<<<< HEAD
    const text = value.trim();
    if (!text || sending) return;

=======
    if (!value.trim() || sending) return;
    const userMsg = { id: nextId(), role: "user", text: value };
    setMessages((prev) => [...prev, userMsg]);
>>>>>>> 26771d48c66de8d847f1f16365b23e49602b46de
    setInput("");
    setSending(true);

    const userMsg = { role: "user", text };
    const placeholder = { role: "assistant", text: "" };
    setMessages((prev) => [...prev, userMsg, placeholder]);

    try {
<<<<<<< HEAD
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
=======
      const data = await askAssistant(user.id, value);
      const answerId = nextId();
      const fullText = data.answer;

      setMessages((prev) => [...prev, { id: answerId, role: "assistant", text: "" }]);
      setSending(false);

      let i = 0;
      typingTimerRef.current = setInterval(() => {
        i += TYPING_CHUNK;
        const chunk = fullText.slice(0, i);
        setMessages((prev) => prev.map((m) => (m.id === answerId ? { ...m, text: chunk } : m)));
        if (i >= fullText.length) {
          clearInterval(typingTimerRef.current);
          setMessages((prev) =>
            prev.map((m) => (m.id === answerId ? { ...m, text: fullText } : m))
          );
        }
      }, TYPING_INTERVAL_MS);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          text: getErrorMessage(error, "지금은 답변하지 못했어요. 잠시 후 다시 시도해주세요."),
        },
      ]);
>>>>>>> 26771d48c66de8d847f1f16365b23e49602b46de
      setSending(false);
    }
  };

<<<<<<< HEAD
  const handleRegenerate = async () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages((prev) => prev.slice(0, -1));
    await send(lastUser.text);
  };
=======
  const copyText = (id, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  if (loading) {
    return (
      <Card className="app-panel-strong p-6 text-[color:var(--ink-soft)]">
        채팅 어시스턴트를 불러오는 중...
      </Card>
    );
  }
>>>>>>> 26771d48c66de8d847f1f16365b23e49602b46de

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

<<<<<<< HEAD
              {sending && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="mb-6 flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.85rem] bg-[#def2ee] text-[#0f766e]">
                    <Sparkles size={15} strokeWidth={2.3} />
                  </div>
                  <div className="rounded-[1.4rem] rounded-tl-[0.4rem] border border-[rgba(24,50,53,0.08)] bg-white/78 px-5 py-4 text-sm text-[color:var(--ink-soft)] shadow-[var(--shadow-sm)]">
                    {t("thinking")}
                  </div>
=======
            <div className="rounded-[1.6rem] border border-[rgba(24,50,53,0.08)] bg-[rgba(247,240,231,0.92)] p-5">
              <p className="app-kicker">활용 팁</p>
              <p className="mt-3 text-[1rem] leading-7 text-[color:var(--ink-soft)]">
                짧고 직접적인 질문이 좋아요. 예: "지금 가장 먼저 고칠 패턴이 뭐야?"
              </p>
            </div>
          </div>
        </Card>

        <Card className="flex min-h-[38rem] flex-col p-4 sm:p-5">
          <div ref={scrollBoxRef} className="flex-1 space-y-4 overflow-y-auto pr-1">
            <div ref={topSentinelRef} className="h-1" />

            {loadingMore ? (
              <p className="text-center text-sm text-[color:var(--ink-soft)]">
                이전 대화 불러오는 중...
              </p>
            ) : null}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" ? (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1.2rem] bg-[#def2ee] text-[#0f766e]">
                    <Sparkles size={18} strokeWidth={2.2} />
                  </div>
                ) : null}

                <div className="group relative max-w-[80%]">
                  <div
                    className={`rounded-[1.6rem] px-5 py-4 text-[1rem] leading-8 shadow-[var(--shadow-sm)] ${
                      message.role === "assistant"
                        ? "border border-[rgba(24,50,53,0.08)] bg-white/78 text-[color:var(--ink)]"
                        : "bg-[linear-gradient(135deg,#0f766e_0%,#1b8d84_100%)] text-white"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.text}</p>
                  </div>

                  {message.role === "assistant" && message.text ? (
                    <button
                      type="button"
                      onClick={() => copyText(message.id, message.text)}
                      className="absolute -bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                      title="복사"
                    >
                      {copiedId === message.id ? (
                        <Check size={13} className="text-[#0f766e]" strokeWidth={2.5} />
                      ) : (
                        <Copy size={13} className="text-[color:var(--ink-soft)]" strokeWidth={2} />
                      )}
                    </button>
                  ) : null}
>>>>>>> 26771d48c66de8d847f1f16365b23e49602b46de
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
