'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import { format, formatDistanceToNow } from 'date-fns'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: Date | string
  latencyMs?: number
  totalDurationMs?: number
  tokenCount?: number
}

interface ConversationItem {
  id: string
  title: string
  updatedAt: string
  _count?: { messages: number }
}

const QUICK_ACTIONS = [
  "What do I have today?",
  "What should I do right now?",
  "Plan tomorrow",
  "What am I behind on?",
  "How is my week going?",
  "Show upcoming deadlines",
  "I only have 2 hours today",
  "How is my life going?",
]

const WORKING_STATUSES = [
  "Srushti is analyzing your schedule & commitments...",
  "Checking deadlines and upcoming focus blocks...",
  "Formulating your personalized plan...",
  "Executing assistant actions and drafting response...",
]

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" />
  </svg>
)

const HistoryIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
)

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isFetchingHistory, setIsFetchingHistory] = useState(true)
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false)
  const [statusIndex, setStatusIndex] = useState(0)
  const [showQuickActions, setShowQuickActions] = useState(true)
  const [liveLatency, setLiveLatency] = useState<number | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sendTimeRef = useRef<number>(0)
  const firstTokenTimeRef = useRef<number>(0)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load chat history and conversations list on mount
  const loadChatData = async (convId?: string) => {
    setIsFetchingHistory(true)
    try {
      const url = convId ? `/api/chat?conversationId=${convId}` : '/api/chat'
      const res = await fetch(url)
      const data = await res.json()

      if (data?.conversationId) {
        setActiveConvId(data.conversationId)
      }
      if (Array.isArray(data?.conversations)) {
        setConversations(data.conversations)
      }
      if (Array.isArray(data?.messages)) {
        setMessages(data.messages)
        setShowQuickActions(data.messages.length === 0)
      }
    } catch (e) {
      console.error('Failed to load chat history', e)
    } finally {
      setIsFetchingHistory(false)
    }
  }

  useEffect(() => {
    loadChatData()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, isStreaming, scrollToBottom])

  // Cycle working status text while waiting for first token
  useEffect(() => {
    if (!isLoading || isStreaming) return
    const interval = setInterval(() => {
      setStatusIndex(prev => (prev + 1) % WORKING_STATUSES.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [isLoading, isStreaming])

  // Check for prefill from other screens
  useEffect(() => {
    const prefill = sessionStorage.getItem('srushti_prefill')
    if (prefill) {
      sessionStorage.removeItem('srushti_prefill')
      sendMessage(prefill)
    }
  }, [activeConvId])

  const startNewChat = async () => {
    try {
      const res = await fetch('/api/chat?new=true', { method: 'POST' })
      const data = await res.json()
      if (data?.conversationId) {
        setActiveConvId(data.conversationId)
        setMessages([])
        setShowQuickActions(true)
        setShowHistoryDrawer(false)
        loadChatData(data.conversationId)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Delete this conversation?')) {
      await fetch(`/api/chat?conversationId=${convId}`, { method: 'DELETE' })
      if (activeConvId === convId) {
        startNewChat()
      } else {
        loadChatData(activeConvId || undefined)
      }
    }
  }

  const selectConversation = (convId: string) => {
    setShowHistoryDrawer(false)
    loadChatData(convId)
  }

  const sendMessage = async (userText: string) => {
    const trimmed = userText.trim()
    if (!trimmed || isLoading) return

    setShowQuickActions(false)
    setInput('')
    setStatusIndex(0)
    sendTimeRef.current = performance.now()
    firstTokenTimeRef.current = 0
    setLiveLatency(null)

    const userMessage: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: trimmed,
      createdAt: new Date(),
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setIsLoading(true)
    setIsStreaming(false)

    const assistantMsgId = 'msg-' + (Date.now() + 1)
    let assistantText = ''

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConvId,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!response.ok || !response.body) {
        throw new Error('Failed to get response from Srushti')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      // Record first token latency
      const firstTokenMs = Math.round(performance.now() - sendTimeRef.current)
      firstTokenTimeRef.current = firstTokenMs
      setLiveLatency(firstTokenMs)

      // Add assistant placeholder message
      setMessages(prev => [
        ...prev,
        {
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          createdAt: new Date(),
          latencyMs: firstTokenMs,
        },
      ])

      setIsStreaming(true)

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        assistantText += chunk

        setMessages(prev =>
          prev.map(m => (m.id === assistantMsgId ? { ...m, content: assistantText } : m))
        )
      }

      // Calculate total duration & token estimation
      const totalDurationMs = Math.round(performance.now() - sendTimeRef.current)
      const estimatedTokens = Math.round(assistantText.length / 3.8)

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId
            ? { ...m, totalDurationMs, tokenCount: estimatedTokens }
            : m
        )
      )

      // Refresh conversations list in background to get updated title
      fetch('/api/chat?list=true')
        .then(r => r.json())
        .then(d => {
          if (Array.isArray(d?.conversations)) setConversations(d.conversations)
        })
        .catch(() => {})
    } catch (err: any) {
      console.error(err)
      setMessages(prev => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'assistant',
          content: "I'm having a little trouble connecting right now. Please ensure your Gemini API key is configured in the environment settings.",
          createdAt: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const adjustTextareaHeight = () => {
    const ta = inputRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
    }
  }

  return (
    <div className="app-shell">
      <AppHeader
        showBrand={true}
        showBack={false}
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              className="notif-btn"
              onClick={() => setShowHistoryDrawer(true)}
              title="Chat History"
              id="chat-history-btn"
            >
              <HistoryIcon />
            </button>
            <button
              className="notif-btn"
              onClick={startNewChat}
              title="New Conversation"
              id="new-chat-btn"
            >
              <PlusIcon />
            </button>
          </div>
        }
      />

      <div className="chat-container" style={{ height: 'calc(100dvh - 64px - 72px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Messages list */}
        <div className="chat-messages" style={{ flex: 1, overflowY: 'auto' }}>

          {/* Loading History Skeleton */}
          {isFetchingHistory && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 'var(--space-4) 0' }}>
              <div className="skeleton" style={{ height: 48, width: '65%', borderRadius: 16, alignSelf: 'flex-start' }} />
              <div className="skeleton" style={{ height: 48, width: '55%', borderRadius: 16, alignSelf: 'flex-end' }} />
            </div>
          )}

          {/* Welcome state */}
          {!isFetchingHistory && messages.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-8) var(--space-5)', textAlign: 'center', gap: 'var(--space-3)' }}>
              <div style={{ fontSize: 56, marginBottom: 'var(--space-2)' }}>🌱</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                Hi, I'm Srushti
              </div>
              <div style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', maxWidth: 280, lineHeight: 1.6 }}>
                I manage your time, track your goals, and keep your life moving. Tell me what's happening.
              </div>
              <div style={{
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--bg-muted)',
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--text-sm)',
                color: 'var(--text-secondary)',
                marginTop: 'var(--space-2)',
                fontStyle: 'italic',
              }}>
                Try: &quot;I have CAO exam on Friday and I haven&apos;t started.&quot;
              </div>
            </div>
          )}

          {/* Render messages with Latency Metrics */}
          {messages.map((message) => {
            const isUser = message.role === 'user'
            const isLatestStreamingAssistant = !isUser && isStreaming && message.id === messages[messages.length - 1]?.id

            if (!isUser && !message.content && isLoading) {
              return null // Shown by working indicator
            }

            return (
              <div key={message.id} className={`message message-${isUser ? 'user' : 'assistant'}`}>
                {!isUser && (
                  <div className="chat-srushti-avatar" style={{ width: 28, height: 28, marginBottom: 4 }}>
                    🌱
                  </div>
                )}
                {message.content && (
                  <div className="message-bubble" style={{ whiteSpace: 'pre-wrap' }}>
                    {message.content}
                    {isLatestStreamingAssistant && <span className="stream-cursor" />}
                  </div>
                )}

                {/* Micro-Diagnostics Badge (Latency, Tokens, Time) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px var(--space-2)', marginTop: 2 }}>
                  <span className="message-time" style={{ padding: 0, margin: 0 }}>
                    {format(new Date(message.createdAt || Date.now()), 'h:mm a')}
                  </span>
                  {!isUser && (message.latencyMs || message.totalDurationMs) && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        color: 'var(--brand-primary)',
                        background: 'var(--bg-subtle)',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-full)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                      title={`First token in ${message.latencyMs ? (message.latencyMs / 1000).toFixed(2) : 0}s | Total: ${message.totalDurationMs ? (message.totalDurationMs / 1000).toFixed(2) : 0}s`}
                    >
                      ⚡ {message.latencyMs ? `${(message.latencyMs / 1000).toFixed(2)}s` : `${(message.totalDurationMs! / 1000).toFixed(2)}s`}
                      {message.tokenCount && ` · ~${message.tokenCount} tok`}
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          {/* Creative AI Working & Thinking Status Card with Live Timer */}
          {isLoading && !isStreaming && (
            <div className="message message-assistant fade-in-up" style={{ maxWidth: '90%' }}>
              <div className="ai-working-card">
                <div className="ai-working-sparkle">🌱</div>
                <div style={{ flex: 1 }}>
                  <div className="ai-working-text">
                    {WORKING_STATUSES[statusIndex]}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>Gemini 3.6 Flash</span>
                    <span>·</span>
                    <span>Processing live...</span>
                  </div>
                </div>
                <div className="ai-wave-container">
                  <div className="ai-wave-bar" />
                  <div className="ai-wave-bar" />
                  <div className="ai-wave-bar" />
                  <div className="ai-wave-bar" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick action chips */}
        {showQuickActions && messages.length === 0 && (
          <div style={{ padding: '0 var(--space-5)', paddingBottom: 'var(--space-3)' }}>
            <div className="quick-actions">
              {QUICK_ACTIONS.map((action, i) => (
                <button
                  key={i}
                  className="quick-action-chip"
                  onClick={() => sendMessage(action)}
                  id={`quick-action-${i}`}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="chat-input-area">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}>
            <div className="chat-input-row">
              <div className="chat-input-wrapper">
                <textarea
                  ref={inputRef}
                  id="chat-input"
                  className="chat-input"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); adjustTextareaHeight() }}
                  onKeyDown={handleKeyDown}
                  placeholder="Tell Srushti anything..."
                  rows={1}
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                className="chat-send-btn"
                disabled={!input.trim() || isLoading}
                id="chat-send-btn"
              >
                <SendIcon />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── CHAT HISTORY SLIDE-OVER DRAWER ─────────────────────────── */}
      {showHistoryDrawer && (
        <>
          <div className="sheet-overlay" onClick={() => setShowHistoryDrawer(false)} />
          <div
            className="card fade-in-up"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '85%',
              maxWidth: 340,
              zIndex: 200,
              borderRadius: 0,
              borderLeft: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-xl)',
              background: 'var(--bg-surface)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Chat History
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                  {conversations.length} saved threads
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={startNewChat}
                style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <PlusIcon /> New
              </button>
            </div>

            {/* Conversations List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-3) var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {conversations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)', color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
                  No previous conversations yet
                </div>
              ) : (
                conversations.map(conv => {
                  const isActive = conv.id === activeConvId
                  return (
                    <div
                      key={conv.id}
                      onClick={() => selectConversation(conv.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-lg)',
                        background: isActive ? 'var(--bg-subtle)' : 'transparent',
                        border: isActive ? '1.5px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: isActive ? 800 : 600,
                          fontSize: 'var(--text-sm)',
                          color: isActive ? 'var(--brand-primary)' : 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {conv.title || 'Untitled Conversation'}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: 2 }}>
                          {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                        </div>
                      </div>

                      <button
                        onClick={(e) => deleteConversation(conv.id, e)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-tertiary)',
                          padding: 4,
                          cursor: 'pointer',
                        }}
                        title="Delete Thread"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            {/* Drawer Close Footer */}
            <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                className="btn btn-secondary btn-full"
                onClick={() => setShowHistoryDrawer(false)}
              >
                Close Drawer
              </button>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  )
}
