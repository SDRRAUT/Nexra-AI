'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import { format } from 'date-fns'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: Date
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

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" />
  </svg>
)

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, scrollToBottom])

  // Check for prefill from Life Analysis or other screens
  useEffect(() => {
    const prefill = sessionStorage.getItem('srushti_prefill')
    if (prefill) {
      sessionStorage.removeItem('srushti_prefill')
      sendMessage(prefill)
    }
  }, [])

  const sendMessage = async (userText: string) => {
    const trimmed = userText.trim()
    if (!trimmed || isLoading) return

    setShowQuickActions(false)
    setInput('')

    const userMessage: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: trimmed,
      createdAt: new Date(),
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setIsLoading(true)

    const assistantMsgId = 'msg-' + (Date.now() + 1)
    let assistantText = ''

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!response.ok || !response.body) {
        throw new Error('Failed to get response from Srushti')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      // Add empty assistant message to update progressively
      setMessages(prev => [
        ...prev,
        { id: assistantMsgId, role: 'assistant', content: '', createdAt: new Date() }
      ])

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        assistantText += chunk

        setMessages(prev =>
          prev.map(m => m.id === assistantMsgId ? { ...m, content: assistantText } : m)
        )
      }
    } catch (err: any) {
      console.error(err)
      setMessages(prev => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'assistant',
          content: "I'm having a little trouble connecting right now. Please ensure your Gemini API key is configured in the environment settings.",
          createdAt: new Date(),
        }
      ])
    } finally {
      setIsLoading(false)
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
        title="Srushti"
        subtitle="Your Personal Assistant"
        showBrand={false}
        showBack={false}
      />

      <div className="chat-container" style={{ height: 'calc(100dvh - 64px - 72px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Messages list */}
        <div className="chat-messages" style={{ flex: 1, overflowY: 'auto' }}>

          {/* Welcome state */}
          {messages.length === 0 && (
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

          {/* Render messages */}
          {messages.map((message) => {
            const isUser = message.role === 'user'
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
                  </div>
                )}
                <div className="message-time">
                  {format(new Date(message.createdAt || Date.now()), 'h:mm a')}
                </div>
              </div>
            )
          })}

          {/* Typing indicator */}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="message message-assistant">
              <div className="chat-srushti-avatar" style={{ width: 28, height: 28, marginBottom: 4 }}>🌱</div>
              <div className="typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
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

      <BottomNav />
    </div>
  )
}
