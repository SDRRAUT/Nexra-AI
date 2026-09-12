'use client'

import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { voiceEngine } from '@/lib/voice/voiceEngine'
import { localDb, type LocalHabit } from '@/lib/db/localDb'

interface AssistantBriefingModalProps {
  isOpen: boolean
  onClose: () => void
  userName?: string
  todayTasks: any[]
  events?: any[]
  completedCount?: number
  totalCount?: number
  onStartTask?: (task: any) => void
  onOpenOptimizer?: () => void
  onToggleTask?: (task: any) => void
}

export default function AssistantBriefingModal({
  isOpen,
  onClose,
  userName: initialUserName,
  todayTasks = [],
  events = [],
  completedCount = 0,
  totalCount = 0,
  onStartTask,
  onOpenOptimizer,
  onToggleTask,
}: AssistantBriefingModalProps) {
  const [userName, setUserName] = useState<string>(initialUserName || 'Sir')
  const [userTitle, setUserTitle] = useState<'Sir' | 'Mam'>('Sir')
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [habits, setHabits] = useState<LocalHabit[]>([])
  const [activeTab, setActiveTab] = useState<'briefing' | 'tasks' | 'schedule' | 'habits'>('briefing')

  // Load user name and title from localStorage and localDb
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTitle = (localStorage.getItem('nexra_user_title') || 'Sir') as 'Sir' | 'Mam'
      setUserTitle(storedTitle === 'Mam' ? 'Mam' : 'Sir')

      const storedName =
        localStorage.getItem('nexra_user_name') ||
        localStorage.getItem('srushti_user_name') ||
        initialUserName ||
        ''
      if (storedName) {
        setUserName(storedName)
        setTempName(storedName)
      } else {
        localDb.user.toCollection().first().then(u => {
          if (u?.name && u.name !== 'Friend') {
            setUserName(u.name)
            setTempName(u.name)
          } else {
            setUserName('User')
            setTempName('User')
          }
        }).catch(() => {})
      }
    }
  }, [initialUserName, isOpen])

  // Load active habits
  useEffect(() => {
    if (isOpen) {
      localDb.habits.toArray().then(h => setHabits(h || [])).catch(() => {})
    }
  }, [isOpen])

  // Clean up speech synthesis when closing modal
  useEffect(() => {
    if (!isOpen) {
      voiceEngine.stopSpeaking()
      setIsSpeaking(false)
    }
  }, [isOpen])

  // Time-aware greeting
  const hour = new Date().getHours()
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const timeEmoji = hour < 12 ? '☀️' : hour < 17 ? '🌤️' : '🌙'

  // Salutation: e.g. "Sanket Sir" or "Sanket Mam"
  const formattedName = userName && userName !== 'User' && userName !== 'Friend' ? userName : ''
  const fullSalutation = formattedName ? `${formattedName} ${userTitle}` : userTitle

  // Tasks analysis
  const pendingTasks = useMemo(() => todayTasks.filter(t => t.status !== 'completed'), [todayTasks])
  const criticalTasks = useMemo(() => pendingTasks.filter(t => t.priority === 'critical' || t.priority === 'high'), [pendingTasks])
  const normalTasks = useMemo(() => pendingTasks.filter(t => t.priority !== 'critical' && t.priority !== 'high'), [pendingTasks])
  const topPriorityTask = criticalTasks[0] || pendingTasks[0] || null

  const totalMinutes = useMemo(() => {
    return pendingTasks.reduce((acc, t) => acc + (t.estimatedMinutes || 30), 0)
  }, [pendingTasks])

  // Generate Concise Assistant Briefing
  const briefingNarration = useMemo(() => {
    if (pendingTasks.length === 0) {
      return `Good day, ${fullSalutation}. All tasks are completed today! You have clear schedule and 100% focus.`
    }

    const durationText = totalMinutes < 60 ? `${totalMinutes} mins` : `${(totalMinutes / 60).toFixed(1)} hours`
    let narrative = `${timeGreeting}, ${fullSalutation}. You have ${pendingTasks.length} ${pendingTasks.length === 1 ? 'task' : 'tasks'} scheduled (~${durationText}). `

    if (topPriorityTask) {
      narrative += `Top focus is "${topPriorityTask.title}". `
    }
    if (events.length > 0) {
      narrative += `${events.length} calendar events today. `
    }
    if (habits.length > 0) {
      narrative += `Keep your habit streaks strong. `
    }
    narrative += `Ready when you are, ${userTitle}!`
    return narrative
  }, [timeGreeting, fullSalutation, pendingTasks, topPriorityTask, events, habits, totalMinutes, userTitle])

  const handleToggleSpeak = () => {
    if (isSpeaking) {
      voiceEngine.stopSpeaking()
      setIsSpeaking(false)
    } else {
      setIsSpeaking(true)
      voiceEngine.speak(briefingNarration, () => {
        setIsSpeaking(false)
      })
    }
  }

  const handleSelectTitle = (title: 'Sir' | 'Mam') => {
    setUserTitle(title)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('nexra_user_title', title)
    }
  }

  const handleSaveName = async () => {
    const trimmed = tempName.trim()
    if (trimmed) {
      setUserName(trimmed)
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('nexra_user_name', trimmed)
      }
      try {
        const u = await localDb.user.toCollection().first()
        if (u) {
          await localDb.user.update(u.id, { name: trimmed })
        }
      } catch {}
      window.dispatchEvent(new CustomEvent('srushti_data_changed'))
    }
    setIsEditingName(false)
  }

  if (!isOpen) return null

  return (
    <div className="assistant-modal-portal">
      {/* Background Dimmed Overlay */}
      <div
        className="assistant-modal-backdrop"
        onClick={() => {
          voiceEngine.stopSpeaking()
          setIsSpeaking(false)
          onClose()
        }}
      />

      {/* Main Assistant Dialog */}
      <div className="assistant-dialog-card fade-in-up">
        {/* Minimal Header */}
        <div className="assistant-dialog-header">
          <div className="assistant-header-left">
            <div className={`assistant-header-dot ${isSpeaking ? 'speaking' : ''}`} />
            <span className="assistant-header-title">Daily Briefing</span>
          </div>

          <div className="assistant-header-actions">
            {/* Minimal Audio Voice Button */}
            <button
              className={`assistant-voice-pill ${isSpeaking ? 'active' : ''}`}
              onClick={handleToggleSpeak}
              title={isSpeaking ? 'Mute speech' : 'Listen aloud'}
            >
              <span>{isSpeaking ? '⏹' : '🔊'}</span>
              <span>{isSpeaking ? 'Speaking' : 'Listen'}</span>
            </button>

            {/* Close Button */}
            <button
              className="assistant-close-btn"
              onClick={() => {
                voiceEngine.stopSpeaking()
                setIsSpeaking(false)
                onClose()
              }}
              title="Close"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* User Salutation & In-Place Name Editor */}
        <div className="assistant-salutation-card">
          <div className="assistant-salutation-row">
            <div className="assistant-greeting-text">
              <span className="assistant-greeting-emoji">{timeEmoji}</span>
              {isEditingName ? (
                <div className="assistant-name-edit-inline">
                  <input
                    type="text"
                    value={tempName}
                    onChange={e => setTempName(e.target.value)}
                    placeholder="Your name"
                    className="assistant-name-input"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveName()
                      if (e.key === 'Escape') setIsEditingName(false)
                    }}
                  />
                  <button className="assistant-name-save-btn" onClick={handleSaveName}>✓</button>
                  <button className="assistant-name-cancel-btn" onClick={() => setIsEditingName(false)}>✕</button>
                </div>
              ) : (
                <div
                  className="assistant-name-clickable"
                  onClick={() => {
                    setTempName(userName)
                    setIsEditingName(true)
                  }}
                  title="Click to change your name"
                >
                  <span>{timeGreeting}, </span>
                  <strong className="assistant-highlight-name">{userName} {userTitle}</strong>
                  <span className="assistant-name-pencil">✎</span>
                </div>
              )}
            </div>

            {/* Minimal Sir / Mam Pill Switch */}
            <div className="assistant-title-pills">
              <button
                className={`assistant-title-pill ${userTitle === 'Sir' ? 'active' : ''}`}
                onClick={() => handleSelectTitle('Sir')}
              >
                Sir
              </button>
              <button
                className={`assistant-title-pill ${userTitle === 'Mam' ? 'active' : ''}`}
                onClick={() => handleSelectTitle('Mam')}
              >
                Mam
              </button>
            </div>
          </div>
        </div>

        {/* Minimal Segmented Tabs */}
        <div className="assistant-tabs-bar">
          <button
            className={`assistant-tab-btn ${activeTab === 'briefing' ? 'active' : ''}`}
            onClick={() => setActiveTab('briefing')}
          >
            Briefing
          </button>
          <button
            className={`assistant-tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            Tasks ({pendingTasks.length})
          </button>
          {events.length > 0 && (
            <button
              className={`assistant-tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
              onClick={() => setActiveTab('schedule')}
            >
              Schedule ({events.length})
            </button>
          )}
          {habits.length > 0 && (
            <button
              className={`assistant-tab-btn ${activeTab === 'habits' ? 'active' : ''}`}
              onClick={() => setActiveTab('habits')}
            >
              Habits ({habits.length})
            </button>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="assistant-dialog-body">
          {/* TAB 1: MINIMAL BRIEFING */}
          {activeTab === 'briefing' && (
            <div className="assistant-briefing-content fade-in-up">
              {/* Intelligent Summary Statement */}
              <div className="assistant-summary-box">
                <p className="assistant-summary-text">{briefingNarration}</p>
              </div>

              {/* Top Priority Task Card */}
              {topPriorityTask ? (
                <div className="assistant-top-priority-card">
                  <div className="assistant-priority-label">TOP FOCUS TODAY</div>
                  <div className="assistant-top-task-title">{topPriorityTask.title}</div>

                  <div className="assistant-top-task-meta">
                    <span className="assistant-priority-pill" data-priority={topPriorityTask.priority}>
                      {topPriorityTask.priority}
                    </span>
                    {topPriorityTask.estimatedMinutes && (
                      <span className="assistant-meta-chip">{topPriorityTask.estimatedMinutes}m</span>
                    )}
                    {topPriorityTask.category && (
                      <span className="assistant-meta-chip">{topPriorityTask.category}</span>
                    )}
                  </div>

                  <div className="assistant-top-task-actions">
                    <button
                      className="assistant-focus-cta-btn"
                      onClick={() => {
                        voiceEngine.stopSpeaking()
                        setIsSpeaking(false)
                        onClose()
                        if (onStartTask) onStartTask(topPriorityTask)
                      }}
                    >
                      Start Focus Session (25m)
                    </button>
                    {onToggleTask && (
                      <button
                        className="assistant-done-cta-btn"
                        onClick={() => onToggleTask(topPriorityTask)}
                        title="Mark Done"
                      >
                        ✓
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="assistant-empty-state">
                  <div style={{ fontSize: 28 }}>✨</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginTop: 6 }}>
                    All tasks completed for today!
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    Your schedule is clear. You can plan ahead or relax, {userTitle}.
                  </div>
                </div>
              )}

              {/* Minimal Single-Line Metrics Strip */}
              <div className="assistant-metrics-strip">
                <div className="assistant-metric-strip-item">
                  <strong>{pendingTasks.length}</strong> <span>pending</span>
                </div>
                <div className="assistant-metric-strip-dot">·</div>
                <div className="assistant-metric-strip-item">
                  <strong>{criticalTasks.length}</strong> <span>critical</span>
                </div>
                <div className="assistant-metric-strip-dot">·</div>
                <div className="assistant-metric-strip-item">
                  <strong>{(totalMinutes / 60).toFixed(1)}h</strong> <span>workload</span>
                </div>
                <div className="assistant-metric-strip-dot">·</div>
                <div className="assistant-metric-strip-item">
                  <strong>{completedCount}</strong> <span>done</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TASKS BREAKDOWN */}
          {activeTab === 'tasks' && (
            <div className="assistant-tasks-content fade-in-up">
              {pendingTasks.length === 0 ? (
                <div className="assistant-empty-state">
                  <div style={{ fontSize: 28 }}>✨</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 6 }}>
                    No pending tasks, {userTitle}!
                  </div>
                </div>
              ) : (
                <div className="assistant-task-list">
                  {criticalTasks.length > 0 && (
                    <div className="assistant-task-group">
                      <div className="assistant-group-header">Critical & High Priority</div>
                      {criticalTasks.map(t => (
                        <div key={t.id} className="assistant-task-row">
                          <div className="assistant-task-left">
                            <input
                              type="checkbox"
                              checked={t.status === 'completed'}
                              onChange={() => onToggleTask && onToggleTask(t)}
                              className="assistant-task-check"
                            />
                            <div>
                              <div className="assistant-row-title">{t.title}</div>
                              <div className="assistant-row-meta">
                                <span className="assistant-badge-priority" data-priority={t.priority}>
                                  {t.priority}
                                </span>
                                {t.estimatedMinutes && <span>{t.estimatedMinutes}m</span>}
                                {t.category && <span>· {t.category}</span>}
                              </div>
                            </div>
                          </div>
                          {onStartTask && (
                            <button
                              className="assistant-mini-focus-btn"
                              onClick={() => {
                                voiceEngine.stopSpeaking()
                                setIsSpeaking(false)
                                onClose()
                                onStartTask(t)
                              }}
                            >
                              Focus
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {normalTasks.length > 0 && (
                    <div className="assistant-task-group">
                      <div className="assistant-group-header">Planned Tasks</div>
                      {normalTasks.map(t => (
                        <div key={t.id} className="assistant-task-row">
                          <div className="assistant-task-left">
                            <input
                              type="checkbox"
                              checked={t.status === 'completed'}
                              onChange={() => onToggleTask && onToggleTask(t)}
                              className="assistant-task-check"
                            />
                            <div>
                              <div className="assistant-row-title">{t.title}</div>
                              <div className="assistant-row-meta">
                                <span className="assistant-badge-priority" data-priority={t.priority}>
                                  {t.priority}
                                </span>
                                {t.estimatedMinutes && <span>{t.estimatedMinutes}m</span>}
                                {t.category && <span>· {t.category}</span>}
                              </div>
                            </div>
                          </div>
                          {onStartTask && (
                            <button
                              className="assistant-mini-focus-btn"
                              onClick={() => {
                                voiceEngine.stopSpeaking()
                                setIsSpeaking(false)
                                onClose()
                                onStartTask(t)
                              }}
                            >
                              Focus
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SCHEDULE / EVENTS */}
          {activeTab === 'schedule' && (
            <div className="assistant-schedule-content fade-in-up">
              {events.length === 0 ? (
                <div className="assistant-empty-state">
                  <div style={{ fontSize: 28 }}>📅</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 6 }}>
                    No events scheduled today.
                  </div>
                </div>
              ) : (
                <div className="assistant-event-list">
                  {events.map((ev, i) => (
                    <div key={ev.id || i} className="assistant-event-card">
                      <div className="assistant-event-time">
                        {ev.startTime ? format(new Date(ev.startTime), 'h:mm a') : 'Today'}
                      </div>
                      <div className="assistant-event-title">{ev.title}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: HABITS */}
          {activeTab === 'habits' && (
            <div className="assistant-habits-content fade-in-up">
              <div className="assistant-habits-list">
                {habits.map(h => (
                  <div key={h.id} className="assistant-habit-card">
                    <div className="assistant-habit-info">
                      <div className="assistant-habit-name">🌱 {h.title}</div>
                      <div className="assistant-habit-meta">
                        🔥 {h.currentStreak || 0} day streak · {h.category || 'daily'}
                      </div>
                    </div>
                    <span className="assistant-habit-badge">Active</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Minimal Footer */}
        <div className="assistant-dialog-footer">
          {onOpenOptimizer && (
            <button
              className="assistant-footer-btn-secondary"
              onClick={() => {
                voiceEngine.stopSpeaking()
                setIsSpeaking(false)
                onClose()
                onOpenOptimizer()
              }}
            >
              AI Optimizer
            </button>
          )}

          <button
            className="assistant-footer-btn-primary"
            onClick={() => {
              voiceEngine.stopSpeaking()
              setIsSpeaking(false)
              onClose()
            }}
          >
            Start Day, {userTitle}
          </button>
        </div>
      </div>
    </div>
  )
}
