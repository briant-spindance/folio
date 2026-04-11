import { useRef, useEffect, useCallback, useMemo } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import type { UIMessage } from "ai"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

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

  // Build transport each time model/context changes
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
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

  const { messages, sendMessage, stop, status } = useChat({
    transport,
    onData: (dataPart) => {
      // dataPart.type is "data-doc-preview" or "data-doc-write"
      const part = dataPart as { type: string; data: Record<string, string> }
      if (part.type === "data-doc-preview") {
        onDocDataRef.current({ type: "doc-preview", slug: part.data.slug, body: part.data.body })
      } else if (part.type === "data-doc-write") {
        onDocDataRef.current({ type: "doc-write", slug: part.data.slug, title: part.data.title, body: part.data.body })
      }
    },
    onFinish: async ({ message }) => {
      // Server-side tools have providerExecuted=true; onToolCall never fires for them.
      // Instead we inspect the final assistant message after the turn completes.
      // For ToolUIPart, the type is `tool-${toolName}` (e.g. "tool-replace_document").
      for (const part of message.parts) {
        const partAny = part as {
          type: string
          providerExecuted?: boolean
          state?: string
          input?: Record<string, unknown>
        }
        if (!partAny.type.startsWith("tool-")) continue

        // Extract tool name from the type discriminant ("tool-replace_document" → "replace_document")
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
          // Only handle the first write tool per turn
          break
        }
      }
    },
  })

  const isStreaming = status === "streaming" || status === "submitted"

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

  return (
    <>
      {/* Model selector */}
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
          // Spinner
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
        {part.input?.slug && (
          <span className="ai-tool-card-detail">{String(part.input.slug)}</span>
        )}
        <span className="ai-tool-card-detail">{detail}</span>
      </div>
    </div>
  )
}
