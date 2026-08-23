'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import { format, subDays, isSameDay } from 'date-fns'
import {
  getClientHabits,
  toggleClientHabit,
  createClientHabit,
  updateClientHabit,
  deleteClientHabit,
} from '@/lib/data/clientData'

interface Habit {
  id: string
  title: string
  description?: string
  frequency: string
  scheduledTime?: string
  currentStreak: number
  longestStreak: number
  totalCompleted: number
  logs: HabitLog[]
}

interface HabitLog {
  id: string
  date: string
  status: string
}

export default function HabitsPage() {
  const router = useRouter()
  const [habits, setHabits] = useState<Habit[]>([])
  const [todayLogs, setTodayLogs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [activeMenuHabitId, setActiveMenuHabitId] = useState<string | null>(null)
  const [editingHabit, setEditingHabit] = useState<any | null>(null)

  const [newHabit, setNewHabit] = useState({
    title: '',
    frequency: 'daily',
    scheduledTime: '08:00',
    category: 'health',
  })

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const last7Days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i))

  const fetchHabits = async () => {
    try {
      // 1. Try local offline data first
      const localHabits = await getClientHabits()
      if (localHabits) {
        setHabits(localHabits as any)
      }

      // 2. Also try API if server is running
      const [hRes, lRes] = await Promise.all([
        fetch('/api/habits').then(r => r.json()).catch(() => null),
        fetch(`/api/habits/logs?date=${todayStr}`).then(r => r.json()).catch(() => null),
      ])

      if (Array.isArray(hRes)) setHabits(hRes)

      const logMap: Record<string, string> = {}
      if (Array.isArray(lRes)) {
        lRes.forEach((l: HabitLog) => {
          logMap[l.date] = l.status
        })
      }
      setTodayLogs(logMap)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHabits()
    const handleDataChanged = () => {
      fetchHabits()
    }
    window.addEventListener('srushti_data_changed', handleDataChanged)
    return () => window.removeEventListener('srushti_data_changed', handleDataChanged)
  }, [])

  const toggleHabit = async (habitId: string) => {
    const current = todayLogs[habitId]
    const isNowCompleted = current !== 'completed'
    const newStatus = isNowCompleted ? 'completed' : 'skipped'

    setTodayLogs(prev => ({ ...prev, [habitId]: newStatus }))
    await toggleClientHabit(habitId, isNowCompleted).catch(() => {})

    await fetch('/api/habits/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        habitId,
        date: todayStr,
        status: newStatus,
      }),
    }).catch(() => {})

    fetchHabits()
  }

  const handleDeleteHabit = async (id: string, title: string) => {
    if (confirm(`Delete habit "${title}"?`)) {
      await deleteClientHabit(id).catch(() => {})
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('srushti_data_changed'))
      }
      fetchHabits()
    }
  }

  const handleSaveEditHabit = async () => {
    if (!editingHabit || !editingHabit.title.trim()) return
    await updateClientHabit(editingHabit.id, {
      title: editingHabit.title,
      frequency: editingHabit.frequency,
      scheduledTime: editingHabit.scheduledTime,
      category: editingHabit.category,
    }).catch(() => {})

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('srushti_data_changed'))
    }
    setEditingHabit(null)
    fetchHabits()
  }

  const handleAddHabit = async () => {
    if (!newHabit.title.trim()) return
    await createClientHabit(newHabit).catch(() => {})
    await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newHabit),
    }).catch(() => {})
    setNewHabit({ title: '', frequency: 'daily', scheduledTime: '08:00', category: 'health' })
    setShowAdd(false)
    fetchHabits()
  }

  const completedTodayCount = habits.filter(h => todayLogs[h.id] === 'completed').length

  return (
    <div className="app-shell">
      <AppHeader />

      <div className="page-content">
        <div className="page-section" style={{ marginTop: 'var(--space-4)' }}>

          {/* ── HERO HABITS OVERVIEW ─────────────────────────── */}
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
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-accent)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  DAILY CONSISTENCY
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Habits & Streaks
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {completedTodayCount} of {habits.length} routines completed today
                </div>
              </div>

              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowAdd(true)}
                style={{ fontSize: '12px', padding: '6px 14px' }}
              >
                + New Habit
              </button>
            </div>

            {/* Habit Completion Progress */}
            <div style={{ marginTop: 'var(--space-4)' }}>
              <div className="progress-container" style={{ height: 8, borderRadius: 6 }}>
                <div
                  className="progress-bar"
                  style={{
                    width: `${habits.length > 0 ? (completedTodayCount / habits.length) * 100 : 0}%`,
                    background: 'linear-gradient(90deg, var(--brand-accent), #34D399)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── HABITS LIST ─────────────────────────── */}
          {loading && (
            <>
              <div className="skeleton" style={{ height: 100, borderRadius: 20, marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 100, borderRadius: 20 }} />
            </>
          )}

          {!loading && habits.length === 0 && (
            <div className="card fade-in-up">
              <div className="empty-state" style={{ padding: 'var(--space-8) var(--space-4)' }}>
                <div className="empty-icon">🔁</div>
                <div className="empty-title">No habits tracked yet</div>
                <div className="empty-sub">
                  Build unbreakable momentum. Add your morning routines, study habits, and fitness goals.
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowAdd(true)}
                  style={{ marginTop: 'var(--space-4)' }}
                >
                  + Add First Habit
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
            {habits.map(habit => {
              const isCompleted = todayLogs[habit.id] === 'completed'
              return (
                <div
                  key={habit.id}
                  className="card fade-in-up"
                  style={{
                    border: `1px solid var(--border-default)`,
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{ padding: 'var(--space-4) var(--space-5)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1 }}>
                        <div
                          onClick={() => toggleHabit(habit.id)}
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 'var(--radius-full)',
                            background: isCompleted ? 'var(--brand-accent)' : 'var(--bg-subtle)',
                            color: isCompleted ? 'white' : 'var(--text-tertiary)',
                            border: `2px solid ${isCompleted ? 'var(--brand-accent)' : 'var(--border-default)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 16,
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all var(--transition-spring)',
                            boxShadow: isCompleted ? '0 4px 12px rgba(16, 185, 129, 0.35)' : 'none',
                          }}
                        >
                          {isCompleted ? '✓' : ''}
                        </div>

                        <div>
                          <div style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 'var(--text-base)',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            textDecoration: isCompleted ? 'line-through' : 'none',
                            opacity: isCompleted ? 0.75 : 1,
                          }}>
                            {habit.title}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 2 }}>
                            {habit.scheduledTime && (
                              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                                ⏰ {habit.scheduledTime}
                              </span>
                            )}
                            <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                              {habit.frequency}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
                        {/* Streak Badge */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            background: habit.currentStreak > 0 ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-subtle)',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-full)',
                            border: `1px solid ${habit.currentStreak > 0 ? 'rgba(245, 158, 11, 0.25)' : 'var(--border-subtle)'}`,
                          }}
                        >
                          <span style={{ fontSize: 14 }}>🔥</span>
                          <span style={{
                            fontSize: 'var(--text-xs)',
                            fontWeight: 800,
                            color: habit.currentStreak > 0 ? 'var(--brand-warm)' : 'var(--text-tertiary)',
                          }}>
                            {habit.currentStreak}d
                          </span>
                        </div>

                        {/* 3-dots Menu Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveMenuHabitId(activeMenuHabitId === habit.id ? null : habit.id)
                          }}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 'var(--radius-full)',
                            border: '1px solid var(--border-default)',
                            background: 'var(--bg-subtle)',
                            color: 'var(--text-primary)',
                            fontSize: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          ⋮
                        </button>

                        {activeMenuHabitId === habit.id && (
                          <div
                            className="card fade-in-up"
                            style={{
                              position: 'absolute',
                              top: 'calc(100% + 4px)',
                              right: 0,
                              zIndex: 50,
                              minWidth: 130,
                              padding: 4,
                              borderRadius: 'var(--radius-lg)',
                              boxShadow: 'var(--shadow-xl)',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-default)',
                            }}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingHabit({ ...habit })
                                setActiveMenuHabitId(null)
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--text-primary)',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textAlign: 'left',
                                borderRadius: 'var(--radius-md)',
                              }}
                            >
                              <span>✏️</span>
                              <span>Edit Habit</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveMenuHabitId(null)
                                handleDeleteHabit(habit.id, habit.title)
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--status-error, #EF4444)',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textAlign: 'left',
                                borderRadius: 'var(--radius-md)',
                              }}
                            >
                              <span>🗑️</span>
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 7-Day Matrix Dots */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 'var(--space-3)',
                        paddingTop: 'var(--space-3)',
                        borderTop: '1px solid var(--border-subtle)',
                      }}
                    >
                      <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                        Past 7 Days
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {last7Days.map((d, i) => {
                          const isT = isSameDay(d, new Date())
                          const dStr = format(d, 'yyyy-MM-dd')
                          const isDone = isT ? isCompleted : habit.logs?.some(l => l.date === dStr && l.status === 'completed')
                          return (
                            <div
                              key={i}
                              title={format(d, 'EEE, MMM d')}
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 'var(--radius-full)',
                                background: isDone ? 'var(--brand-accent)' : 'var(--bg-muted)',
                                color: isDone ? 'white' : 'var(--text-tertiary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '9px',
                                fontWeight: 700,
                                border: isT ? '1.5px solid var(--brand-primary)' : 'none',
                              }}
                            >
                              {format(d, 'EEEEE')}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>

      {/* ── NEW HABIT BOTTOM SHEET ─────────────────────────── */}
      {showAdd && (
        <>
          <div className="sheet-overlay" onClick={() => setShowAdd(false)} />
          <div className="bottom-sheet">
            <div className="sheet-handle" />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
              Add Habit Routine
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="input-group">
                <label className="input-label">Habit Title</label>
                <input
                  className="input"
                  placeholder="e.g. Read 20 pages, Code 45 mins, Morning Workout..."
                  value={newHabit.title}
                  onChange={e => setNewHabit(p => ({ ...p, title: e.target.value }))}
                  autoFocus
                />
              </div>

              <div className="input-group">
                <label className="input-label">Frequency</label>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {['daily', 'weekdays', 'weekends'].map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setNewHabit(p => ({ ...p, frequency: f }))}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        background: newHabit.frequency === f ? 'var(--brand-primary)' : 'var(--bg-muted)',
                        color: newHabit.frequency === f ? 'white' : 'var(--text-secondary)',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Preferred Time of Day</label>
                <input
                  type="time"
                  className="input"
                  value={newHabit.scheduledTime}
                  onChange={e => setNewHabit(p => ({ ...p, scheduledTime: e.target.value }))}
                />
              </div>

              <button className="btn btn-primary btn-full" onClick={handleAddHabit}>
                Start Habit Streak
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── EDIT HABIT BOTTOM SHEET ─────────────────────────── */}
      {editingHabit && (
        <>
          <div className="sheet-overlay" onClick={() => setEditingHabit(null)} />
          <div className="bottom-sheet">
            <div className="sheet-handle" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700 }}>
                ✏️ Edit Habit
              </div>
              <button
                type="button"
                onClick={() => setEditingHabit(null)}
                style={{ border: 'none', background: 'none', fontSize: 18, color: 'var(--text-tertiary)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="input-group">
                <label className="input-label">Habit Title</label>
                <input
                  className="input"
                  value={editingHabit.title || ''}
                  onChange={e => setEditingHabit((p: any) => ({ ...p, title: e.target.value }))}
                  autoFocus
                />
              </div>

              <div className="input-group">
                <label className="input-label">Frequency</label>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {['daily', 'weekdays', 'weekends'].map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setEditingHabit((p: any) => ({ ...p, frequency: f }))}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        background: editingHabit.frequency === f ? 'var(--brand-primary)' : 'var(--bg-muted)',
                        color: editingHabit.frequency === f ? 'white' : 'var(--text-secondary)',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Preferred Time</label>
                <input
                  type="time"
                  className="input"
                  value={editingHabit.scheduledTime || '08:00'}
                  onChange={e => setEditingHabit((p: any) => ({ ...p, scheduledTime: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 4 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setEditingHabit(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  onClick={handleSaveEditHabit}
                >
                  💾 Save Changes
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  )
}
