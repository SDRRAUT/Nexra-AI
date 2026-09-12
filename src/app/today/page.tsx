'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import TaskBombFuse from '@/components/tasks/TaskBombFuse'
import { format, isToday } from 'date-fns'

interface Task {
  id: string; title: string; priority: string; status: string
  deadline?: string; scheduledStart?: string; estimatedMinutes?: number
  category?: string; postponeCount: number; description?: string
}

const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

const priorityColors: Record<string, string> = {
  critical: 'var(--priority-critical)', high: 'var(--priority-high)',
  medium: 'var(--priority-medium)', low: 'var(--priority-low)'
}

const priorityBg: Record<string, string> = {
  critical: 'var(--priority-critical-bg)', high: 'var(--priority-high-bg)',
  medium: 'var(--priority-medium-bg)', low: 'var(--priority-low-bg)'
}

import { getClientTasks, toggleClientTask } from '@/lib/data/clientData'

export default function TodayPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')

  const fetchTasks = async () => {
    try {
      // 1. Local offline IndexedDB first
      const localTasks = await getClientTasks()
      if (localTasks) {
        setTasks(localTasks as any)
      }

      // 2. Also try API if server is reachable
      const today = format(new Date(), 'yyyy-MM-dd')
      const res = await fetch(`/api/tasks?date=${today}`).catch(() => null)
      if (res && res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setTasks(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
    const handleDataChanged = () => {
      fetchTasks()
    }
    window.addEventListener('srushti_data_changed', handleDataChanged)
    return () => window.removeEventListener('srushti_data_changed', handleDataChanged)
  }, [])

  const handleToggle = async (task: Task) => {
    const isNowCompleted = task.status !== 'completed'
    const newStatus = isNowCompleted ? 'completed' : 'pending'
    await toggleClientTask(task.id, isNowCompleted).catch(() => {})

    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    }).catch(() => {})

    fetchTasks()
  }

  const filteredTasks = tasks.filter(t => {
    if (filter === 'pending') return t.status !== 'completed'
    if (filter === 'completed') return t.status === 'completed'
    return true
  }).sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2))

  const completedCount = tasks.filter(t => t.status === 'completed').length
  const totalCount = tasks.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const criticalTasks = filteredTasks.filter(t => t.priority === 'critical' && t.status !== 'completed')
  const importantTasks = filteredTasks.filter(t => t.priority === 'high' && t.status !== 'completed')
  const otherTasks = filteredTasks.filter(t => !['critical', 'high'].includes(t.priority) && t.status !== 'completed')
  const doneTasks = filteredTasks.filter(t => t.status === 'completed')

  const renderTask = (task: Task) => (
    <div key={task.id} className="task-card-wrapper fade-in-up">
      <TaskBombFuse task={task} />
      <div className="task-item">
        <div
          className={`task-checkbox ${task.status === 'completed' ? 'completed' : ''}`}
          onClick={() => handleToggle(task)}
          style={{ borderColor: task.status !== 'completed' ? priorityColors[task.priority] : undefined }}
        />
        <div className="task-content">
          <div className={`task-title ${task.status === 'completed' ? 'completed' : ''}`}>
            {task.title}
          </div>
          <div className="task-meta">
            <span style={{
              fontSize: 'var(--text-xs)', fontWeight: 600,
              color: priorityColors[task.priority],
              background: priorityBg[task.priority],
              padding: '1px 6px', borderRadius: 'var(--radius-full)'
            }}>
              {task.priority}
            </span>
            {task.scheduledStart && (
              <span className="task-time">{format(new Date(task.scheduledStart), 'h:mm a')}</span>
            )}
            {task.estimatedMinutes && (
              <span className="task-time">{task.estimatedMinutes}m</span>
            )}
            {task.postponeCount > 1 && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--priority-high)', fontWeight: 500 }}>
                ⚠️ Postponed {task.postponeCount}×
              </span>
            )}
          </div>
        </div>
        {task.scheduledStart && (
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-tertiary)', flexShrink: 0, minWidth: 40, textAlign: 'right' }}>
            {format(new Date(task.scheduledStart), 'HH:mm')}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="app-shell">
      <AppHeader title="Today" subtitle={format(new Date(), 'EEEE, MMMM d')} showBrand={false} />

      <div className="page-content">
        {/* Progress */}
        <div className="page-section" style={{ marginTop: 'var(--space-5)' }}>
          <div className="card fade-in-up">
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-3)' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {completedCount}<span style={{ fontSize: 'var(--text-xl)', color: 'var(--text-tertiary)' }}>/{totalCount}</span>
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>tasks complete</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--brand-primary)' }}>{progress}%</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>progress</div>
                </div>
              </div>
              <div className="progress-container" style={{ height: 8 }}>
                <div className="progress-bar" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="page-section">
          <div style={{ display: 'flex', gap: 'var(--space-2)', background: 'var(--bg-muted)', borderRadius: 'var(--radius-full)', padding: '3px' }}>
            {(['all', 'pending', 'completed'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                flex: 1, padding: 'var(--space-2)', borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-sm)', fontWeight: 600, transition: 'all var(--transition-fast)',
                background: filter === f ? 'white' : 'transparent',
                color: filter === f ? 'var(--brand-primary)' : 'var(--text-tertiary)',
                boxShadow: filter === f ? 'var(--shadow-sm)' : 'none',
              }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="page-section">
            <div className="skeleton" style={{ height: 80, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 80, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 80 }} />
          </div>
        )}

        {!loading && filteredTasks.length === 0 && (
          <div className="page-section">
            <div className="empty-state">
              <div className="empty-icon">{filter === 'completed' ? '🎉' : '✨'}</div>
              <div className="empty-title">{filter === 'completed' ? 'Nothing completed yet' : 'All clear!'}</div>
              <div className="empty-sub">
                {filter === 'completed'
                  ? 'Complete tasks to see them here.'
                  : "No tasks for today. Talk to Nexra to plan your day."}
              </div>
              {filter !== 'completed' && (
                <button className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }} onClick={() => router.push('/chat')}>
                  Plan with Nexra
                </button>
              )}
            </div>
          </div>
        )}

        {/* Critical */}
        {criticalTasks.length > 0 && (
          <div className="page-section">
            <div className="section-header"><div className="section-title">🔴 Critical</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{criticalTasks.map(renderTask)}</div>
          </div>
        )}

        {/* Important */}
        {importantTasks.length > 0 && (
          <div className="page-section">
            <div className="section-header"><div className="section-title">🟡 Important</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{importantTasks.map(renderTask)}</div>
          </div>
        )}

        {/* Other */}
        {otherTasks.length > 0 && (
          <div className="page-section">
            <div className="section-header"><div className="section-title">📋 Tasks</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{otherTasks.map(renderTask)}</div>
          </div>
        )}

        {/* Completed */}
        {doneTasks.length > 0 && filter !== 'pending' && (
          <div className="page-section">
            <div className="section-header"><div className="section-title">✅ Done</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: 0.7 }}>{doneTasks.map(renderTask)}</div>
          </div>
        )}

        {/* Ask Nexra floating prompt */}
        <div className="page-section">
          <div style={{
            background: 'linear-gradient(135deg, rgba(91,107,240,0.06), rgba(139,92,246,0.06))',
            border: '1px solid rgba(91,107,240,0.15)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-4) var(--space-5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }} onClick={() => router.push('/chat')}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>Need to change plans?</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: 2 }}>Tell Nexra and I&apos;ll adjust</div>
            </div>
            <div style={{ fontSize: 24 }}>💬</div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
