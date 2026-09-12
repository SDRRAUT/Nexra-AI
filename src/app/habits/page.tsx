'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import { format, subDays, isSameDay } from 'date-fns'
import {
  getClientHabits,
  getClientHabitLogs,
  toggleClientHabit,
  createClientHabit,
  updateClientHabit,
  deleteClientHabit,
} from '@/lib/data/clientData'

interface HabitLog {
  id: string
  habitId?: string
  date: string
  status: string
}

interface Habit {
  id: string
  title: string
  description?: string
  frequency: string
  scheduledTime?: string
  currentStreak: number
  longestStreak: number
  totalCompleted: number
  category?: string
  logs: HabitLog[]
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
    category: 'productivity',
  })

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])
  const last7Days = useMemo(() => Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i)), [])

  const fetchHabits = async () => {
    try {
      // 1. Fetch offline-first data from IndexedDB
      const [localHabits, localLogs] = await Promise.all([
        getClientHabits(),
        getClientHabitLogs(),
      ])

      const logMap: Record<string, string> = {}
      if (Array.isArray(localLogs)) {
        localLogs.forEach((l: any) => {
          if (l.date === todayStr && l.habitId) {
            logMap[l.habitId] = l.status
          }
        })
      }
      setTodayLogs(logMap)

      const habitsWithLogs: Habit[] = (localHabits || []).map(h => ({
        ...h,
        logs: (localLogs || []).filter(l => l.habitId === h.id),
      }))
      setHabits(habitsWithLogs)

      // 2. Sync with backend API if available
      try {
        const [hRes, lRes] = await Promise.all([
          fetch('/api/habits').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`/api/habits/logs?date=${todayStr}`).then(r => r.ok ? r.json() : null).catch(() => null),
        ])

        if (Array.isArray(hRes) && hRes.length > 0) {
          setHabits(prev => hRes.map(h => {
            const matched = prev.find(p => p.id === h.id)
            return {
              ...h,
              logs: matched?.logs || h.logs || [],
            }
          }))
        }

        if (Array.isArray(lRes) && lRes.length > 0) {
          lRes.forEach((l: any) => {
            if (l.habitId) {
              logMap[l.habitId] = l.status
            }
          })
          setTodayLogs({ ...logMap })
        }
      } catch {}
    } catch (e) {
      console.error('Error loading habits:', e)
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

  const toggleHabit = async (habitId: string, specificDate?: string) => {
    const targetDate = specificDate || todayStr
    const isToday = targetDate === todayStr

    const currentStatus = isToday
      ? todayLogs[habitId]
      : habits.find(h => h.id === habitId)?.logs?.find(l => l.date === targetDate)?.status

    const isNowCompleted = currentStatus !== 'completed'
    const newStatus = isNowCompleted ? 'completed' : 'skipped'

    // Optimistic UI update immediately
    if (isToday) {
      setTodayLogs(prev => ({ ...prev, [habitId]: newStatus }))
    }

    setHabits(prev => prev.map(h => {
      if (h.id !== habitId) return h
      const currentLogs = h.logs || []
      const filteredLogs = currentLogs.filter(l => l.date !== targetDate)
      const updatedLogs = isNowCompleted
        ? [...filteredLogs, { id: `log-${Date.now()}`, habitId, date: targetDate, status: 'completed' }]
        : filteredLogs

      const streakDelta = isNowCompleted ? 1 : -1
      const newStreak = Math.max(0, (h.currentStreak || 0) + streakDelta)

      return {
        ...h,
        currentStreak: newStreak,
        logs: updatedLogs,
      }
    }))

    // Persist to local IndexedDB
    await toggleClientHabit(habitId, isNowCompleted, targetDate).catch(() => {})

    // Optional sync to backend
    fetch('/api/habits/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        habitId,
        date: targetDate,
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
    fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newHabit),
    }).catch(() => {})
    setNewHabit({ title: '', frequency: 'daily', scheduledTime: '08:00', category: 'productivity' })
    setShowAdd(false)
    fetchHabits()
  }

  const completedTodayCount = habits.filter(h => todayLogs[h.id] === 'completed').length
  const progressPercent = habits.length > 0 ? Math.round((completedTodayCount / habits.length) * 100) : 0

  return (
    <div className="app-shell">
      <AppHeader />

      <div className="page-content" style={{ paddingBottom: '95px' }}>
        <div className="page-section" style={{ marginTop: 'var(--space-3)' }}>

          {/* ── HERO HABITS OVERVIEW ─────────────────────────── */}
          <div
            className="card fade-in-up"
            style={{
              padding: '16px 18px',
              background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-subtle))',
              border: '1px solid var(--border-default)',
              borderRadius: '20px',
              marginBottom: 'var(--space-4)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--brand-accent, #10B981)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  DAILY CONSISTENCY
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                  Habits & Streaks
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: 3 }}>
                  {completedTodayCount} of {habits.length} routines completed today
                </div>
              </div>

              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowAdd(true)}
                style={{ fontSize: '12px', padding: '7px 14px', borderRadius: '12px', fontWeight: 700 }}
                id="add-new-habit-btn"
              >
                + New Habit
              </button>
            </div>

            {/* Habit Completion Progress */}
            <div style={{ marginTop: '14px' }}>
              <div className="progress-container" style={{ height: 8, borderRadius: 999, background: 'var(--bg-muted)' }}>
                <div
                  className="progress-bar"
                  style={{
                    width: `${progressPercent}%`,
                    background: 'linear-gradient(90deg, #10B981, #34D399)',
                    borderRadius: 999,
                    transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── HABITS LIST ─────────────────────────── */}
          {loading && (
            <>
              <div className="skeleton" style={{ height: 110, borderRadius: 20, marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 110, borderRadius: 20 }} />
            </>
          )}

          {!loading && habits.length === 0 && (
            <div className="card fade-in-up" style={{ borderRadius: 20 }}>
              <div className="empty-state" style={{ padding: '36px 16px', textAlign: 'center' }}>
                <div className="empty-icon" style={{ fontSize: 36, marginBottom: 8 }}>🔁</div>
                <div className="empty-title" style={{ fontSize: 16, fontWeight: 700 }}>No habits tracked yet</div>
                <div className="empty-sub" style={{ fontSize: 12, color: 'var(--text-tertiary)', maxWidth: 300, margin: '6px auto 0' }}>
                  Build consistent momentum. Add morning routines, workout habits, or study focus rituals.
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowAdd(true)}
                  style={{ marginTop: 14, borderRadius: 12, padding: '8px 16px' }}
                >
                  + Add First Habit
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: 'var(--space-6)' }}>
            {habits.map(habit => {
              const isCompleted = todayLogs[habit.id] === 'completed'
              return (
                <div
                  key={habit.id}
                  className="card fade-in-up"
                  style={{
                    border: `1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-default)'}`,
                    borderRadius: '20px',
                    boxShadow: isCompleted ? '0 4px 18px rgba(16, 185, 129, 0.08)' : '0 2px 10px rgba(0, 0, 0, 0.03)',
                    transition: 'all var(--transition-fast)',
                    background: 'var(--bg-surface)',
                  }}
                >
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                        {/* Circular Checkbox Toggle */}
                        <div
                          onClick={() => toggleHabit(habit.id)}
                          title={isCompleted ? 'Mark uncompleted' : 'Mark completed today'}
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: isCompleted ? 'linear-gradient(135deg, #10B981, #059669)' : 'var(--bg-subtle)',
                            color: '#FFFFFF',
                            border: `2px solid ${isCompleted ? '#10B981' : 'var(--border-default)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 16,
                            fontWeight: 900,
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: isCompleted ? '0 4px 14px rgba(16, 185, 129, 0.35)' : 'none',
                          }}
                        >
                          {isCompleted ? '✓' : ''}
                        </div>

                        {/* Title & Timing Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '14.5px',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            textDecoration: isCompleted ? 'line-through' : 'none',
                            opacity: isCompleted ? 0.7 : 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s ease',
                          }}>
                            {habit.title}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                            {habit.scheduledTime && (
                              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 2 }}>
                                ⏰ {habit.scheduledTime}
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                textTransform: 'capitalize',
                                padding: '1px 6px',
                                borderRadius: 6,
                                background: 'rgba(99, 102, 241, 0.08)',
                                color: 'var(--brand-primary, #6366F1)',
                              }}
                            >
                              {habit.frequency}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Actions: Streak & Options Menu */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
                        {/* Streak Badge */}
                        <div
                          title={`${habit.currentStreak} day streak`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            background: habit.currentStreak > 0 ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-subtle)',
                            padding: '3px 8px',
                            borderRadius: '999px',
                            border: `1px solid ${habit.currentStreak > 0 ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-subtle)'}`,
                          }}
                        >
                          <span style={{ fontSize: 13 }}>🔥</span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color: habit.currentStreak > 0 ? '#D97706' : 'var(--text-tertiary)',
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
                            borderRadius: '50%',
                            border: '1px solid var(--border-default)',
                            background: 'var(--bg-subtle)',
                            color: 'var(--text-primary)',
                            fontSize: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          ⋮
                        </button>

                        {/* Context Menu Dropdown */}
                        {activeMenuHabitId === habit.id && (
                          <div
                            className="card fade-in-up"
                            style={{
                              position: 'absolute',
                              top: 'calc(100% + 4px)',
                              right: 0,
                              zIndex: 100,
                              minWidth: 130,
                              padding: 4,
                              borderRadius: '12px',
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
                                padding: '7px 10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--text-primary)',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textAlign: 'left',
                                borderRadius: '8px',
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
                                padding: '7px 10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                border: 'none',
                                background: 'transparent',
                                color: '#EF4444',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textAlign: 'left',
                                borderRadius: '8px',
                              }}
                            >
                              <span>🗑️</span>
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 7-Day Matrix Dots (Past 7 Days) */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '12px',
                        paddingTop: '10px',
                        borderTop: '1px solid var(--border-subtle)',
                      }}
                    >
                      <span style={{ fontSize: '9.5px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Past 7 Days
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {last7Days.map((d, i) => {
                          const isToday = isSameDay(d, new Date())
                          const dStr = format(d, 'yyyy-MM-dd')
                          const isDone = habit.logs?.some(l => l.date === dStr && l.status === 'completed') || (isToday && isCompleted)
                          return (
                            <div
                              key={i}
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleHabit(habit.id, dStr)
                              }}
                              title={`${format(d, 'EEE, MMM d')}: ${isDone ? 'Completed (click to toggle)' : 'Not done (click to toggle)'}`}
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: isDone ? '#10B981' : 'var(--bg-muted)',
                                color: isDone ? '#FFFFFF' : 'var(--text-tertiary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '9.5px',
                                fontWeight: 800,
                                border: isToday ? '1.5px solid var(--brand-primary, #6366F1)' : '1px solid transparent',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                transform: isToday ? 'scale(1.06)' : 'scale(1)',
                              }}
                            >
                              {isDone ? '✓' : format(d, 'EEEEE')}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800 }}>
                Add Habit Routine
              </div>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                style={{ border: 'none', background: 'none', fontSize: 18, color: 'var(--text-tertiary)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div className="input-group">
                <label className="input-label">Habit Title</label>
                <input
                  className="input"
                  placeholder="e.g. Read 20 pages, Morning Workout, Meditate 10m..."
                  value={newHabit.title}
                  onChange={e => setNewHabit(p => ({ ...p, title: e.target.value }))}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddHabit()
                  }}
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
                        background: newHabit.frequency === f ? 'var(--brand-primary, #6366F1)' : 'var(--bg-muted)',
                        color: newHabit.frequency === f ? 'white' : 'var(--text-secondary)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
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

              <button
                className="btn btn-primary btn-full"
                onClick={handleAddHabit}
                disabled={!newHabit.title.trim()}
                style={{ marginTop: 4, padding: '11px', borderRadius: 12, fontWeight: 700 }}
              >
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
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800 }}>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div className="input-group">
                <label className="input-label">Habit Title</label>
                <input
                  className="input"
                  value={editingHabit.title || ''}
                  onChange={e => setEditingHabit((p: any) => ({ ...p, title: e.target.value }))}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveEditHabit()
                  }}
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
                        background: editingHabit.frequency === f ? 'var(--brand-primary, #6366F1)' : 'var(--bg-muted)',
                        color: editingHabit.frequency === f ? 'white' : 'var(--text-secondary)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
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

              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 6 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, borderRadius: 12 }}
                  onClick={() => setEditingHabit(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 2, borderRadius: 12, fontWeight: 700 }}
                  onClick={handleSaveEditHabit}
                  disabled={!editingHabit.title?.trim()}
                >
                  Save Changes
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
