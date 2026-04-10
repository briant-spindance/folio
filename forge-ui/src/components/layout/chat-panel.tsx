import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Trash2, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types'
import ReactMarkdown from 'react-markdown'

const mockResponses = [
  "The **OAuth Integration** feature is currently *in-progress*, assigned to Bob with 5 story points. It's part of Sprint 3.\n\nThe feature includes:\n- Google and GitHub login support\n- Account linking for existing users\n- Session management parity with password auth",
  "Here's a summary of the current sprint:\n\n| Metric | Value |\n|--------|-------|\n| Features | 3 |\n| Issues | 2 |\n| Progress | 21/40 pts (52%) |\n| Days remaining | 4 |\n\nThe sprint goal is to ship OAuth integration and resolve critical upload bugs.",
  "Looking at the backlog, here are the top priorities:\n\n1. **User Authentication** (review) - 8 pts\n2. **OAuth Integration** (in-progress) - 5 pts\n3. **Payment Processing** (ready) - 13 pts\n4. **Email Notifications** (draft) - 3 pts\n5. **Dashboard Analytics** (draft) - 8 pts",
  "There are currently **5 open issues**:\n\n- Login Timeout on Slow Connections (networking)\n- Missing Validation on File Upload (security)\n- Password Reset Email Delayed\n- API Returns 500 on Empty Search\n\n2 of these are assigned to Sprint 3.",
]

export function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  const handleSend = useCallback(() => {
    if (!input.trim() || isStreaming) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsStreaming(true)

    // Simulate streaming response
    const response = mockResponses[messages.length % mockResponses.length]
    const assistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    }

    setTimeout(() => {
      setMessages((prev) => [...prev, assistantMsg])
      let charIndex = 0
      const interval = setInterval(() => {
        charIndex += 3
        if (charIndex >= response.length) {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: response } : m))
          )
          setIsStreaming(false)
          clearInterval(interval)
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: response.slice(0, charIndex) } : m
            )
          )
        }
      }, 20)
    }, 500)
  }, [input, isStreaming, messages.length])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary-hover transition-colors"
        aria-label="Open chat"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    )
  }

  return (
    <div className="fixed right-0 top-0 z-50 flex h-screen w-[400px] flex-col border-l border-border bg-surface shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Chat</span>
          <span className="text-[11px] text-foreground-muted bg-surface-inset rounded px-1.5 py-0.5">
            Claude Sonnet
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMessages([])}
            className="rounded p-1.5 text-foreground-muted hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Clear conversation"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded p-1.5 text-foreground-muted hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close chat"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-foreground-subtle text-center">
              Ask about your project&mdash;features,<br />issues, sprints, or docs.
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'max-w-[85%] rounded-lg px-3 py-2 text-sm',
              msg.role === 'user'
                ? 'ml-auto bg-primary/10 text-foreground'
                : 'bg-surface-raised text-foreground'
            )}
          >
            {msg.role === 'assistant' ? (
              <div className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_table]:my-2 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_code]:text-xs [&_code]:bg-surface-inset [&_code]:px-1 [&_code]:rounded text-foreground [&_strong]:text-foreground [&_th]:text-foreground-muted [&_td]:text-foreground">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            ) : (
              msg.content
            )}
          </div>
        ))}
        {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="max-w-[85%] rounded-lg bg-surface-raised px-3 py-2">
            <div className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground-muted animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 rounded-full bg-foreground-muted animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 rounded-full bg-foreground-muted animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-lg border border-border bg-surface-inset p-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your project..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-foreground-subtle outline-none min-h-[20px] max-h-[120px]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary-hover transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
