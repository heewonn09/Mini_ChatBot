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
  renameChatSession,
} from "../api/api";
import { messages as i18nMessages } from "../context/messages";
import ChatSidebar from "../components/chat/ChatSidebar";
import ChatSidebarMobile from "../components/chat/ChatSidebarMobile";
import AiMessage from "../components/chat/AiMessage";
import UserMessage from "../components/chat/UserMessage";
import ChatInput from "../components/chat/ChatInput";

const FALLBACK_SUGGESTIONS = [
  "왜 나는 생산적이지 않을까요?",
  "내 습관을 분석해줘",
  "어떻게 하면 더 집중할 수 있나요?",
  "공부하기 가장 좋은 시간대가 언제인가요?",
];

const PAGE_SIZE = 20;
const TYPING_CHUNK = 3;
const TYPING_INTERVAL_MS = 16;

let _msgId = 0;
function nextId() {
  return ++_msgId;
}
function toMsg(item) {
  return { id: nextId(), role: item.role, text: item.message };
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef(null);
  const abortRef = useRef(false);
  const topSentinelRef = useRef(null);
  const scrollBoxRef = useRef(null);
  const offsetRef = useRef(0);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const typingTimerRef = useRef(null);

  // 세션 목록 + bootstrap 로드
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
      offsetRef.current = 0;
      hasMoreRef.current = false;
      setLoadingMessages(true);
      abortRef.current = false;
      try {
        const data = await fetchChatHistoryBySession(user.id, sessionId);
        if (abortRef.current) return;
        const items = data.items ?? [];
        setMessages(items.map(toMsg));
        hasMoreRef.current = items.length === PAGE_SIZE;
        offsetRef.current = items.length;
      } catch {
        if (!abortRef.current) setMessages([]);
      } finally {
        if (!abortRef.current) setLoadingMessages(false);
      }
    },
    [user]
  );

  // 스크롤 맨 아래로
  useEffect(() => {
    if (!loadingMore) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, sending, loadingMore]);

  // IntersectionObserver: 상단 스크롤 시 이전 메시지 페이지네이션
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel || !user || !currentSessionId) return;

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting || loadingMoreRef.current || !hasMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);

        const box = scrollBoxRef.current;
        const prevScrollHeight = box?.scrollHeight ?? 0;

        try {
          const history = await fetchChatHistoryBySession(
            user.id,
            currentSessionId,
            PAGE_SIZE,
            offsetRef.current
          );
          const items = history.items ?? [];
          const older = items.map(toMsg);
          setMessages((prev) => [...older, ...prev]);
          hasMoreRef.current = items.length === PAGE_SIZE;
          offsetRef.current += items.length;

          requestAnimationFrame(() => {
            if (box) box.scrollTop = box.scrollHeight - prevScrollHeight;
          });
        } catch {
          // 조용히 무시 — 사용자가 다시 위로 스크롤하면 재시도
        } finally {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      },
      { root: scrollBoxRef.current, threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [user, currentSessionId]);

  // 언마운트 시 타이핑 타이머 정리
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
      offsetRef.current = 0;
      hasMoreRef.current = false;
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

  const handleRenameSession = async (sessionId, title) => {
    if (!user) return;
    try {
      const updated = await renameChatSession(user.id, sessionId, title);
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title: updated.title } : s)));
    } catch {
      /* ignore */
    }
  };

  const handleSelectSession = (sessionId) => {
    if (sessionId === currentSessionId) return;
    offsetRef.current = 0;
    hasMoreRef.current = false;
    loadSession(sessionId);
  };

  const send = async (value) => {
    const text = value.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);

    const userMsgId = nextId();
    const placeholderId = nextId();
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", text },
      { id: placeholderId, role: "assistant", text: "" },
    ]);

    try {
      const data = await askAssistant(user.id, text, currentSessionId);
      const fullText = data.answer;
      const returnedSessionId = data.session_id;

      if (!currentSessionId || returnedSessionId !== currentSessionId) {
        setCurrentSessionId(returnedSessionId);
      }
      fetchChatSessions(user.id)
        .then((d) => setSessions(d.sessions ?? []))
        .catch(() => {});

      // setInterval 기반 타이핑 시뮬레이션
      let i = 0;
      typingTimerRef.current = setInterval(() => {
        i += TYPING_CHUNK;
        const chunk = fullText.slice(0, i);
        setMessages((prev) =>
          prev.map((m) => (m.id === placeholderId ? { ...m, text: chunk } : m))
        );
        if (i >= fullText.length) {
          clearInterval(typingTimerRef.current);
          setMessages((prev) =>
            prev.map((m) => (m.id === placeholderId ? { ...m, text: fullText } : m))
          );
        }
      }, TYPING_INTERVAL_MS);
    } catch (error) {
      let errText = "지금은 답변하지 못했어요. 잠시 후 다시 시도해주세요.";
      if (error?.code === "ECONNABORTED" || error?.message?.includes("timeout")) {
        errText = "응답 시간이 초과됐어요. AI 서버가 바쁠 수 있으니 잠시 후 다시 시도해주세요.";
      } else if (error?.response?.status === 429) {
        errText = "채팅 요청이 너무 많아요. 잠시 후 다시 시도해주세요.";
      } else if (error?.response?.status >= 500) {
        errText = "서버에 일시적인 오류가 있어요. 잠시 후 다시 시도해주세요.";
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === placeholderId ? { ...m, text: errText } : m))
      );
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
    <div className="-mx-4 -mt-4 flex sm:-mx-6 lg:-mx-8" style={{ height: "calc(100vh - 7rem)" }}>
      {/* 모바일 드로어 사이드바 (sm 미만) */}
      <ChatSidebarMobile
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sessions={sessions}
        currentId={currentSessionId}
        onSelect={handleSelectSession}
        onNew={handleNewSession}
        onDelete={handleDeleteSession}
        onRename={handleRenameSession}
        t={t}
      />

      {/* 데스크톱 인라인 사이드바 (sm 이상) */}
      {sidebarOpen && (
        <div className="hidden sm:block">
          <ChatSidebar
            sessions={sessions}
            currentId={currentSessionId}
            onSelect={handleSelectSession}
            onNew={handleNewSession}
            onDelete={handleDeleteSession}
            onRename={handleRenameSession}
            t={t}
          />
        </div>
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
        <div ref={scrollBoxRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div ref={topSentinelRef} className="h-1" />

          {loadingMore && (
            <p className="py-2 text-center text-sm text-[color:var(--ink-soft)]">
              이전 대화 불러오는 중...
            </p>
          )}

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
                    key={msg.id}
                    content={msg.text}
                    onRegenerate={idx === messages.length - 1 && !sending ? handleRegenerate : null}
                    t={t}
                  />
                ) : (
                  <UserMessage key={msg.id} content={msg.text} />
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
