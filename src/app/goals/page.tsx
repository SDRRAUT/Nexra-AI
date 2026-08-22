'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import { format, differenceInDays } from 'date-fns'

interface Goal {
  id: string
  title: string
  description?: string
  category?: string
  priority: string
  status: string
  progress: number
  targetDate?: string
  milestones: Milestone[]
  tasks: Task[]
}

interface Milestone {
  id: string
  title: string
  status: string
  targetDate?: string
}

interface Task {
  id: string
  title: string
  status: string
}

const categoryIcons: Record<string, string> = {
  career: '💼',
  health: '💪',
  learning: '📚',
  finance: '💰',
  personal: '✨',
  study: '📖',
}

const priorityColors: Record<string, string> = {
  critical: 'var(--priority-critical)',
  high: 'var(--priority-high)',
  medium: 'var(--priority-medium)',
  low: 'var(--priority-low)',
}

import { getClientGoals, createClientGoal, deleteClientGoal } from '@/lib/data/clientData'

export default function GoalsPage() {
  const router = useRouter()
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'study',
    priority: 'high',
    targetDate: '',
  })

  const fetchGoals = async () => {
    try {
      // 1. Try local offline data first
      const localGoals = await getClientGoals()
      if (localGoals) {
        setGoals(localGoals)
        setLoading(false)
      }

      // 2. Also try API if server is reachable
      const res = await fetch('/api/goals').catch(() => null)
      if (res && res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setGoals(data)
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGoals()
    const handleDataChanged = () => {
      fetchGoals()
    }
    window.addEventListener('srushti_data_changed', handleDataChanged)
    return () => window.removeEventListener('srushti_data_changed', handleDataChanged)
  }, [])

  const addGoal = async () => {
    if (!newGoal.title.trim()) return
    await createClientGoal({
      title: newGoal.title,
      description: newGoal.description,
      category: newGoal.category,
      priority: newGoal.priority,
      targetDate: newGoal.targetDate ? new Date(newGoal.targetDate).toISOString() : undefined,
    }).catch(() => {})

    await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newGoal.title,
        description: newGoal.description,
        category: newGoal.category,
        priority: newGoal.priority,
        targetDate: newGoal.targetDate ? new Date(newGoal.targetDate).toISOString() : undefined,
      }),
    }).catch(() => {})

    setNewGoal({ title: '', description: '', category: 'study', priority: 'high', targetDate: '' })
    setShowAdd(false)
    fetchGoals()
  }

  const completionPct = (goal: Goal) => {
    if (!goal.tasks || goal.tasks.length === 0) return goal.progress
    const done = goal.tasks.filter(t => t.status === 'completed').length
    return Math.round((done / goal.tasks.length) * 100)
  }

  const activeGoals = goals.filter(g => g.status === 'active')
  const completedGoals = goals.filter(g => g.status === 'completed')

  return (
    <div className="app-shell">
      <AppHeader />

      <div className="page-content">
        <div className="page-section" style={{ marginTop: 'var(--space-4)' }}>

          {/* ── GOALS HERO OVERVIEW ─────────────────────────── */}
          <div
            className="card fade-in-up"
            style={{
              padding: 'var(--space-5)',
              background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-subtle))',
              border: '1px solid var(--border-default)',
              marginBottom: 'var(--space-5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  GOALS RADAR
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Vision & Milestones
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {activeGoals.length} active objectives in progress
                </div>
              </div>

              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowAdd(true)}
                style={{ fontSize: '12px', padding: '6px 14px' }}
              >
                + New Goal
              </button>
            </div>

            {/* Quick stats row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 'var(--space-2)',
                marginTop: 'var(--space-4)',
                paddingTop: 'var(--space-3)',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--brand-primary)' }}>
                  {goals.length}
                </div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                  Total
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--brand-accent)' }}>
                  {completedGoals.length}
                </div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                  Achieved
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--brand-purple)' }}>
                  {activeGoals.length > 0
                    ? Math.round(activeGoals.reduce((a, g) => a + completionPct(g), 0) / activeGoals.length)
                    : 0}%
                </div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                  Avg Progress
                </div>
              </div>
            </div>
          </div>

          {/* ── GOALS LIST ─────────────────────────── */}
          {loading && (
            <>
              <div className="skeleton" style={{ height: 120, borderRadius: 20, marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 120, borderRadius: 20 }} />
            </>
          )}

          {!loading && goals.length === 0 && (
            <div className="card fade-in-up">
              <div className="empty-state" style={{ padding: 'var(--space-8) var(--space-4)' }}>
                <div className="empty-icon">🎯</div>
                <div className="empty-title">No goals set yet</div>
                <div className="empty-sub">
                  Set ambitious goals and Srushti will help you break them into bite-sized daily tasks.
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
                    + Create Goal
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => router.push('/chat')}>
                    Discuss with Srushti
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            {goals.map(goal => {
              const pct = completionPct(goal)
              const daysLeft = goal.targetDate ? differenceInDays(new Date(goal.targetDate), new Date()) : null
              return (
                <div
                  key={goal.id}
                  className="card fade-in-up"
                  style={{
                    border: `1px solid var(--border-default)`,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: 'var(--space-4) var(--space-5)' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 'var(--radius-lg)',
                            background: 'var(--bg-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 22,
                            flexShrink: 0,
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {categoryIcons[goal.category || ''] || '🎯'}
                        </div>
                        <div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {goal.title}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 2 }}>
                            <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                              {goal.category || 'general'}
                            </span>
                            {daysLeft !== null && (
                              <span style={{ fontSize: 'var(--text-xs)', color: daysLeft < 7 ? 'var(--priority-critical)' : 'var(--text-tertiary)', fontWeight: 600 }}>
                                ⏰ {daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Due today' : 'Overdue'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: priorityColors[goal.priority] || 'var(--brand-primary)',
                          background: (priorityColors[goal.priority] || '#6366F1') + '15',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {goal.priority}
                      </span>
                    </div>

                    {/* Description */}
                    {goal.description && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 'var(--space-3)', lineHeight: 1.4 }}>
                        {goal.description}
                      </div>
                    )}

                    {/* Progress Bar & percentage */}
                    <div style={{ marginTop: 'var(--space-4)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)' }}>
                          {(goal.tasks || []).length > 0 ? `${(goal.tasks || []).filter((t: any) => t.status === 'completed').length}/${(goal.tasks || []).length} tasks finished` : 'Progress'}
                        </span>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--brand-primary)' }}>
                          {pct}%
                        </span>
                      </div>
                      <div className="progress-container" style={{ height: 8, borderRadius: 6 }}>
                        <div
                          className="progress-bar"
                          style={{
                            width: `${pct}%`,
                            background: pct >= 100 ? 'var(--brand-accent)' : 'linear-gradient(90deg, var(--brand-primary), var(--brand-purple))',
                          }}
                        />
                      </div>
                    </div>

                    {/* Action link */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-3)' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => router.push('/chat')}
                        style={{ fontSize: '11px', color: 'var(--brand-primary)' }}
                      >
                        Plan subtasks with Srushti →
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>

      {/* ── NEW GOAL BOTTOM SHEET ─────────────────────────── */}
      {showAdd && (
        <>
          <div className="sheet-overlay" onClick={() => setShowAdd(false)} />
          <div className="bottom-sheet">
            <div className="sheet-handle" />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
              Create New Goal
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="input-group">
                <label className="input-label">Goal Title</label>
                <input
                  className="input"
                  placeholder="e.g. Master Computer Architecture, Run 5k..."
                  value={newGoal.title}
                  onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))}
                  autoFocus
                />
              </div>

              <div className="input-group">
                <label className="input-label">Category</label>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {['study', 'career', 'health', 'learning', 'finance', 'personal'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewGoal(p => ({ ...p, category: c }))}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        background: newGoal.category === c ? 'var(--brand-primary)' : 'var(--bg-muted)',
                        color: newGoal.category === c ? 'white' : 'var(--text-secondary)',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {categoryIcons[c]} {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Target Completion Date</label>
                <input
                  type="date"
                  className="input"
                  value={newGoal.targetDate}
                  onChange={e => setNewGoal(p => ({ ...p, targetDate: e.target.value }))}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Why does this matter to you?</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Motivation or milestones..."
                  value={newGoal.description}
                  onChange={e => setNewGoal(p => ({ ...p, description: e.target.value }))}
                  style={{ resize: 'none' }}
                />
              </div>

              <button className="btn btn-primary btn-full" onClick={addGoal}>
                Save Goal
              </button>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  )
}
