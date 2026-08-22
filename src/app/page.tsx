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

import { getClientDashboard, updateClientTask, deleteClientTask, createClientTask, type DashboardData as LocalDashData } from '@/lib/data/clientData'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'

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
          critical: todayTasks.filter(t => t.priority === 'critical' || t.priority === 'high'),
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
      if (dashRes && dashRes.today) setData(dashRes)
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
    const newStatus = task.status === 'completed' ? 'planned' : 'completed'
    await updateClientTask(task.id, { status: newStatus }).catch(() => {})
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
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
      <div key={task.id} className="task-item fade-in-up">
        <div
          className={`task-checkbox ${isDone ? 'completed' : ''}`}
          onClick={() => handleToggleTask(task)}
          style={{ borderColor: !isDone ? priorityColors[task.priority] : undefined }}
        />
        <div className="task-content">
          <div className={`task-title ${isDone ? 'completed' : ''}`}>{task.title}</div>
          <div className="task-meta">
            <span style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              color: priorityColors[task.priority],
              background: priorityBg[task.priority],
              padding: '1px 6px',
              borderRadius: 'var(--radius-full)'
            }}>
              {task.priority}
            </span>
            {task.category && (
              <span className="badge badge-info">{task.category}</span>
            )}
            {task.scheduledStart && (
              <span className="task-time">{format(new Date(task.scheduledStart), 'h:mm a')}</span>
            )}
            {task.estimatedMinutes && (
              <span className="task-time">{task.estimatedMinutes}m</span>
            )}
            {task.postponeCount > 0 && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--priority-high)', fontWeight: 500 }}>
                ⚠️ {task.postponeCount}× postponed
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => handleDeleteTask(task.id, task.title, e)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-tertiary)',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px',
            lineHeight: 1,
          }}
          title="Delete task"
        >
          ×
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="app-shell">
        <AppHeader />
        <div className="page-content">
          <div className="page-section" style={{ marginTop: 'var(--space-5)' }}>
            <div className="skeleton" style={{ height: 160, marginBottom: 'var(--space-4)' }} />
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

  return (
    <div className="app-shell">
      <AppHeader />

      <div className="page-content">

        {/* ── GREETING & PROGRESS CARD ─────────────────────────── */}
        <div className="page-section" style={{ marginTop: 'var(--space-4)' }}>
          <div className="greeting-card fade-in-up">
            <div className="greeting-time">{format(now, 'EEEE, MMMM d')}</div>
            <div className="greeting-text">{greeting.emoji} {greeting.text}</div>
            <div className="greeting-sub">
              {briefing?.briefingText || "Here is your personal overview for today."}
            </div>
            <div className="greeting-stats">
              <div className="greeting-stat">
                <span className="greeting-stat-value">{data?.today.completedCount ?? 0}/{data?.today.totalCount ?? 0}</span>
                <span className="greeting-stat-label">Tasks done</span>
              </div>
              <div className="greeting-stat">
                <span className="greeting-stat-value">{data?.today.progressPercent ?? 0}%</span>
                <span className="greeting-stat-label">Progress</span>
              </div>
              {(data?.atRisk ?? 0) > 0 && (
                <div className="greeting-stat">
                  <span className="greeting-stat-value" style={{ color: '#FCA5A5' }}>{data?.atRisk}</span>
                  <span className="greeting-stat-label">At risk</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── ⚠️ MISSED TASK RECOVERY CARD (Interactive Accountability) ──────────────── */}
        {missedTasks.length > 0 && (
          <div className="page-section">
            <div className="section-header">
              <div className="section-title" style={{ color: 'var(--priority-high)' }}>
                ⚠️ Accountability Recovery
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
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                    <div style={{ fontSize: 24 }}>⏳</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>
                        You missed: {task.title}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
                        Originally scheduled for {task.scheduledStart ? format(new Date(task.scheduledStart), 'h:mm a') : 'earlier'}. Srushti asks: What happened?
                      </div>

                      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleRecoverTask(task.id, 'start_now')}
                          disabled={recoveringTaskId === task.id}
                          style={{ fontSize: '11px', padding: '4px 10px' }}
                        >
                          ▶ Start Now
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleRecoverTask(task.id, 'reschedule')}
                          disabled={recoveringTaskId === task.id}
                          style={{ fontSize: '11px', padding: '4px 10px' }}
                        >
                          🔄 Reschedule (+2h)
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleRecoverTask(task.id, 'skip')}
                          disabled={recoveringTaskId === task.id}
                          style={{ fontSize: '11px', padding: '4px 8px', color: 'var(--text-tertiary)' }}
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

        {/* ── ⏱️ FOCUS & POMODORO TIMER CARD ─────────────────────── */}
        <div className="page-section">
          <FocusTimerCard tasks={data?.today?.tasks || []} />
        </div>

        {/* ── 🌅 PROACTIVE AI BRIEFING & RECOMMENDATION ─────────────────────────── */}
        {briefing?.aiRecommendation && (
          <div className="page-section">
            <div
              className="card fade-in-up"
              style={{
                padding: 'var(--space-4) var(--space-5)',
                background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-subtle))',
                border: '1px solid var(--border-default)',
                cursor: 'pointer',
              }}
              onClick={() => {
                sessionStorage.setItem('srushti_prefill', `Regarding your briefing: "${briefing.aiRecommendation}" — let's organize this.`)
                router.push('/chat')
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div style={{ fontSize: 24 }}>🌱</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Srushti Suggests
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)', fontWeight: 600, marginTop: 2, lineHeight: 1.4 }}>
                    {briefing.aiRecommendation}
                  </div>
                </div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--brand-primary)', fontWeight: 700 }}>
                  Act →
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── CRITICAL ITEMS ─────────────────────────── */}
        {(data?.critical?.length ?? 0) > 0 && (
          <div className="page-section">
            <div className="section-header">
              <div className="section-title">🔴 Urgent Attention</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {data!.critical.map(item => (
                <div key={item.id} className="critical-card fade-in-up">
                  <div className="critical-icon">🚨</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>{item.title}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--priority-critical)', marginTop: 2 }}>
                      {item.deadline ? `Due ${format(new Date(item.deadline), 'EEE MMM d, h:mm a')}` : 'Immediate priority'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── NEXT ACTION CARD ────────────────────────────── */}
        {data?.today.nextTask && data.today.nextTask.status !== 'completed' && (
          <div className="page-section">
            <div className="section-header">
              <div className="section-title">⚡ Focus Now</div>
            </div>
            <div className="next-action-card fade-in-up">
              <div className="next-action-indicator" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--brand-primary)', letterSpacing: '0.5px', marginBottom: 2 }}>
                  NEXT UP
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {data.today.nextTask.title}
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {data.today.nextTask.scheduledStart
                    ? format(new Date(data.today.nextTask.scheduledStart), 'h:mm a')
                    : 'Planned today'}
                  {data.today.nextTask.estimatedMinutes && ` · ${data.today.nextTask.estimatedMinutes} min`}
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleToggleTask(data.today.nextTask!)}
                title="Mark as done"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* ── UNIFIED TODAY & TASKS MANAGEMENT ─────────────────────────── */}
        <div className="page-section">
          <div className="section-header" style={{ alignItems: 'center' }}>
            <div>
              <div className="section-title">Today's Tasks</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 1 }}>
                {data?.today.completedCount ?? 0} of {data?.today.totalCount ?? 0} completed
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowAddSheet(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                id="home-add-task-btn"
              >
                <PlusIcon /> Add
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', background: 'var(--bg-muted)', padding: '3px', borderRadius: 'var(--radius-full)' }}>
            {(['all', 'pending', 'completed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setTaskFilter(f)}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  transition: 'all var(--transition-fast)',
                  background: taskFilter === f ? 'var(--bg-surface)' : 'transparent',
                  color: taskFilter === f ? 'var(--brand-primary)' : 'var(--text-tertiary)',
                  boxShadow: taskFilter === f ? 'var(--shadow-sm)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {f} ({f === 'all' ? allTodayTasks.length : f === 'pending' ? allTodayTasks.filter(t => t.status !== 'completed').length : completedTasks.length})
              </button>
            ))}
          </div>

          {/* Task Lists by Priority */}
          {filteredTasks.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-6) 0' }}>
              <div className="empty-icon">✓</div>
              <div className="empty-title">
                {taskFilter === 'completed' ? 'No completed tasks yet' : 'No tasks in this view'}
              </div>
              <div className="empty-sub">
                {taskFilter === 'completed' ? 'Check off items as you finish them!' : 'Tap + Add above or ask Srushti in chat.'}
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 'var(--space-2) var(--space-4)' }}>
              {criticalTasks.length > 0 && (
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--priority-critical)', textTransform: 'uppercase', letterSpacing: '0.6px', padding: '8px 0 4px' }}>
                    Critical Priority
                  </div>
                  {criticalTasks.map(renderTaskItem)}
                </div>
              )}

              {highTasks.length > 0 && (
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--priority-high)', textTransform: 'uppercase', letterSpacing: '0.6px', padding: '8px 0 4px' }}>
                    High Priority
                  </div>
                  {highTasks.map(renderTaskItem)}
                </div>
              )}

              {normalTasks.length > 0 && (
                <div>
                  {(criticalTasks.length > 0 || highTasks.length > 0) && (
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', padding: '8px 0 4px' }}>
                      Standard
                    </div>
                  )}
                  {normalTasks.map(renderTaskItem)}
                </div>
              )}

              {completedTasks.length > 0 && taskFilter !== 'pending' && (
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--brand-accent)', textTransform: 'uppercase', letterSpacing: '0.6px', padding: '8px 0 4px' }}>
                    Completed ({completedTasks.length})
                  </div>
                  {completedTasks.map(renderTaskItem)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── TODAY'S SCHEDULE TIMELINE ─────────────────────────── */}
        {timelineItems.length > 0 && (
          <div className="page-section">
            <div className="section-header">
              <div className="section-title">Today's Flow</div>
              <span className="section-action" onClick={() => router.push('/calendar')}>Calendar →</span>
            </div>
            <div className="card" style={{ padding: 'var(--space-4)' }}>
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

        {/* ── ACTIVE GOALS RADAR ─────────────────────────── */}
        {(data?.goals?.length ?? 0) > 0 && (
          <div className="page-section">
            <div className="section-header">
              <div className="section-title">🎯 Goals Radar</div>
              <span className="section-action" onClick={() => router.push('/goals')}>All goals →</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {data!.goals.map(goal => (
                <div key={goal.id} className="card fade-in-up" onClick={() => router.push('/goals')} style={{ cursor: 'pointer', padding: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{goal.title}</span>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--brand-primary)' }}>{goal.progress}%</span>
                  </div>
                  <div className="progress-container">
                    <div className="progress-bar" style={{ width: `${goal.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── AI ACTIVITY LOG SNIPPET ─────────────────────────── */}
        {(data?.recentActions?.length ?? 0) > 0 && (
          <div className="page-section">
            <div className="section-header">
              <div className="section-title">🤖 Srushti Live Log</div>
              <span className="section-action" onClick={() => router.push('/agents')}>View all →</span>
            </div>
            <div className="card" style={{ padding: 'var(--space-2) var(--space-4)' }}>
              {data!.recentActions.slice(0, 3).map(action => (
                <div key={action.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-primary)' }} />
                  <div style={{ flex: 1, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {action.description}
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

      <BottomNav />
    </div>
  )
}
