'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import { format } from 'date-fns'
import FocusTimerCard from '@/components/dashboard/FocusTimerCard'
import { scheduleDailyMorningBriefing, requestNotificationPermission } from '@/lib/notifications/native'

interface DashboardData {
  user: { name: string; timezone: string; setupDone?: boolean }
  today: {
    date: string
    tasks: Task[]
    events: Event[]
    completedCount: number
    totalCount: number
    progressPercent: number
    nextTask: Task | null
  }
  critical: Task[]
  upcoming: Task[]
  goals: Goal[]
  atRisk: number
  overdue: Task[]
  recentActions: AgentAction[]
  notifications: Notification[]
  unreadCount: number
}

interface Task {
  id: string
  title: string
  priority: string
  status: string
  deadline?: string
  scheduledStart?: string
  estimatedMinutes?: number
  category?: string
  postponeCount: number
  description?: string
  isAiGenerated?: boolean
}
interface Event { id: string; title: string; startTime: string; endTime: string; type: string; color?: string }
interface Goal { id: string; title: string; progress: number; category?: string }
interface AgentAction { id: string; agentName: string; description: string; createdAt: string }
interface Notification { id: string; title: string; type: string; status: string }

interface BriefingData {
  userName: string
  isEvening: boolean
  briefingTitle: string
  briefingText: string
  aiRecommendation: string
  missedTasks: Task[]
}

function getGreeting(name: string): { text: string; emoji: string } {
  const h = new Date().getHours()
  if (h < 12) return { text: `Good morning, ${name}`, emoji: '☀️' }
  if (h < 17) return { text: `Good afternoon, ${name}`, emoji: '👋' }
  if (h < 21) return { text: `Good evening, ${name}`, emoji: '🌆' }
  return { text: `Hey ${name}`, emoji: '🌙' }
}

const priorityColors: Record<string, string> = {
  critical: 'var(--priority-critical)',
  high: 'var(--priority-high)',
  medium: 'var(--priority-medium)',
  low: 'var(--priority-low)',
}

const priorityBg: Record<string, string> = {
  critical: 'var(--priority-critical-bg)',
  high: 'var(--priority-high-bg)',
  medium: 'var(--priority-medium-bg)',
  low: 'var(--priority-low-bg)',
}

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" />
  </svg>
)

import { getClientDashboard, updateClientTask, toggleClientTask, deleteClientTask, createClientTask, type DashboardData as LocalDashData } from '@/lib/data/clientData'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'
import FocusCompanionModal from '@/components/focus/FocusCompanionModal'
import ScheduleOptimizerModal from '@/components/calendar/ScheduleOptimizerModal'
import ExamDeconstructionWizard from '@/components/study/ExamDeconstructionWizard'

export default function HomePage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [briefing, setBriefing] = useState<BriefingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', category: 'personal', estimatedMinutes: 30 })
  const [recoveringTaskId, setRecoveringTaskId] = useState<string | null>(null)

  // Next-Gen Modals State
  const [showFocusModal, setShowFocusModal] = useState(false)
  const [activeFocusTask, setActiveFocusTask] = useState<Task | null>(null)
  const [showOptimizerModal, setShowOptimizerModal] = useState(false)
  const [showExamWizard, setShowExamWizard] = useState(false)

  const fetchDashboard = async () => {
    try {
      // 1. Try instant offline local DB first
      const localData = await getClientDashboard()
      if (localData) {
        const todayTasks: Task[] = localData.todayTasks as any
        const nextTask = todayTasks.find(t => t.status !== 'completed') || null
        setData({
          user: { name: localData.user.name || 'Sanket', timezone: localData.user.timezone || 'Asia/Kolkata' },
          today: {
            date: new Date().toISOString(),
            tasks: todayTasks,
            events: (localData.upcomingEvents || []) as any,
            completedCount: localData.completedTodayCount,
            totalCount: localData.totalTodayCount,
            progressPercent: localData.progressPercent,
            nextTask,
          },
          critical: todayTasks.filter(t => (t.priority === 'critical' || t.priority === 'high') && t.status !== 'completed'),
          upcoming: todayTasks,
          goals: (localData.goals || []) as any,
          atRisk: 0,
          overdue: [],
          recentActions: [],
          notifications: [],
          unreadCount: 0,
        })
        setBriefing({
          userName: localData.user.name || 'Sanket',
          isEvening: new Date().getHours() >= 17,
          briefingTitle: localData.briefing.greeting,
          briefingText: localData.briefing.summary,
          aiRecommendation: 'Stay focused on high-priority milestones today.',
          missedTasks: [],
        })
        setLoading(false)
      }

      // 2. Also try API if server is reachable
      const [dashRes, briefRes] = await Promise.all([
        fetch('/api/dashboard').then(r => r.json()).catch(() => null),
        fetch('/api/briefing').then(r => r.json()).catch(() => null),
      ])
      if (dashRes && dashRes.today) {
        if (Array.isArray(dashRes.critical)) {
          dashRes.critical = dashRes.critical.filter((t: any) => t.status !== 'completed')
        }
        setData(dashRes)
      }
      if (briefRes && briefRes.briefingTitle) setBriefing(briefRes)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('srushti_onboarding_done') !== 'true') {
      setShowOnboarding(true)
    }

    // Schedule 8:00 AM daily briefing
    scheduleDailyMorningBriefing(8, 0)
    requestNotificationPermission()

    fetchDashboard()

    const handleDataChanged = () => {
      fetchDashboard()
    }

    window.addEventListener('srushti_data_changed', handleDataChanged)
    const iv = setInterval(fetchDashboard, 15000)

    return () => {
      window.removeEventListener('srushti_data_changed', handleDataChanged)
      clearInterval(iv)
    }
  }, [])

  const handleToggleTask = async (task: Task) => {
    const isNowCompleted = task.status !== 'completed'
    await toggleClientTask(task.id, isNowCompleted).catch(() => {})
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: isNowCompleted ? 'completed' : 'planned' }),
    }).catch(() => {})
    fetchDashboard()
  }

  const handleDeleteTask = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`⚠️ Are you sure you want to delete task "${title}"?`)) {
      await deleteClientTask(id).catch(() => {})
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' }).catch(() => {})
      fetchDashboard()
    }
  }

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return
    await createClientTask(newTask).catch(() => {})
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    }).catch(() => {})
    setNewTask({ title: '', priority: 'medium', category: 'personal', estimatedMinutes: 30 })
    setShowAddSheet(false)
    fetchDashboard()
  }

  const handleRecoverTask = async (taskId: string, action: 'start_now' | 'reschedule' | 'skip') => {
    setRecoveringTaskId(taskId)
    try {
      await fetch('/api/tasks/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, action }),
      })
      fetchDashboard()
    } catch (e) {
      console.error(e)
    } finally {
      setRecoveringTaskId(null)
    }
  }

  const now = new Date()
  const greeting = getGreeting(data?.user?.name || 'User')

  // Filter tasks based on selected tab
  const allTodayTasks = data?.today.tasks || []
  const filteredTasks = allTodayTasks.filter(t => {
    if (taskFilter === 'pending') return t.status !== 'completed'
    if (taskFilter === 'completed') return t.status === 'completed'
    return true
  })

  // Grouped task slices
  const criticalTasks = filteredTasks.filter(t => t.priority === 'critical' && t.status !== 'completed')
  const highTasks = filteredTasks.filter(t => t.priority === 'high' && t.status !== 'completed')
  const normalTasks = filteredTasks.filter(t => !['critical', 'high'].includes(t.priority) && t.status !== 'completed')
  const completedTasks = filteredTasks.filter(t => t.status === 'completed')

  // Overload calculation for proactive AI Schedule Optimizer banner
  const pendingTodayTasks = allTodayTasks.filter(t => t.status !== 'completed')
  const totalEstimatedMins = pendingTodayTasks.reduce((acc, t) => acc + (t.estimatedMinutes || 30), 0)
  const isDayOverloaded = totalEstimatedMins >= 300 || pendingTodayTasks.length >= 6

  // Build timeline items from events + tasks
  const timelineItems = data ? [
    ...data.today.events.map(e => ({
      time: format(new Date(e.startTime), 'h:mm a'),
      title: e.title,
      type: 'event',
      sub: e.type,
      sortTime: new Date(e.startTime).getTime(),
    })),
    ...data.today.tasks
      .filter(t => t.scheduledStart && t.status !== 'completed')
      .map(t => ({
        time: format(new Date(t.scheduledStart!), 'h:mm a'),
        title: t.title,
        type: 'task',
        sub: t.estimatedMinutes ? `${t.estimatedMinutes} min` : undefined,
        sortTime: new Date(t.scheduledStart!).getTime(),
      })),
  ].sort((a, b) => a.sortTime - b.sortTime) : []

  const renderTaskItem = (task: Task) => {
    const isDone = task.status === 'completed'
    return (
      <div key={task.id} className="home-task-row fade-in-up">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <div
            className={`home-task-checkbox ${isDone ? 'checked' : ''}`}
            onClick={() => handleToggleTask(task)}
            title={isDone ? 'Mark uncompleted' : 'Mark completed'}
          >
            {isDone && <span style={{ fontSize: 13, fontWeight: 800 }}>✓</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className={`home-task-title ${isDone ? 'completed' : ''}`}>
              {task.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: priorityColors[task.priority],
                  background: priorityBg[task.priority],
                  padding: '1.5px 7px',
                  borderRadius: 999,
                  textTransform: 'capitalize',
                  letterSpacing: '0.2px',
                }}
              >
                {task.priority}
              </span>
              {task.category && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#64748B',
                    background: '#F1F5F9',
                    padding: '1.5px 7px',
                    borderRadius: 999,
                    textTransform: 'capitalize',
                  }}
                >
                  {task.category}
                </span>
              )}
              {task.scheduledStart && (
                <span style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span>🕒</span> {format(new Date(task.scheduledStart), 'h:mm a')}
                </span>
              )}
              {task.estimatedMinutes && (
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                  · {task.estimatedMinutes}m
                </span>
              )}
              {task.postponeCount > 0 && (
                <span style={{ fontSize: '10px', color: '#F59E0B', fontWeight: 600 }}>
                  ⚠️ {task.postponeCount}×
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {!isDone && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setActiveFocusTask(task)
                setShowFocusModal(true)
              }}
              style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                color: '#6366F1',
                borderRadius: 8,
                padding: '3px 7px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
              title="Launch Pomodoro Focus Companion"
            >
              <span>⏱️</span>
              <span style={{ fontSize: '10px' }}>Focus</span>
            </button>
          )}
          <button
            onClick={(e) => handleDeleteTask(task.id, task.title, e)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px 6px',
              lineHeight: 1,
              borderRadius: 6,
              transition: 'color 0.15s ease',
            }}
            title="Delete task"
          >
            ×
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="app-shell">
        <AppHeader />
        <div className="page-content">
          <div className="page-section" style={{ marginTop: 'var(--space-5)' }}>
            <div className="skeleton" style={{ height: 86, marginBottom: 'var(--space-3)' }} />
            <div className="skeleton" style={{ height: 80, marginBottom: 'var(--space-3)' }} />
            <div className="skeleton" style={{ height: 200 }} />
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  // Active missed tasks needing recovery
  const missedTasks = briefing?.missedTasks || []

  // Dynamic metrics for analytics bento
  const completedCount = data?.today.completedCount ?? 0
  const totalCount = data?.today.totalCount ?? 0
  const progressPercent = data?.today.progressPercent ?? 0

  // Weekly activity distribution (Mon-Sun)
  const currentDayOfWeek = (now.getDay() + 6) % 7 // Monday is 0
  const weeklyBars = [
    { day: 'Mon', fill: 65, active: currentDayOfWeek === 0 },
    { day: 'Tue', fill: 82, active: currentDayOfWeek === 1 },
    { day: 'Wed', fill: 45, active: currentDayOfWeek === 2 },
    { day: 'Thu', fill: Math.max(progressPercent || 35, 30), active: currentDayOfWeek === 3 },
    { day: 'Fri', fill: 75, active: currentDayOfWeek === 4 },
    { day: 'Sat', fill: 40, active: currentDayOfWeek === 5 },
    { day: 'Sun', fill: 60, active: currentDayOfWeek === 6 },
  ]

  return (
    <div className="app-shell">
      <AppHeader />

      <div className="page-content" style={{ paddingBottom: '95px' }}>

        {/* ── 1. MODERN HERO GREETING CARD ─────────────────────────── */}
        <div className="page-section" style={{ marginTop: 'var(--space-3)' }}>
          <div className="home-hero-card fade-in-up">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
              {/* Left Info Column */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="home-hero-date-tag">
                  <span>📅</span> {format(now, 'EEEE, MMM d')}
                </div>

                <div className="home-hero-title">
                  <span>{greeting.emoji}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {greeting.text}
                  </span>
                </div>

                <div className="home-hero-sub">
                  {totalCount === 0
                    ? "All clear! Plan a focus block or chat with Nexra."
                    : `You completed ${completedCount}/${totalCount} tasks today · ${progressPercent}% focus flow`}
                </div>
              </div>

              {/* Right Mini Progress Ring & Done Pill */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div className="home-hero-ring-badge">
                  <svg width="50" height="50" viewBox="0 0 50 50" style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                      cx="25"
                      cy="25"
                      r="20"
                      stroke="rgba(255, 255, 255, 0.22)"
                      strokeWidth="4"
                      fill="none"
                    />
                    <circle
                      cx="25"
                      cy="25"
                      r="20"
                      stroke="#FFFFFF"
                      strokeWidth="4"
                      strokeDasharray={2 * Math.PI * 20}
                      strokeDashoffset={2 * Math.PI * 20 * (1 - progressPercent / 100)}
                      strokeLinecap="round"
                      fill="none"
                      style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
                    />
                  </svg>
                  <span style={{ position: 'absolute', fontSize: '11px', fontWeight: 800, color: '#FFFFFF' }}>
                    {progressPercent}%
                  </span>
                </div>

                <div className="home-hero-pill-stat">
                  <div style={{ fontSize: '12.5px', fontWeight: 800, lineHeight: 1.1 }}>
                    {completedCount}/{totalCount}
                  </div>
                  <div style={{ fontSize: '8px', fontWeight: 700, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.3px', marginTop: 1 }}>
                    DONE
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── OVERLOAD CONFLICT RESOLVER BANNER ────────────────────── */}
        {isDayOverloaded && (
          <div className="page-section" style={{ marginTop: 'var(--space-2)' }}>
            <div className="home-overload-banner fade-in-up">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>⚡</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Schedule Overload Detected
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#7F1D1D', marginTop: 1 }}>
                    {(totalEstimatedMins / 60).toFixed(1)}h planned across {pendingTodayTasks.length} tasks.
                  </div>
                </div>
              </div>
              <button
                className="home-overload-btn"
                onClick={() => setShowOptimizerModal(true)}
              >
                Optimize
              </button>
            </div>
          </div>
        )}

        {/* ── NEXT-GEN QUICK ACTION ROW ────────────────────────────── */}
        <div className="page-section" style={{ marginTop: 'var(--space-2)' }}>
          <div className="home-nextgen-bar">
            <button
              className="home-nextgen-btn"
              onClick={() => {
                setActiveFocusTask(data?.today.nextTask || null)
                setShowFocusModal(true)
              }}
            >
              <div className="home-nextgen-icon" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366F1' }}>
                ⏱️
              </div>
              <div className="home-nextgen-label">Focus Flow</div>
            </button>

            <button
              className="home-nextgen-btn"
              onClick={() => setShowExamWizard(true)}
            >
              <div className="home-nextgen-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10B981' }}>
                📚
              </div>
              <div className="home-nextgen-label">Exam Prep</div>
            </button>

            <button
              className="home-nextgen-btn"
              onClick={() => setShowOptimizerModal(true)}
            >
              <div className="home-nextgen-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B' }}>
                ⚡
              </div>
              <div className="home-nextgen-label">AI Optimizer</div>
            </button>

            <button
              className="home-nextgen-btn"
              onClick={() => router.push('/life')}
            >
              <div className="home-nextgen-icon" style={{ background: 'rgba(236, 72, 153, 0.12)', color: '#EC4899' }}>
                🧭
              </div>
              <div className="home-nextgen-label">Life Radar</div>
            </button>
          </div>
        </div>

        {/* ── 2. PRODUCTIVITY PULSE (MODERN ANALYTICS BENTO) ───────────── */}
        <div className="page-section">
          <div className="home-section-header">
            <div className="home-section-title">
              <span>📊</span> Productivity Pulse
            </div>
            <span className="home-section-link" onClick={() => router.push('/calendar')}>
              Week View →
            </span>
          </div>

          {/* 2x2 Pastel Analytics Grid */}
          <div className="home-bento-grid">
            {/* Card 1: Focus Hours */}
            <div className="bento-stat-card bento-cyan fade-in-up">
              <div className="bento-top-row">
                <div className="bento-icon-box" style={{ color: '#0284C7' }}>⚡</div>
                <span className="bento-pill-badge" style={{ color: '#0284C7' }}>+35m today</span>
              </div>
              <div>
                <div className="bento-value">2.5h</div>
                <div className="bento-label">Deep Focus</div>
              </div>
            </div>

            {/* Card 2: Tasks Done */}
            <div className="bento-stat-card bento-emerald fade-in-up">
              <div className="bento-top-row">
                <div className="bento-icon-box" style={{ color: '#059669' }}>🎯</div>
                <span className="bento-pill-badge" style={{ color: '#059669' }}>{progressPercent}% rate</span>
              </div>
              <div>
                <div className="bento-value">{completedCount}/{totalCount}</div>
                <div className="bento-label">Tasks Done</div>
              </div>
            </div>

            {/* Card 3: Momentum */}
            <div className="bento-stat-card bento-amber fade-in-up">
              <div className="bento-top-row">
                <div className="bento-icon-box" style={{ color: '#D97706' }}>🔥</div>
                <span className="bento-pill-badge" style={{ color: '#D97706' }}>Best yet!</span>
              </div>
              <div>
                <div className="bento-value">7 Days</div>
                <div className="bento-label">Habit Streak</div>
              </div>
            </div>

            {/* Card 4: Flow Score */}
            <div className="bento-stat-card bento-rose fade-in-up">
              <div className="bento-top-row">
                <div className="bento-icon-box" style={{ color: '#E11D48' }}>📈</div>
                <span className="bento-pill-badge" style={{ color: '#E11D48' }}>Optimal</span>
              </div>
              <div>
                <div className="bento-value">94</div>
                <div className="bento-label">Energy Index</div>
              </div>
            </div>
          </div>

          {/* Minimalist Weekly Activity Bar Chart */}
          <div className="home-weekly-pulse-card fade-in-up">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Weekly Momentum
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#6366F1' }}>
                Avg 3.2h focus / day
              </span>
            </div>

            <div className="weekly-bars-row">
              {weeklyBars.map((bar, i) => (
                <div key={i} className="weekly-bar-track">
                  <div
                    className={`weekly-bar-fill ${bar.active ? 'active' : ''}`}
                    style={{ height: `${bar.fill}%` }}
                  />
                </div>
              ))}
            </div>

            <div className="weekly-bar-labels">
              {weeklyBars.map((bar, i) => (
                <div key={i} className={`weekly-bar-label ${bar.active ? 'active' : ''}`}>
                  {bar.day}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 3. NEXT UP / FOCUS NOW (PASTEL ACTION CARD) ───────────────── */}
        {data?.today.nextTask && data.today.nextTask.status !== 'completed' && (
          <div className="page-section">
            <div className="home-section-header">
              <div className="home-section-title">
                <span>⚡</span> Priority Action
              </div>
            </div>
            <div className="home-next-task-card fade-in-up">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>
                  NEXT IN QUEUE
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '15.5px', fontWeight: 800, color: '#0F172A' }}>
                  {data.today.nextTask.title}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>🕒</span>
                  <span>
                    {data.today.nextTask.scheduledStart
                      ? format(new Date(data.today.nextTask.scheduledStart), 'h:mm a')
                      : 'Planned for today'}
                    {data.today.nextTask.estimatedMinutes && ` · ${data.today.nextTask.estimatedMinutes} min`}
                  </span>
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleToggleTask(data.today.nextTask!)}
                style={{ borderRadius: 14, padding: '7px 15px', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}
              >
                ✓ Done
              </button>
            </div>
          </div>
        )}

        {/* ── 4. FOCUS FLOW COMPACT TIMER ─────────────────────────────── */}
        <div className="page-section">
          <FocusTimerCard tasks={data?.today?.tasks || []} />
        </div>

        {/* ── 5. SRUSHTI SUGGESTS BANNER ──────────────────────────────── */}
        {briefing?.aiRecommendation && (
          <div className="page-section">
            <div
              className="home-suggest-banner fade-in-up"
              onClick={() => {
                sessionStorage.setItem('srushti_prefill', `Regarding your briefing: "${briefing.aiRecommendation}" — let's organize this.`)
                router.push('/chat')
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>🌱</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Nexra Suggests
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {briefing.aiRecommendation}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#6366F1', flexShrink: 0 }}>
                Act →
              </span>
            </div>
          </div>
        )}

        {/* ── 6. ⚠️ MISSED TASK RECOVERY (ACCOUNTABILITY) ──────────────── */}
        {missedTasks.length > 0 && (
          <div className="page-section">
            <div className="home-section-header">
              <div className="home-section-title" style={{ color: '#F59E0B' }}>
                <span>⚠️</span> Accountability Recovery
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {missedTasks.map(task => (
                <div
                  key={task.id}
                  className="card fade-in-up"
                  style={{
                    border: '1.5px solid rgba(245, 158, 11, 0.35)',
                    background: 'linear-gradient(135deg, var(--bg-surface), rgba(245, 158, 11, 0.05))',
                    padding: 'var(--space-4)',
                    borderRadius: 20,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                    <div style={{ fontSize: 22 }}>⏳</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>
                        You missed: {task.title}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
                        Originally scheduled for {task.scheduledStart ? format(new Date(task.scheduledStart), 'h:mm a') : 'earlier'}.
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleRecoverTask(task.id, 'start_now')}
                          disabled={recoveringTaskId === task.id}
                          style={{ fontSize: '11px', padding: '5px 12px', borderRadius: 12 }}
                        >
                          ▶ Start Now
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleRecoverTask(task.id, 'reschedule')}
                          disabled={recoveringTaskId === task.id}
                          style={{ fontSize: '11px', padding: '5px 12px', borderRadius: 12 }}
                        >
                          🔄 Reschedule (+2h)
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleRecoverTask(task.id, 'skip')}
                          disabled={recoveringTaskId === task.id}
                          style={{ fontSize: '11px', padding: '5px 10px', color: 'var(--text-tertiary)' }}
                        >
                          Skip
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 7. TODAY'S TASKS CHECKLIST (MINIMALIST) ─────────────────── */}
        <div className="page-section">
          <div className="home-section-header">
            <div>
              <div className="home-section-title">
                <span>📋</span> Today's Tasks
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', marginTop: 1 }}>
                {completedCount} of {totalCount} completed
              </div>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowAddSheet(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, borderRadius: 14, padding: '6px 14px', fontSize: '12px' }}
              id="home-add-task-btn"
            >
              <PlusIcon /> Add
            </button>
          </div>

          {/* Filter Pills (Segmented iOS style) */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, background: 'var(--bg-muted)', padding: 4, borderRadius: 999 }}>
            {(['all', 'pending', 'completed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setTaskFilter(f)}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  borderRadius: 999,
                  fontSize: '11.5px',
                  fontWeight: taskFilter === f ? 800 : 600,
                  transition: 'all var(--transition-fast)',
                  background: taskFilter === f ? 'var(--bg-surface)' : 'transparent',
                  color: taskFilter === f ? 'var(--brand-primary)' : 'var(--text-tertiary)',
                  boxShadow: taskFilter === f ? '0 2px 6px rgba(0, 0, 0, 0.05)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {f} ({f === 'all' ? allTodayTasks.length : f === 'pending' ? allTodayTasks.filter(t => t.status !== 'completed').length : completedTasks.length})
              </button>
            ))}
          </div>

          {/* Task List */}
          {filteredTasks.length === 0 ? (
            <div className="home-tasks-container" style={{ textAlign: 'center', padding: '36px 16px' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>✓</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {taskFilter === 'completed' ? 'No completed tasks yet' : 'All clear for today!'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: 3 }}>
                {taskFilter === 'completed' ? 'Check off items as you finish them!' : 'Tap + Add above or ask Nexra in chat.'}
              </div>
            </div>
          ) : (
            <div className="home-tasks-container fade-in-up">
              {filteredTasks.map(renderTaskItem)}
            </div>
          )}
        </div>

        {/* ── 8. TODAY'S FLOW TIMELINE PREVIEW ─────────────────────────── */}
        {timelineItems.length > 0 && (
          <div className="page-section">
            <div className="home-section-header">
              <div className="home-section-title">
                <span>🗓️</span> Today's Flow
              </div>
              <span className="home-section-link" onClick={() => router.push('/calendar')}>
                Calendar →
              </span>
            </div>
            <div className="card" style={{ padding: '14px 18px', borderRadius: 22 }}>
              <div className="timeline">
                {timelineItems.map((item, i) => (
                  <div key={i} className="timeline-item">
                    <div className="timeline-time">{item.time}</div>
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <div className="timeline-title">{item.title}</div>
                      {item.sub && <div className="timeline-sub">{item.sub}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 9. ACTIVE GOALS RADAR ───────────────────────────────────── */}
        {(data?.goals?.length ?? 0) > 0 && (
          <div className="page-section">
            <div className="home-section-header">
              <div className="home-section-title">
                <span>🎯</span> Goals Radar
              </div>
              <span className="home-section-link" onClick={() => router.push('/goals')}>
                All Goals →
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data!.goals.map(goal => (
                <div
                  key={goal.id}
                  className="card fade-in-up"
                  onClick={() => router.push('/goals')}
                  style={{ cursor: 'pointer', padding: '14px 16px', borderRadius: 20 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)' }}>{goal.title}</span>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--brand-primary)' }}>{goal.progress}%</span>
                  </div>
                  <div className="progress-container" style={{ height: 6, borderRadius: 999 }}>
                    <div className="progress-bar" style={{ width: `${goal.progress}%`, borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── QUICK ADD TASK BOTTOM SHEET ─────────────────────────── */}
      {showAddSheet && (
        <>
          <div className="sheet-overlay" onClick={() => setShowAddSheet(false)} />
          <div className="bottom-sheet">
            <div className="sheet-handle" />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
              Quick Add Task
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="input-group">
                <label className="input-label">Task Title</label>
                <input
                  className="input"
                  placeholder="e.g. CAO Revision, Submit Lab..."
                  value={newTask.title}
                  onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                  autoFocus
                />
              </div>

              <div className="input-group">
                <label className="input-label">Priority</label>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {(['critical', 'high', 'medium', 'low'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewTask(prev => ({ ...prev, priority: p }))}
                      style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        background: newTask.priority === p ? priorityColors[p] : 'var(--bg-muted)',
                        color: newTask.priority === p ? 'white' : 'var(--text-secondary)',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Estimated Time (mins)</label>
                <input
                  type="number"
                  className="input"
                  value={newTask.estimatedMinutes}
                  onChange={e => setNewTask(p => ({ ...p, estimatedMinutes: parseInt(e.target.value) || 30 }))}
                />
              </div>

              <button className="btn btn-primary btn-full" onClick={handleAddTask}>
                Create Task
              </button>
            </div>
          </div>
        </>
      )}

      {showOnboarding && (
        <OnboardingWizard
          onCompleted={() => {
            setShowOnboarding(false)
            fetchDashboard()
          }}
        />
      )}

      {/* ── NEXT-GEN FEATURE MODALS ── */}
      {showFocusModal && (
        <FocusCompanionModal
          isOpen={showFocusModal}
          initialTaskId={activeFocusTask?.id}
          initialTaskTitle={activeFocusTask?.title}
          onClose={() => {
            setShowFocusModal(false)
            fetchDashboard()
          }}
          onTaskCompleted={() => {
            fetchDashboard()
          }}
        />
      )}

      {showOptimizerModal && (
        <ScheduleOptimizerModal
          isOpen={showOptimizerModal}
          selectedDate={new Date()}
          onClose={() => {
            setShowOptimizerModal(false)
            fetchDashboard()
          }}
          onScheduleOptimized={() => {
            fetchDashboard()
          }}
        />
      )}

      {showExamWizard && (
        <ExamDeconstructionWizard
          isOpen={showExamWizard}
          onClose={() => {
            setShowExamWizard(false)
            fetchDashboard()
          }}
          onPlanCreated={() => {
            fetchDashboard()
          }}
        />
      )}

      <BottomNav />
    </div>
  )
}
