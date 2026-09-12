'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import { format, formatDistanceToNow } from 'date-fns'
import { streamClientChat } from '@/lib/ai/clientAi'
import {
  getClientConversations,
  getClientMessages,
  saveClientMessage,
  createClientConversation,
  deleteClientConversation,
} from '@/lib/data/clientData'
import MarkdownContent from '@/components/chat/MarkdownContent'
import { localDb } from '@/lib/db/localDb'
import { voiceEngine } from '@/lib/voice/voiceEngine'

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

interface BentoCardItem {
  id: string
  title: string
  desc: string
  icon: string
  bg: string
  color: string
  prompt: string
}

const BENTO_CARDS: BentoCardItem[] = [
  {
    id: 'speak',
    title: 'Practice Speaking',
    desc: 'Practice speaking clearly and sound more natural',
    icon: '🎙️',
    bg: 'rgba(139, 92, 246, 0.12)',
    color: '#8B5CF6',
    prompt: "Let's practice conversational speaking. Ask me an engaging question about my day or goals and coach my response.",
  },
  {
    id: 'vocab',
    title: 'Learn Vocabulary',
    desc: 'Expand your vocabulary with new words every day',
    icon: '📖',
    bg: 'rgba(249, 115, 22, 0.12)',
    color: '#EA580C',
    prompt: 'Teach me 3 powerful, high-impact vocabulary words or phrases with clear meanings and real-life examples.',
  },
  {
    id: 'routine',
    title: 'Plan My Routine',
    desc: 'Structure tasks, schedule & focus blocks for today',
    icon: '⚡',
    bg: 'rgba(59, 130, 246, 0.12)',
    color: '#2563EB',
    prompt: 'Analyze what I should do today, prioritize my pending items, and generate a clear, focused plan.',
  },
  {
    id: 'advice',
    title: 'Clarity & Advice',
    desc: 'Get calm guidance, motivation, and problem solving',
    icon: '💡',
    bg: 'rgba(16, 185, 129, 0.12)',
    color: '#059669',
    prompt: "I need calm perspective and clarity on my situation. Help me break down my thoughts step-by-step.",
  },
]

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
  "Nexra is analyzing your schedule & commitments...",
  "Checking deadlines and upcoming focus blocks...",
  "Formulating your personalized plan...",
  "Executing assistant actions and drafting response...",
]

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" />
  </svg>
)

const StopIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <rect x="5" y="5" width="14" height="14" rx="2.5" />
  </svg>
)

const MicIcon = ({ active }: { active?: boolean }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
)

const SpeakerIcon = ({ active }: { active?: boolean }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
)

const MoreVerticalIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    <circle cx="12" cy="5" r="1.2" fill="currentColor" />
    <circle cx="12" cy="19" r="1.2" fill="currentColor" />
  </svg>
)

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)

const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const ThumbsUpIcon = ({ active }: { active?: boolean }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
)

const MemoryIcon = ({ active }: { active?: boolean }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
)

const RetryIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
)

const WandIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 4h-5L7 7l3 3 4.5-4.5z" />
    <path d="M12 12l9 9" />
    <path d="M4 2v4" /><path d="M2 4h4" />
    <path d="M18 2v3" /><path d="M20 3.5h-4" />
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
  const [executingTool, setExecutingTool] = useState<{ name: string; detail: string; elapsed: number } | null>(null)
  const [assistantName, setAssistantName] = useState('Nexra')
  const [userName, setUserName] = useState('Friend')
  const [userAvatar, setUserAvatar] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null)
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null)
  const [likedMsgs, setLikedMsgs] = useState<Record<string, boolean>>({})
  const [savedMemories, setSavedMemories] = useState<Record<string, boolean>>({})
  const [showPromptPicker, setShowPromptPicker] = useState(false)
  const [showActionMenu, setShowActionMenu] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sendTimeRef = useRef<number>(0)
  const firstTokenTimeRef = useRef<number>(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  const toggleVoiceInput = () => {
    if (isListening) {
      voiceEngine.stopListening()
      setIsListening(false)
    } else {
      setIsListening(true)
      voiceEngine.startListening(
        (interimText) => {
          setInput(interimText)
        },
        (finalText) => {
          setInput(finalText)
          setIsListening(false)
        },
        (err) => {
          console.warn('Voice error:', err)
          setIsListening(false)
          if (err === 'not-allowed' || err.toLowerCase().includes('permission')) {
            alert('🎙️ Microphone access was blocked. Please grant Microphone permission in your Android phone settings.')
          } else if (err.includes('API key')) {
            alert('🔑 ' + err)
          } else if (err !== 'no-speech') {
            console.log('Voice status:', err)
          }
        },
        () => {
          setIsListening(false)
        }
      )
    }
  }

  const toggleSpeakMessage = (msgId: string, content: string) => {
    if (speakingMsgId === msgId) {
      voiceEngine.stopSpeaking()
      setSpeakingMsgId(null)
    } else {
      setSpeakingMsgId(msgId)
      voiceEngine.speak(content, () => {
        setSpeakingMsgId(null)
      })
    }
  }

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load chat history and conversations list on mount
  const loadChatData = async (targetConvId?: string) => {
    setIsFetchingHistory(true)
    try {
      let name = localStorage.getItem('srushti_assistant_name') || 'Nexra'
      if (name === 'Srushti' || name === 'Spark' || name === 'Personal Assistant') {
        name = 'Nexra'
        localStorage.setItem('srushti_assistant_name', 'Nexra')
      }
      setAssistantName(name)
      const uName = localStorage.getItem('srushti_user_name') || 'Friend'
      setUserName(uName)
      const uAvatar = localStorage.getItem('srushti_user_avatar') || ''
      setUserAvatar(uAvatar)

      // 1. Get all conversations from local IndexedDB
      const convList = await getClientConversations()
      setConversations(convList)

      let activeId: string = targetConvId || (typeof localStorage !== 'undefined' ? localStorage.getItem('srushti_active_conv_id') || '' : '')

      if (!activeId || !convList.some((c: any) => c.id === activeId)) {
        if (convList.length > 0) {
          activeId = convList[0].id
        } else {
          const newConv = await createClientConversation('New Conversation')
          activeId = newConv.id
          setConversations([newConv])
        }
      }

      setActiveConvId(activeId)
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('srushti_active_conv_id', activeId)
      }

      // 2. Load messages for this active conversation
      const savedMessages = await getClientMessages(activeId)
      setMessages(savedMessages)
      setShowQuickActions(savedMessages.length === 0)
    } catch (e) {
      console.error('Failed to load chat history', e)
    } finally {
      setIsFetchingHistory(false)
    }
  }

  useEffect(() => {
    loadChatData()

    const handleDataChanged = () => {
      let name = localStorage.getItem('srushti_assistant_name') || 'Nexra'
      if (name === 'Srushti' || name === 'Spark' || name === 'Personal Assistant') {
        name = 'Nexra'
      }
      setAssistantName(name)
      const uName = localStorage.getItem('srushti_user_name') || 'Friend'
      setUserName(uName)
      const uAvatar = localStorage.getItem('srushti_user_avatar') || ''
      setUserAvatar(uAvatar)
    }
    window.addEventListener('srushti_data_changed', handleDataChanged)
    return () => window.removeEventListener('srushti_data_changed', handleDataChanged)
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

  // Check for prefill from other screens (e.g. Suggestions, Act buttons, notifications)
  useEffect(() => {
    const prefill = sessionStorage.getItem('srushti_prefill')
    if (prefill) {
      sessionStorage.removeItem('srushti_prefill')
      setInput(prefill)
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          adjustTextareaHeight()
        }
      }, 150)
    }
  }, [activeConvId])

  const startNewChat = async () => {
    try {
      const newConv = await createClientConversation('New Conversation')
      setActiveConvId(newConv.id)
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('srushti_active_conv_id', newConv.id)
      }
      setMessages([])
      setShowQuickActions(true)
      setShowHistoryDrawer(false)
      const convList = await getClientConversations()
      setConversations(convList)
    } catch (e) {
      console.error(e)
    }
  }

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Delete this conversation thread?')) {
      await deleteClientConversation(convId)
      if (activeConvId === convId) {
        startNewChat()
      } else {
        const convList = await getClientConversations()
        setConversations(convList)
      }
    }
  }

  const selectConversation = async (convId: string) => {
    setShowHistoryDrawer(false)
    setActiveConvId(convId)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('srushti_active_conv_id', convId)
    }
    const savedMessages = await getClientMessages(convId)
    setMessages(savedMessages)
    setShowQuickActions(savedMessages.length === 0)
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

    const userMsgId = 'msg-' + Date.now()
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: trimmed,
      createdAt: new Date(),
    }

    // Ensure active conversation ID exists
    let currConvId: string = activeConvId || ''
    if (!currConvId) {
      const newConv = await createClientConversation(trimmed.slice(0, 30))
      currConvId = newConv.id
      setActiveConvId(currConvId)
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('srushti_active_conv_id', currConvId)
      }
    }

    // Save user message to IndexedDB immediately
    await saveClientMessage({
      id: userMsgId,
      conversationId: currConvId,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    }).catch(() => {})

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setIsLoading(true)
    setIsStreaming(false)

    const assistantMsgId = 'msg-' + (Date.now() + 1)
    let assistantText = ''
    abortControllerRef.current = new AbortController()

    try {
      const firstTokenMs = Math.round(performance.now() - sendTimeRef.current)
      firstTokenTimeRef.current = firstTokenMs
      setLiveLatency(firstTokenMs)

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

      await streamClientChat(
        newMessages.map(m => ({ role: m.role, content: m.content })),
        {
          onChunk: (chunk) => {
            assistantText += chunk
            setMessages(prev =>
              prev.map(m => (m.id === assistantMsgId ? { ...m, content: assistantText } : m))
            )
          },
          onToolExecuting: (toolName, params) => {
            const detail = params.title || params.content || ''
            setExecutingTool({ name: toolName, detail, elapsed: 0 })
          },
          onToolExecuted: (toolName, result) => {
            setExecutingTool(null)
          }
        },
        { signal: abortControllerRef.current.signal }
      )

      // Calculate total duration & token estimation
      const totalDurationMs = Math.round(performance.now() - sendTimeRef.current)
      const estimatedTokens = Math.round(assistantText.length / 3.8)

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId
            ? { ...m, latencyMs: firstTokenTimeRef.current, totalDurationMs, tokenCount: estimatedTokens }
            : m
        )
      )

      // Save completed assistant response to IndexedDB
      await saveClientMessage({
        id: assistantMsgId,
        conversationId: currConvId,
        role: 'assistant',
        content: assistantText,
        latencyMs: firstTokenTimeRef.current,
        totalDurationMs,
        tokenCount: estimatedTokens,
        createdAt: new Date().toISOString(),
      }).catch(() => {})

      getClientConversations().then(setConversations).catch(() => {})
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        if (assistantText) {
          await saveClientMessage({
            id: assistantMsgId,
            conversationId: currConvId,
            role: 'assistant',
            content: assistantText,
            createdAt: new Date().toISOString(),
          }).catch(() => {})
        }
        return
      }

      console.error(err)
      const errMsg = err?.message?.includes('missing')
        ? '⚠️ Gemini API key is missing. Please go to Settings ⚙️ and add your Google Gemini API key.'
        : `⚠️ ${err?.message || 'Error connecting to Gemini API. Please check your network.'}`

      setMessages(prev => [
        ...prev.filter(m => m.id !== assistantMsgId || m.content.length > 0),
        {
          id: 'err-' + Date.now(),
          role: 'assistant',
          content: errMsg,
          createdAt: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      setExecutingTool(null)
      setTimeout(scrollToBottom, 100)
    }
  }

  const stopGeneration = () => {
    abortControllerRef.current?.abort()
    setIsLoading(false)
    setIsStreaming(false)
    setExecutingTool(null)
  }

  const undoMessage = async (msgId: string, text: string) => {
    await localDb.messages.delete(msgId).catch(() => {})
    const idx = messages.findIndex(m => m.id === msgId)
    let newMsgs = messages.filter(m => m.id !== msgId)
    if (idx !== -1 && messages[idx + 1] && messages[idx + 1].role === 'assistant') {
      const nextId = messages[idx + 1].id
      await localDb.messages.delete(nextId).catch(() => {})
      newMsgs = newMsgs.filter(m => m.id !== nextId)
    }
    setMessages(newMsgs)
    setInput(text)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter key creates a new line; send button is used to send
    if (e.key === 'Enter') {
      setTimeout(adjustTextareaHeight, 10)
    }
  }

  const adjustTextareaHeight = () => {
    const ta = inputRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
    }
  }

  const handleCopyMessage = (msgId: string, content: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(content)
      setCopiedMsgId(msgId)
      setTimeout(() => setCopiedMsgId(null), 1800)
    }
  }

  const handleToggleLike = (msgId: string) => {
    setLikedMsgs(prev => ({ ...prev, [msgId]: !prev[msgId] }))
  }

  const handleSaveMemory = async (msgId: string, content: string) => {
    try {
      await localDb.memories.add({
        id: 'mem-' + Date.now(),
        content: content.slice(0, 300),
        category: 'preference',
        importance: 'medium',
        accessCount: 0,
        createdAt: new Date().toISOString(),
      })
      setSavedMemories(prev => ({ ...prev, [msgId]: true }))
      window.dispatchEvent(new Event('srushti_data_changed'))
    } catch (err) {
      console.error('Failed to save memory', err)
    }
  }

  const handleRetryMessage = (msgId: string) => {
    const idx = messages.findIndex(m => m.id === msgId)
    if (idx > 0 && messages[idx - 1].role === 'user') {
      sendMessage(messages[idx - 1].content)
    } else {
      const lastUser = [...messages].reverse().find(m => m.role === 'user')
      if (lastUser) sendMessage(lastUser.content)
    }
  }

  return (
    <div className="app-shell chat-ethereal-bg" style={{ height: '100dvh', maxHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppHeader
        showBrand={false}
        showBack={true}
        title="Smart Chat"
        subtitle={`${assistantName} AI Tutor`}
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              className="notif-btn"
              onClick={startNewChat}
              title="New Conversation"
              id="new-chat-btn"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.85)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <PlusIcon />
            </button>
            <button
              className="notif-btn"
              onClick={() => setShowHistoryDrawer(true)}
              title="Chat History"
              id="chat-history-btn"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.85)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <MoreVerticalIcon />
            </button>
          </div>
        }
      />

      {/* Main chat layout container */}
      <div
        className="chat-container"
        style={{
          flex: 1,
          height: 'calc(100dvh - 64px - 72px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Messages Stream / Welcome View */}
        <div
          className="chat-messages"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 16px 8px 16px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Loading History Skeleton */}
          {isFetchingHistory && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 'var(--space-4) 0' }}>
              <div className="skeleton" style={{ height: 48, width: '65%', borderRadius: 18, alignSelf: 'flex-start' }} />
              <div className="skeleton" style={{ height: 48, width: '55%', borderRadius: 18, alignSelf: 'flex-end' }} />
            </div>
          )}

          {/* ════ WELCOME STATE (MATCHING REFERENCE SCREEN 1) ════ */}
          {!isFetchingHistory && messages.length === 0 && (
            <div
              className="fade-in-up"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '8px 6px 20px 6px',
                flex: 1,
                minHeight: '100%',
              }}
            >
              {/* 3D Iridescent Holographic Chromatic Orb */}
              <div style={{ margin: '10px 0 18px 0', position: 'relative' }}>
                <div className="chromatic-orb" />
              </div>

              {/* Greeting Typography */}
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary, #64748B)', letterSpacing: '0.1px' }}>
                Hello, {userName}
              </div>
              <h1
                style={{
                  fontFamily: 'var(--font-display, inherit)',
                  fontSize: '24px',
                  fontWeight: 800,
                  color: 'var(--text-primary, #0F172A)',
                  letterSpacing: '-0.4px',
                  margin: '4px 0 20px 0',
                  lineHeight: 1.25,
                }}
              >
                How Can I help you?
              </h1>

              {/* 2x2 Bento Prompt Cards */}
              <div className="chat-bento-grid">
                {BENTO_CARDS.map(card => (
                  <div
                    key={card.id}
                    className="chat-bento-card"
                    onClick={() => {
                      sendMessage(card.prompt)
                    }}
                    id={`bento-card-${card.id}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div className="chat-bento-icon-box" style={{ background: card.bg, color: card.color }}>
                        {card.icon}
                      </div>
                      <span className="chat-bento-arrow">↗</span>
                    </div>

                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary, #1E293B)', marginTop: '12px', marginBottom: '3px' }}>
                      {card.title}
                    </div>
                    <div style={{ fontSize: '11px', lineHeight: 1.45, color: 'var(--text-secondary, #64748B)' }}>
                      {card.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════ ACTIVE MESSAGES FEED (MATCHING REFERENCE SCREEN 2) ════ */}
          {messages.map((message) => {
            const isUser = message.role === 'user'
            const isLatestStreamingAssistant = !isUser && isStreaming && message.id === messages[messages.length - 1]?.id

            if (!isUser && !message.content && isLoading) {
              return null
            }

            if (isUser) {
              return (
                <div key={message.id} className="chat-row-user fade-in-up">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', maxWidth: '84%' }}>
                    <div className="chat-bubble-user">
                      <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
                    </div>

                    {/* Micro metadata row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, paddingRight: 4 }}>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary, #94A3B8)' }}>
                        {format(new Date(message.createdAt || Date.now()), 'h:mm a')}
                      </span>
                      {!isLoading && !isStreaming && (
                        <button
                          onClick={() => undoMessage(message.id, message.content)}
                          style={{
                            border: 'none',
                            background: 'none',
                            fontSize: '11px',
                            color: 'var(--text-tertiary, #94A3B8)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            padding: '1px 4px',
                            borderRadius: '4px',
                          }}
                          title="Undo and edit"
                        >
                          <span>↩️</span>
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* User Profile Avatar */}
                  <div className="chat-user-avatar" title={userName}>
                    {userAvatar ? (
                      <img src={userAvatar} alt={userName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <span>{userName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                </div>
              )
            }

            /* Assistant Message */
            const isLiked = !!likedMsgs[message.id]
            const isSaved = !!savedMemories[message.id]
            const isCopied = copiedMsgId === message.id

            return (
              <div key={message.id} className="chat-row-assistant fade-in-up">
                {/* Message Bubble */}
                <div className="chat-bubble-assistant">
                  <MarkdownContent content={message.content} isStreaming={isLatestStreamingAssistant} />
                </div>

                {/* Assistant Bottom Toolbar: Mini Chromatic Orb + Actions */}
                <div className="chat-assistant-meta-bar">
                  <div className="chat-actions-group">
                    {/* Mini Chromatic Orb Avatar */}
                    <div className="chromatic-orb-mini" title={`${assistantName} AI Tutor`} />

                    {/* Copy Button */}
                    <button
                      className={`chat-action-btn ${isCopied ? 'active' : ''}`}
                      onClick={() => handleCopyMessage(message.id, message.content)}
                      title={isCopied ? 'Copied to clipboard' : 'Copy message'}
                    >
                      {isCopied ? <CheckIcon /> : <CopyIcon />}
                      {isCopied && <span>Copied</span>}
                    </button>

                    {/* Like / Thumbs-Up Button */}
                    <button
                      className={`chat-action-btn ${isLiked ? 'active' : ''}`}
                      onClick={() => handleToggleLike(message.id)}
                      title={isLiked ? 'Liked' : 'Helpful response'}
                    >
                      <ThumbsUpIcon active={isLiked} />
                    </button>

                    {/* Memory / Bookmark Button */}
                    <button
                      className={`chat-action-btn ${isSaved ? 'active' : ''}`}
                      onClick={() => handleSaveMemory(message.id, message.content)}
                      title={isSaved ? 'Saved to Memory' : 'Save to Memory'}
                    >
                      <MemoryIcon active={isSaved} />
                      {isSaved && <span>Saved</span>}
                    </button>

                    {/* Listen / TTS Button */}
                    <button
                      className={`chat-action-btn ${speakingMsgId === message.id ? 'active' : ''}`}
                      onClick={() => toggleSpeakMessage(message.id, message.content)}
                      title={speakingMsgId === message.id ? 'Stop listening' : 'Listen to voice'}
                    >
                      <SpeakerIcon active={speakingMsgId === message.id} />
                      {speakingMsgId === message.id && <span>Stop</span>}
                    </button>

                    {/* Retry / Regenerate Button */}
                    {!isLoading && !isStreaming && (
                      <button
                        className="chat-action-btn"
                        onClick={() => handleRetryMessage(message.id)}
                        title="Regenerate response"
                      >
                        <RetryIcon />
                      </button>
                    )}
                  </div>

                  {/* Diagnostics Latency & Token Badge */}
                  {(message.latencyMs || message.totalDurationMs) && (
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        color: 'var(--brand-primary, #6366F1)',
                        background: 'rgba(99, 102, 241, 0.08)',
                        padding: '2px 7px',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        flexShrink: 0,
                      }}
                      title={`First token in ${message.latencyMs ? (message.latencyMs / 1000).toFixed(2) : 0}s | Total: ${message.totalDurationMs ? (message.totalDurationMs / 1000).toFixed(2) : 0}s`}
                    >
                      ⚡ {message.latencyMs ? `${(message.latencyMs / 1000).toFixed(2)}s` : `${(message.totalDurationMs! / 1000).toFixed(2)}s`}
                      {message.tokenCount && ` · ~${message.tokenCount} tok`}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* AI Working Indicator */}
          {isLoading && !isStreaming && (
            <div className="chat-row-assistant fade-in-up" style={{ maxWidth: '88%' }}>
              <div className="ai-working-card">
                <div className="ai-working-sparkle">✨</div>
                <div style={{ flex: 1 }}>
                  <div className="ai-working-text">
                    {WORKING_STATUSES[statusIndex]}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary, #94A3B8)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>{assistantName} Neural Engine</span>
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

        {/* ════ PROMPTS PICKER POPUP (WHEN WAND 🪄 CLICKED) ════ */}
        {showPromptPicker && (
          <div
            className="fade-in-up"
            style={{
              padding: '8px 14px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(226, 232, 240, 0.9)',
              borderBottom: '1px solid rgba(226, 232, 240, 0.9)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#6366F1', display: 'flex', alignItems: 'center', gap: 4 }}>
                <WandIcon /> Quick Prompts
              </span>
              <button
                onClick={() => setShowPromptPicker(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '11px', color: '#94A3B8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
              {QUICK_ACTIONS.map((action, i) => (
                <button
                  key={i}
                  className="quick-action-chip"
                  style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                  onClick={() => {
                    setInput(action)
                    setShowPromptPicker(false)
                    setTimeout(() => {
                      if (inputRef.current) {
                        inputRef.current.focus()
                        adjustTextareaHeight()
                      }
                    }, 50)
                  }}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ════ QUICK ACTIONS POPUP (WHEN PLUS + CLICKED) ════ */}
        {showActionMenu && (
          <div
            className="fade-in-up"
            style={{
              padding: '10px 14px',
              background: 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(226, 232, 240, 0.9)',
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
            }}
          >
            {[
              { label: '📝 New Task', prefill: 'Create a task: ' },
              { label: '⏱️ Focus Sprint', prefill: 'Start a 25-minute deep focus session for ' },
              { label: '🎯 Daily Habit', prefill: 'Track a new daily habit: ' },
              { label: '🧠 Save Memory', prefill: 'Remember that ' },
            ].map((tool, idx) => (
              <button
                key={idx}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11.5px', whiteSpace: 'nowrap', borderRadius: '16px', padding: '6px 12px' }}
                onClick={() => {
                  setInput(tool.prefill)
                  setShowActionMenu(false)
                  setTimeout(() => {
                    if (inputRef.current) {
                      inputRef.current.focus()
                      adjustTextareaHeight()
                    }
                  }, 50)
                }}
              >
                {tool.label}
              </button>
            ))}
          </div>
        )}

        {/* ════ CURVILINEAR FLOATING INPUT DOCK ════ */}
        <div className="chat-dock-container">
          {/* Agent Executing / Voice Listening Status Banner */}
          {executingTool && (
            <div
              className="fade-in-up"
              style={{
                padding: '6px 14px',
                marginBottom: 6,
                borderRadius: '16px',
                background: 'linear-gradient(90deg, rgba(91,107,240,0.12), rgba(236,72,153,0.12))',
                border: '1px solid rgba(91,107,240,0.3)',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--brand-primary, #6366F1)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>⚙️</span>
              <span>Agent Executing: <strong>{executingTool.name.replace('_', ' ')}</strong> {executingTool.detail ? `"${executingTool.detail}"` : ''}...</span>
            </div>
          )}

          {isListening && (
            <div
              className="fade-in-up"
              style={{
                padding: '6px 14px',
                marginBottom: 6,
                borderRadius: '16px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--status-error, #EF4444)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ animation: 'pulse 1s infinite' }}>🎙️</span>
              <span>Listening to your voice... Speak clearly</span>
            </div>
          )}

          <div className="chat-floating-dock">
            {/* Inner Dock Box */}
            <div className="chat-dock-box">
              <textarea
                ref={inputRef}
                id="chat-input"
                className="chat-dock-textarea"
                value={input}
                onChange={(e) => { setInput(e.target.value); adjustTextareaHeight() }}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? 'Listening to voice...' : 'Ask anything about your learning...'}
                rows={1}
                disabled={isLoading && !isStreaming}
              />

              {/* Tools & Send Button Row */}
              <div className="chat-dock-actions-row">
                {/* Left tools: Wand, Plus, Voice Mic */}
                <div className="chat-dock-tools">
                  <button
                    type="button"
                    className={`chat-dock-icon-btn ${showPromptPicker ? 'active' : ''}`}
                    onClick={() => {
                      setShowPromptPicker(!showPromptPicker)
                      setShowActionMenu(false)
                    }}
                    title="Prompt Suggestions"
                  >
                    <WandIcon />
                  </button>

                  <button
                    type="button"
                    className={`chat-dock-icon-btn ${showActionMenu ? 'active' : ''}`}
                    onClick={() => {
                      setShowActionMenu(!showActionMenu)
                      setShowPromptPicker(false)
                    }}
                    title="Quick Tools"
                  >
                    <PlusIcon />
                  </button>

                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    className={`chat-dock-icon-btn ${isListening ? 'recording' : ''}`}
                    title={isListening ? 'Stop listening' : 'Voice input'}
                  >
                    <MicIcon active={isListening} />
                  </button>
                </div>

                {/* Right send button */}
                {isLoading || isStreaming ? (
                  <button
                    type="button"
                    className="chat-dock-send-btn"
                    onClick={stopGeneration}
                    id="chat-stop-btn"
                    title="Stop generating"
                    style={{ background: '#EF4444' }}
                  >
                    <StopIcon />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="chat-dock-send-btn"
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim()}
                    id="chat-send-btn"
                    title="Send message"
                  >
                    <SendIcon />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CHAT HISTORY SLIDE-OVER DRAWER ─────────────────────────── */}
      {showHistoryDrawer && (
        <>
          <div
            className="sheet-overlay"
            style={{ zIndex: 1200 }}
            onClick={() => setShowHistoryDrawer(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '85%',
              maxWidth: 360,
              zIndex: 1250,
              borderRadius: 0,
              borderLeft: '1px solid var(--border-default)',
              boxShadow: '-10px 0 36px rgba(15, 23, 42, 0.3)',
              background: 'var(--bg-surface)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'drawerSlideLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Drawer Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-4) var(--space-5)',
              paddingTop: 'max(var(--space-4), env(safe-area-inset-top, 16px))',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
            }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Chat History
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                  {conversations.length} saved threads
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={startNewChat}
                  style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <PlusIcon /> New
                </button>
                <button
                  onClick={() => setShowHistoryDrawer(false)}
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                  title="Close History"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
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
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-lg)',
                        background: isActive ? 'var(--bg-subtle)' : 'var(--bg-card, #ffffff)',
                        border: isActive ? '1.5px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        boxShadow: isActive ? '0 2px 8px rgba(99, 102, 241, 0.12)' : '0 1px 3px rgba(0, 0, 0, 0.04)',
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
            <div style={{
              padding: 'var(--space-4)',
              paddingBottom: 'max(var(--space-4), env(safe-area-inset-bottom, 16px))',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
            }}>
              <button
                className="btn btn-secondary btn-full"
                onClick={() => setShowHistoryDrawer(false)}
              >
                Close History
              </button>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  )
}
