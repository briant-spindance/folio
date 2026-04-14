import { useRef, useEffect, useCallback, useMemo, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import type { UIMessage } from "ai"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { getActiveProjectSlug } from "@/lib/api"

function aiApiPrefix(): string {
  const slug = getActiveProjectSlug()
  return slug ? `/api/projects/${slug}` : "/api"
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type ChatContext =
  | { type: "wiki_doc"; slug: string; title: string; body: string }
  | { type: "global" }
  | null

export interface DocSnapshot {
  slug: string
  title: string
  body: string
  icon: string | null
}

export type WriteResult = {
  ok: boolean
  slug: string
  title?: string
  previousSnapshot: DocSnapshot
}

// Called after the full assistant turn completes and a write tool was executed
// on the server. slug and title come from the tool input.
export type WriteToolFinishedCallback = (slug: string, title: string) => Promise<void>

// Called for streaming doc data chunks from the server
export type DocDataEvent =
  | { type: "doc-preview"; slug: string; body: string }
  | { type: "doc-write"; slug: string; title: string; body: string }

export type DocDataCallback = (event: DocDataEvent) => void

interface AIChatPanelProps {
  context: ChatContext
  selectedModel: string
  onModelChange: (model: string) => void
  onWriteToolFinished: WriteToolFinishedCallback
  onDocData: DocDataCallback
  lastWrite: WriteResult | null
  onUndo: () => void
}

// ---------------------------------------------------------------------------
// Session API — persisted server-side in {dataRoot}/ai-sessions/
// ---------------------------------------------------------------------------
interface Session {
  id: string
  name: string
  saved_at: number
  messages: UIMessage[]
}

async function apiFetchSessions(contextKey: string): Promise<Session[]> {
  try {
    const res = await fetch(`${aiApiPrefix()}/ai-sessions/${encodeURIComponent(contextKey)}`)
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

async function apiSaveSession(contextKey: string, session: Omit<Session, "id"> & { id?: string }): Promise<string> {
  const id = session.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  try {
    await fetch(`${aiApiPrefix()}/ai-sessions/${encodeURIComponent(contextKey)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...session, id }),
    })
  } catch {
    // ignore
  }
  return id
}

async function apiDeleteSession(contextKey: string, id: string): Promise<void> {
  try {
    await fetch(`${aiApiPrefix()}/ai-sessions/${encodeURIComponent(contextKey)}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    })
  } catch {
    // ignore
  }
}

function firstUserText(messages: UIMessage[]): string {
  const msg = messages.find((m) => m.role === "user")
  const part = msg?.parts.find((p) => p.type === "text")
  return part && "text" in part ? String(part.text).slice(0, 60) : "Conversation"
}

function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

// ---------------------------------------------------------------------------
// Model options
// ---------------------------------------------------------------------------
const MODEL_OPTIONS = [
  { value: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5 (Anthropic)" },
  { value: "anthropic/claude-haiku-3-5", label: "Claude Haiku 3.5 (Anthropic)" },
  { value: "openai/gpt-4o", label: "GPT-4o (OpenAI)" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o mini (OpenAI)" },
] as const

const WRITE_TOOLS = new Set(["replace_document", "edit_section"])

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AIChatPanel({
  context,
  selectedModel,
  onModelChange,
  onWriteToolFinished,
  onDocData,
  lastWrite,
  onUndo,
}: AIChatPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const historyRef2 = useRef<HTMLDivElement>(null)
  // Track the id of the current in-progress session so turns update the same entry
  const currentSessionIdRef = useRef<string | undefined>(undefined)

  // Context key for session storage — per doc slug or "global"
  const contextKey = context?.type === "wiki_doc" ? `doc:${context.slug}` : "global"
  const contextKeyRef = useRef(contextKey)
  // Track whether we've loaded the most recent session for this context key
  const [sessionLoaded, setSessionLoaded] = useState(false)
  useEffect(() => {
    if (contextKeyRef.current !== contextKey) {
      // Navigated to a different context — reset current session tracking
      currentSessionIdRef.current = undefined
      setSessionLoaded(false)
    }
    contextKeyRef.current = contextKey
  }, [contextKey])

  // Build transport each time model/context changes
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${aiApiPrefix()}/chat`,
        body: { context, model: selectedModel },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedModel, context?.type === "wiki_doc" ? (context as { slug: string }).slug : "global"]
  )

  // Stable refs so closures don't go stale
  const onWriteToolFinishedRef = useRef(onWriteToolFinished)
  useEffect(() => { onWriteToolFinishedRef.current = onWriteToolFinished }, [onWriteToolFinished])
  const onDocDataRef = useRef(onDocData)
  useEffect(() => { onDocDataRef.current = onDocData }, [onDocData])
  const contextRef = useRef(context)
  useEffect(() => { contextRef.current = context }, [context])

  const { messages, sendMessage, stop, status, setMessages } = useChat({
    transport,
    onData: (dataPart) => {
      const part = dataPart as { type: string; data: Record<string, string> }
      if (part.type === "data-doc-preview") {
        onDocDataRef.current({ type: "doc-preview", slug: part.data.slug, body: part.data.body })
      } else if (part.type === "data-doc-write") {
        onDocDataRef.current({ type: "doc-write", slug: part.data.slug, title: part.data.title, body: part.data.body })
      }
    },
    onFinish: async ({ message, messages: allMessages }) => {
      // Auto-save / update the current session after every completed turn
      if (allMessages.length > 0) {
        const id = await apiSaveSession(contextKeyRef.current, {
          id: currentSessionIdRef.current,
          name: firstUserText(allMessages),
          saved_at: Date.now(),
          messages: allMessages,
        })
        currentSessionIdRef.current = id
      }

      // Detect write tool completion
      for (const part of message.parts) {
        const partAny = part as {
          type: string
          providerExecuted?: boolean
          state?: string
          input?: Record<string, unknown>
        }
        if (!partAny.type.startsWith("tool-")) continue
        const toolName = partAny.type.slice("tool-".length)
        if (!WRITE_TOOLS.has(toolName)) continue
        if (!partAny.providerExecuted) continue
        if (partAny.state !== "output-available") continue
        const input = partAny.input ?? {}
        const slug = String(input.slug ?? "")
        const title = String(
          input.title ??
          (contextRef.current?.type === "wiki_doc" ? contextRef.current.title : slug)
        )
        if (slug) {
          await onWriteToolFinishedRef.current(slug, title)
          break
        }
      }
    },
  })

  const isStreaming = status === "streaming" || status === "submitted"

  // Restore the most recent session for this context on mount / context change
  useEffect(() => {
    if (sessionLoaded) return
    let cancelled = false
    apiFetchSessions(contextKey).then((sessions) => {
      if (cancelled) return
      setSessionLoaded(true)
      if (sessions.length > 0) {
        const latest = sessions[0]
        currentSessionIdRef.current = latest.id
        setMessages(latest.messages as UIMessage[])
      }
    })
    return () => { cancelled = true }
  }, [contextKey, sessionLoaded, setMessages])

  // Refresh session list when history panel opens
  useEffect(() => {
    if (!historyOpen) return
    setSessionsLoading(true)
    apiFetchSessions(contextKey).then((s) => {
      setSessions(s)
      setSessionsLoading(false)
    })
  }, [historyOpen, contextKey])

  // Close history dropdown on outside click
  useEffect(() => {
    if (!historyOpen) return
    function handleClick(e: MouseEvent) {
      if (historyRef2.current && !historyRef2.current.contains(e.target as Node)) {
        setHistoryOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [historyOpen])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isStreaming])

  // Auto-resize textarea
  function resizeTextarea() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  const handleSend = useCallback(() => {
    const text = textareaRef.current?.value.trim()
    if (!text || isStreaming) return
    if (textareaRef.current) {
      textareaRef.current.value = ""
      textareaRef.current.style.height = "auto"
    }
    sendMessage({ text })
  }, [sendMessage, isStreaming])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleNewSession() {
    if (messages.length > 0) {
      // Save current before clearing — fire and forget
      apiSaveSession(contextKey, {
        id: currentSessionIdRef.current,
        name: firstUserText(messages),
        saved_at: Date.now(),
        messages,
      })
    }
    currentSessionIdRef.current = undefined
    setMessages([])
    setHistoryOpen(false)
  }

  function handleRestoreSession(session: Session) {
    if (messages.length > 0) {
      apiSaveSession(contextKey, {
        id: currentSessionIdRef.current,
        name: firstUserText(messages),
        saved_at: Date.now(),
        messages,
      })
    }
    currentSessionIdRef.current = session.id
    setMessages(session.messages)
    setHistoryOpen(false)
  }

  function handleDeleteSession(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    apiDeleteSession(contextKey, id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (currentSessionIdRef.current === id) {
      currentSessionIdRef.current = undefined
    }
  }

  return (
    <>
      {/* Toolbar: model selector + session controls */}
      <div className="ai-model-selector">
        <select
          className="ai-model-select"
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={isStreaming}
        >
          {MODEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* New chat button */}
        <button
          className="ai-session-btn"
          onClick={handleNewSession}
          disabled={isStreaming}
          title="New chat"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <path d="M12 5v14" /><path d="M5 12h14" />
          </svg>
        </button>

        {/* History button + dropdown */}
        <div className="ai-session-history-wrap" ref={historyRef2}>
          <button
            className={`ai-session-btn${historyOpen ? " active" : ""}`}
            onClick={() => setHistoryOpen((o) => !o)}
            disabled={isStreaming}
            title="Chat history"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M12 7v5l4 2" />
            </svg>
          </button>

          {historyOpen && (
            <div className="ai-session-dropdown">
              <div className="ai-session-dropdown-header">Chat history</div>
              {sessionsLoading ? (
                <div className="ai-session-dropdown-empty">Loading…</div>
              ) : sessions.length === 0 ? (
                <div className="ai-session-dropdown-empty">No saved sessions yet</div>
              ) : (
                <ul className="ai-session-list">
                  {sessions.map((s) => (
                    <li key={s.id} className="ai-session-item" onClick={() => handleRestoreSession(s)}>
                      <div className="ai-session-item-name">{s.name}</div>
                      <div className="ai-session-item-meta">{formatRelativeTime(s.saved_at)}</div>
                      <button
                        className="ai-session-item-delete"
                        onClick={(e) => handleDeleteSession(e, s.id)}
                        title="Delete session"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                          <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      {messages.length === 0 ? (
        <div className="ai-chat-empty">
          <div className="ai-chat-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
              <path d="M20 3v4" /><path d="M22 5h-4" /><path d="M4 17v2" /><path d="M5 18H3" />
            </svg>
          </div>
          <p className="ai-chat-empty-title">AI Assistant</p>
          <p className="ai-chat-empty-desc">
            {context?.type === "wiki_doc"
              ? `Ask me to read, write, or edit "${context.title}". I can also answer questions about the project.`
              : "Ask me anything about this project. Navigate to a doc to enable editing."}
          </p>
        </div>
      ) : (
        <div className="ai-chat-messages">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isStreaming && (
            <div className="ai-chat-thinking">
              <div className="ai-chat-thinking-dots">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Undo banner */}
      {lastWrite && (
        <div className="ai-undo-banner">
          <div className="ai-undo-banner-text">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span className="ai-undo-banner-label">
              Saved &ldquo;{lastWrite.title ?? lastWrite.slug}&rdquo;
            </span>
          </div>
          <button className="ai-undo-btn" onClick={onUndo} title="Undo last AI edit">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
            Undo
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="ai-chat-input-area">
        <div className="ai-chat-input-row">
          <textarea
            ref={textareaRef}
            className="ai-chat-textarea"
            placeholder={
              context?.type === "wiki_doc"
                ? `Edit "${context.title}", ask a question…`
                : "Ask a question about this project…"
            }
            rows={1}
            onInput={resizeTextarea}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button className="ai-chat-stop-btn" onClick={stop} title="Stop generating">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            </button>
          ) : (
            <button className="ai-chat-send-btn" onClick={handleSend} title="Send (Enter)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// MessageBubble — renders a single UIMessage
// ---------------------------------------------------------------------------
function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user"

  return (
    <div className={`ai-chat-message ai-chat-message--${isUser ? "user" : "assistant"}`}>
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          return (
            <div key={i} className="ai-chat-bubble">
              {isUser ? (
                <span style={{ whiteSpace: "pre-wrap" }}>{part.text}</span>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
              )}
            </div>
          )
        }

        // Tool invocation parts
        if (part.type.startsWith("tool-")) {
          return <ToolCallCard key={i} part={part as ToolPartAny} />
        }

        return null
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ToolCallCard — renders the visual result of a tool call
// ---------------------------------------------------------------------------
interface ToolPartAny {
  type: string
  toolCallId: string
  toolName: string
  state: string
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  errorText?: string
}

function ToolCallCard({ part }: { part: ToolPartAny }) {
  const isError = part.state === "output-error"
  const isPending = part.state === "input-streaming" || part.state === "input-available"
  const isDone = part.state === "output-available"

  const toolLabel =
    part.toolName === "replace_document"
      ? "Replace document"
      : part.toolName === "edit_section"
        ? "Edit section"
        : part.toolName

  const detail = isDone
    ? (part.output as { message?: string } | undefined)?.message ?? "Done"
    : isError
      ? part.errorText ?? "Error"
      : "Working…"

  return (
    <div className={`ai-tool-card${isError ? " ai-tool-card--error" : ""}`}>
      <div className="ai-tool-card-icon">
        {isPending ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" style={{ animation: "spin 1s linear infinite" }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : isError ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6" /><path d="m9 9 6 6" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        )}
      </div>
      <div className="ai-tool-card-body">
        <span className="ai-tool-card-title">{toolLabel}</span>
        {part.input?.slug != null && (
          <span className="ai-tool-card-detail">{String(part.input.slug)}</span>
        )}
        <span className="ai-tool-card-detail">{detail}</span>
      </div>
    </div>
  )
}
