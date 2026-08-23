'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  isToday,
  isSameDay,
  addDays,
  subDays,
} from 'date-fns'

import {
  getClientEvents,
  getClientTasks,
  getClientGoals,
  getClientHabits,
  getClientHabitLogs,
  createClientEvent,
  createClientTask,
  deleteClientEvent,
  toggleClientTask,
  toggleClientHabit,
} from '@/lib/data/clientData'
import type { LocalHabitLog } from '@/lib/db/localDb'

interface Task {
  id: string
  title: string
  priority: string
  status: string
  scheduledStart?: string
  scheduledEnd?: string
  deadline?: string
  estimatedMinutes?: number
  category?: string
  completedAt?: string
  createdAt?: string
}

interface Event {
  id: string
  title: string
  startTime: string
  endTime: string
  type: string
  color?: string
  location?: string
  description?: string
}

interface Goal {
  id: string
  title: string
  category?: string
  priority: string
  progress: number
  targetDate?: string
  status: string
}

interface Habit {
  id: string
  title: string
  frequency: string
  scheduledTime?: string
  currentStreak: number
  longestStreak: number
  category?: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const typeGradients: Record<string, string> = {
  exam: 'linear-gradient(135deg, #EF4444, #DC2626)',
  class: 'linear-gradient(135deg, #6366F1, #4F46E5)',
  meeting: 'linear-gradient(135deg, #F59E0B, #D97706)',
  study: 'linear-gradient(135deg, #10B981, #059669)',
  personal: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
  event: 'linear-gradient(135deg, #0284C7, #0369A1)',
}

const typeIcons: Record<string, string> = {
  exam: '📝',
  class: '🎓',
  meeting: '👥',
  study: '📚',
  personal: '✨',
  event: '📅',
}

const priorityColors: Record<string, string> = {
  critical: 'var(--priority-critical, #EF4444)',
  high: 'var(--priority-high, #F97316)',
  medium: 'var(--priority-medium, #3B82F6)',
  low: 'var(--priority-low, #10B981)',
}

export default function CalendarPage() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [habitLogs, setHabitLogs] = useState<LocalHabitLog[]>([])
  const [loading, setLoading] = useState(true)
  const [calendarMode, setCalendarMode] = useState<'week' | 'month'>('week')
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [addMode, setAddMode] = useState<'event' | 'task'>('event')

  const [newEvent, setNewEvent] = useState({
    title: '',
    type: 'study',
    startTime: '09:00',
    endTime: '10:30',
    location: '',
  })

  const [newTask, setNewTask] = useState({
    title: '',
    priority: 'medium',
    category: 'study',
    time: '14:00',
    estimatedMinutes: 45,
  })

  const loadAllCalendarData = async () => {
    try {
      const [ev, ta, go, ha, hl] = await Promise.all([
        getClientEvents(),
        getClientTasks(),
        getClientGoals(),
        getClientHabits(),
        getClientHabitLogs(),
      ])

      if (ev) setEvents(ev as any)
      if (ta) setTasks(ta as any)
      if (go) setGoals(go as any)
      if (ha) setHabits(ha as any)
      if (hl) setHabitLogs(hl)
    } catch (e) {
      console.error('Error loading calendar data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllCalendarData()

    const handleDataChanged = () => {
      loadAllCalendarData()
    }
    window.addEventListener('srushti_data_changed', handleDataChanged)
    return () => window.removeEventListener('srushti_data_changed', handleDataChanged)
  }, [currentDate])

  // Month days
  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) })
  const firstDayOfWeek = startOfMonth(currentDate).getDay()
  const paddedMonthDays = [...Array(firstDayOfWeek).fill(null), ...daysInMonth]

  // Week strip (current selected date's week)
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Smart multi-source resolver for any given day
  const getItemsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd')

    const dayEvents = events.filter(e => {
      if (!e.startTime) return false
      try {
        return format(new Date(e.startTime), 'yyyy-MM-dd') === dayStr
      } catch {
        return false
      }
    })

    const dayTasks = tasks.filter(t => {
      try {
        const startStr = t.scheduledStart ? format(new Date(t.scheduledStart), 'yyyy-MM-dd') : null
        const deadStr = t.deadline ? format(new Date(t.deadline), 'yyyy-MM-dd') : null
        const compStr = t.completedAt ? format(new Date(t.completedAt), 'yyyy-MM-dd') : null
        const createdStr = t.createdAt ? format(new Date(t.createdAt), 'yyyy-MM-dd') : null

        // Completed on this date
        if (compStr === dayStr) return true
        // Scheduled or due on this date
        if (startStr === dayStr || deadStr === dayStr) return true
        // Created on this date and not explicitly scheduled for another future date
        if (!startStr && !deadStr && !compStr && createdStr === dayStr) return true

        return false
      } catch {
        return false
      }
    })

    const dayGoals = goals.filter(g => {
      if (!g.targetDate) return false
      try {
        return format(new Date(g.targetDate), 'yyyy-MM-dd') === dayStr
      } catch {
        return false
      }
    })

    const dayHabits = habits

    return {
      dayEvents,
      dayTasks,
      dayGoals,
      dayHabits,
      total: dayEvents.length + dayTasks.length + dayGoals.length,
    }
  }

  const selectedDayItems = getItemsForDay(selectedDate)
  const selectedDayEvents = selectedDayItems.dayEvents
  const selectedDayTasks = selectedDayItems.dayTasks
  const selectedDayGoals = selectedDayItems.dayGoals
  const selectedDayHabits = selectedDayItems.dayHabits
  const selectedDayStr = format(selectedDate, 'yyyy-MM-dd')

  const prevPeriod = () => {
    if (calendarMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    } else {
      const prevWeekDay = subDays(selectedDate, 7)
      setSelectedDate(prevWeekDay)
      setCurrentDate(prevWeekDay)
    }
  }

  const nextPeriod = () => {
    if (calendarMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    } else {
      const nextWeekDay = addDays(selectedDate, 7)
      setSelectedDate(nextWeekDay)
      setCurrentDate(nextWeekDay)
    }
  }

  const handleToggleTask = async (task: Task) => {
    const isNowCompleted = task.status !== 'completed'
    await toggleClientTask(task.id, isNowCompleted).catch(() => {})
    loadAllCalendarData()
  }

  const handleToggleHabit = async (habitId: string, isCurrentlyDone: boolean) => {
    await toggleClientHabit(habitId, !isCurrentlyDone, selectedDayStr).catch(() => {})
    loadAllCalendarData()
  }

  const handleDeleteEvent = async (id: string, title: string) => {
    if (confirm(`Delete event "${title}"?`)) {
      await deleteClientEvent(id).catch(() => {})
      loadAllCalendarData()
    }
  }

  const handleCreateEvent = async () => {
    if (!newEvent.title.trim()) return
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const startIso = new Date(`${dateStr}T${newEvent.startTime}:00`).toISOString()
    const endIso = new Date(`${dateStr}T${newEvent.endTime}:00`).toISOString()

    await createClientEvent({
      title: newEvent.title,
      type: newEvent.type,
      startTime: startIso,
      endTime: endIso,
      location: newEvent.location,
    }).catch(() => {})

    setNewEvent({ title: '', type: 'study', startTime: '09:00', endTime: '10:30', location: '' })
    setShowAddSheet(false)
    loadAllCalendarData()
  }

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const scheduledStart = new Date(`${dateStr}T${newTask.time}:00`).toISOString()

    await createClientTask({
      title: newTask.title,
      priority: newTask.priority,
      category: newTask.category,
      estimatedMinutes: newTask.estimatedMinutes,
      scheduledStart,
      status: 'planned',
    }).catch(() => {})

    setNewTask({ title: '', priority: 'medium', category: 'study', time: '14:00', estimatedMinutes: 45 })
    setShowAddSheet(false)
    loadAllCalendarData()
  }

  return (
    <div className="app-shell">
      <AppHeader title="Calendar" subtitle="Schedule & Commitments" showBrand={false} showBack={false} />

      <div className="page-content">
        <div className="page-section" style={{ marginTop: 'var(--space-4)' }}>

          {/* ── TOP HERO CALENDAR BANNER ─────────────────────────── */}
          <div
            className="card fade-in-up"
            style={{
              padding: 'var(--space-4) var(--space-5)',
              background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-subtle))',
              border: '1px solid var(--border-default)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  {isToday(selectedDate) ? '• TODAY' : format(selectedDate, 'EEEE')}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {format(selectedDate, 'MMMM d, yyyy')}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {selectedDayItems.total === 0
                    ? 'No commitments scheduled'
                    : `${selectedDayEvents.length} events · ${selectedDayTasks.length} tasks · ${selectedDayGoals.length} goals`}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const today = new Date()
                    setSelectedDate(today)
                    setCurrentDate(today)
                  }}
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                >
                  Today
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowAddSheet(true)}
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                >
                  + Add
                </button>
              </div>
            </div>
          </div>

          {/* ── MODE & NAVIGATION SELECTOR ─────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <button className="btn btn-secondary btn-sm" onClick={prevPeriod} style={{ width: 32, height: 32, padding: 0, fontSize: 16 }}>
                ‹
              </button>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                {format(calendarMode === 'month' ? currentDate : selectedDate, 'MMMM yyyy')}
              </div>
              <button className="btn btn-secondary btn-sm" onClick={nextPeriod} style={{ width: 32, height: 32, padding: 0, fontSize: 16 }}>
                ›
              </button>
            </div>

            {/* Toggle Week vs Month */}
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-muted)',
                borderRadius: 'var(--radius-md)',
                padding: 2,
              }}
            >
              <button
                onClick={() => setCalendarMode('week')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  fontWeight: 700,
                  border: 'none',
                  background: calendarMode === 'week' ? 'var(--brand-primary)' : 'transparent',
                  color: calendarMode === 'week' ? 'white' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Week
              </button>
              <button
                onClick={() => setCalendarMode('month')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  fontWeight: 700,
                  border: 'none',
                  background: calendarMode === 'month' ? 'var(--brand-primary)' : 'transparent',
                  color: calendarMode === 'month' ? 'white' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Month
              </button>
            </div>
          </div>

          {/* ── WEEK VIEW HORIZONTAL STRIP ─────────────────────────── */}
          {calendarMode === 'week' ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 'var(--space-1)',
                marginBottom: 'var(--space-5)',
              }}
            >
              {weekDays.map((day, idx) => {
                const isSel = isSameDay(day, selectedDate)
                const isTod = isToday(day)
                const { total, dayTasks, dayEvents, dayGoals } = getItemsForDay(day)
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(day)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '8px 2px',
                      borderRadius: 'var(--radius-lg)',
                      border: isSel
                        ? '2px solid var(--brand-primary)'
                        : isTod
                        ? '1.5px dashed var(--brand-primary)'
                        : '1px solid var(--border-subtle)',
                      background: isSel
                        ? 'linear-gradient(135deg, var(--brand-primary), var(--brand-purple))'
                        : isTod
                        ? 'var(--bg-subtle)'
                        : 'var(--bg-surface)',
                      color: isSel ? 'white' : 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <span style={{ fontSize: '10px', fontWeight: 600, opacity: isSel ? 0.9 : 0.6, textTransform: 'uppercase' }}>
                      {format(day, 'EEE')}
                    </span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 800, margin: '2px 0' }}>
                      {format(day, 'd')}
                    </span>
                    {total > 0 && (
                      <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                        {dayEvents.length > 0 && (
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? '#93C5FD' : '#3B82F6' }} />
                        )}
                        {dayTasks.length > 0 && (
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? '#FDE68A' : '#F59E0B' }} />
                        )}
                        {dayGoals.length > 0 && (
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? '#FCA5A5' : '#EF4444' }} />
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            /* ── FULL MONTH GRID VIEW ─────────────────────────── */
            <div className="card fade-in-up" style={{ padding: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
              <div className="calendar-grid" style={{ marginBottom: 6 }}>
                {DAYS.map(d => (
                  <div key={d} className="calendar-day-header" style={{ fontSize: '11px', fontWeight: 700 }}>
                    {d}
                  </div>
                ))}
              </div>
              <div className="calendar-grid">
                {paddedMonthDays.map((day, i) => {
                  if (!day) return <div key={i} />
                  const { total, dayTasks, dayEvents, dayGoals } = getItemsForDay(day)
                  const isSel = isSameDay(day, selectedDate)
                  const isTod = isToday(day)
                  const isCurr = isSameMonth(day, currentDate)
                  return (
                    <div
                      key={i}
                      className={`calendar-day ${isTod ? 'today' : ''} ${isSel && !isTod ? 'selected' : ''} ${!isCurr ? 'other-month' : ''}`}
                      onClick={() => setSelectedDate(day)}
                      style={{ height: 44, borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                    >
                      <span className="calendar-day-num" style={{ fontSize: '12px' }}>{format(day, 'd')}</span>
                      {total > 0 && (
                        <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                          {dayEvents.length > 0 && (
                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? 'white' : '#3B82F6' }} />
                          )}
                          {dayTasks.length > 0 && (
                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? 'white' : '#F59E0B' }} />
                          )}
                          {dayGoals.length > 0 && (
                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? 'white' : '#EF4444' }} />
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── DAY SCHEDULE AGENDA ─────────────────────────── */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div className="section-header">
              <div className="section-title">
                {isToday(selectedDate) ? "Today's Schedule & Tasks" : format(selectedDate, "EEE, MMM d") + ' Schedule'}
              </div>
              <span
                className="section-action"
                onClick={() => router.push('/chat')}
              >
                Plan with AI ✨
              </span>
            </div>

            {selectedDayEvents.length === 0 && selectedDayTasks.length === 0 && selectedDayGoals.length === 0 ? (
              <div className="card fade-in-up">
                <div style={{ padding: 'var(--space-8) var(--space-4)', textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 'var(--space-2)' }}>🌱</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                    No events or tasks scheduled
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', maxWidth: 280, margin: '6px auto 16px' }}>
                    Tap + Add above to schedule a task or event, or ask AI in Chat to organize your day.
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowAddSheet(true)}
                    >
                      + Add Item
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => router.push('/chat')}
                    >
                      Auto-Plan in Chat
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>

                {/* 1. Goal Deadlines on this day */}
                {selectedDayGoals.map(goal => (
                  <div
                    key={goal.id}
                    className="card fade-in-up"
                    style={{
                      borderLeft: '4px solid #EF4444',
                      background: 'linear-gradient(90deg, rgba(239,68,68,0.08), var(--bg-surface))',
                    }}
                  >
                    <div style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 'var(--radius-md)',
                          background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                          color: 'white',
                          flexShrink: 0,
                        }}
                      >
                        🎯
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {goal.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 2 }}>
                          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: '#EF4444' }}>
                            🎯 Goal Target Date Due Today
                          </span>
                          <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                            {goal.category || 'Goal'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 2. Events list */}
                {selectedDayEvents.map(event => (
                  <div
                    key={event.id}
                    className="card fade-in-up"
                    style={{
                      borderLeft: `4px solid ${event.color || '#6366F1'}`,
                      position: 'relative',
                    }}
                  >
                    <div style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 'var(--radius-md)',
                          background: typeGradients[event.type] || typeGradients.event,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                          color: 'white',
                          flexShrink: 0,
                        }}
                      >
                        {typeIcons[event.type] || '📅'}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {event.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 2 }}>
                          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--brand-primary)' }}>
                            {format(new Date(event.startTime), 'h:mm a')} – {format(new Date(event.endTime), 'h:mm a')}
                          </span>
                          <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                            {event.type}
                          </span>
                          {event.location && (
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                              📍 {event.location}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => handleDeleteEvent(event.id, event.title)}
                          style={{ border: 'none', background: 'transparent', color: 'var(--text-tertiary)', fontSize: 18, cursor: 'pointer', padding: 4 }}
                          title="Delete event"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 3. Scheduled Tasks & Reminders for this day */}
                {selectedDayTasks.map(task => {
                  const isDone = task.status === 'completed'
                  return (
                    <div
                      key={task.id}
                      className="card fade-in-up"
                      style={{
                        borderLeft: `4px solid ${priorityColors[task.priority] || 'var(--brand-primary)'}`,
                        opacity: isDone ? 0.75 : 1,
                      }}
                    >
                      <div style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleTask(task)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--radius-full)',
                            background: isDone ? 'var(--brand-accent, #10B981)' : 'var(--bg-subtle)',
                            border: `2px solid ${isDone ? 'var(--brand-accent, #10B981)' : 'var(--border-default)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            color: 'white',
                            fontWeight: 800,
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                          title={isDone ? 'Mark as planned' : 'Mark as completed'}
                        >
                          {isDone ? '✓' : ''}
                        </button>

                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 'var(--text-base)',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            textDecoration: isDone ? 'line-through' : 'none',
                          }}>
                            {task.title}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 2, flexWrap: 'wrap' }}>
                            {isDone && task.completedAt && (
                              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brand-accent, #10B981)' }}>
                                ✓ Completed {format(new Date(task.completedAt), 'h:mm a')}
                              </span>
                            )}
                            {task.scheduledStart && (
                              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                ⏰ {format(new Date(task.scheduledStart), 'h:mm a')}
                              </span>
                            )}
                            {task.deadline && (
                              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--priority-high)' }}>
                                Due {format(new Date(task.deadline), 'h:mm a')}
                              </span>
                            )}
                            {task.estimatedMinutes && (
                              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                                {task.estimatedMinutes}m
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                color: priorityColors[task.priority],
                              }}
                            >
                              {task.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* 4. Habits daily row with 1-tap toggle for this day */}
            {selectedDayHabits.length > 0 && (
              <div style={{ marginTop: 'var(--space-5)' }}>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
                  Daily Habits ({selectedDayHabits.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedDayHabits.map(habit => {
                    const isHabitDone = habitLogs.some(
                      l => l.habitId === habit.id && l.date === selectedDayStr && l.status === 'completed'
                    )

                    return (
                      <div
                        key={habit.id}
                        className="card"
                        style={{
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderLeft: `3px solid ${isHabitDone ? 'var(--brand-accent, #10B981)' : 'var(--border-default)'}`,
                          background: isHabitDone ? 'linear-gradient(90deg, rgba(16,185,129,0.06), var(--bg-surface))' : 'var(--bg-surface)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <button
                            type="button"
                            onClick={() => handleToggleHabit(habit.id, isHabitDone)}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 'var(--radius-full)',
                              background: isHabitDone ? 'var(--brand-accent, #10B981)' : 'transparent',
                              border: `2px solid ${isHabitDone ? 'var(--brand-accent, #10B981)' : 'var(--border-strong)'}`,
                              color: 'white',
                              fontSize: 13,
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                            title={isHabitDone ? 'Mark undone for this date' : 'Mark done for this date'}
                          >
                            {isHabitDone ? '✓' : ''}
                          </button>

                          <div>
                            <div style={{
                              fontSize: 'var(--text-sm)',
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              textDecoration: isHabitDone ? 'line-through' : 'none',
                            }}>
                              {habit.title}
                            </div>
                            {habit.scheduledTime && (
                              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                ⏰ {habit.scheduledTime}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-warm)' }}>
                            🔥 {habit.currentStreak}d
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── ADD EVENT / TASK SHEET ─────────────────────────── */}
      {showAddSheet && (
        <>
          <div className="sheet-overlay" onClick={() => setShowAddSheet(false)} />
          <div className="bottom-sheet">
            <div className="sheet-handle" />

            {/* Type selector tabs: Event vs Task */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-4)', background: 'var(--bg-muted)', padding: 4, borderRadius: 'var(--radius-lg)' }}>
              <button
                type="button"
                onClick={() => setAddMode('event')}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: addMode === 'event' ? 'var(--brand-primary)' : 'transparent',
                  color: addMode === 'event' ? 'white' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                }}
              >
                📅 Add Event
              </button>
              <button
                type="button"
                onClick={() => setAddMode('task')}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: addMode === 'task' ? 'var(--brand-primary)' : 'transparent',
                  color: addMode === 'task' ? 'white' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                }}
              >
                📋 Add Task
              </button>
            </div>

            {addMode === 'event' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="input-group">
                  <label className="input-label">Event Title</label>
                  <input
                    className="input"
                    placeholder="e.g. CAO Lecture, Lab Session, Study Block..."
                    value={newEvent.title}
                    onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
                    autoFocus
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Category</label>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    {['class', 'exam', 'meeting', 'study', 'personal'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNewEvent(p => ({ ...p, type: t }))}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          background: newEvent.type === t ? 'var(--brand-primary)' : 'var(--bg-muted)',
                          color: newEvent.type === t ? 'white' : 'var(--text-secondary)',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {typeIcons[t]} {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label className="input-label">Start Time</label>
                    <input
                      type="time"
                      className="input"
                      value={newEvent.startTime}
                      onChange={e => setNewEvent(p => ({ ...p, startTime: e.target.value }))}
                    />
                  </div>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label className="input-label">End Time</label>
                    <input
                      type="time"
                      className="input"
                      value={newEvent.endTime}
                      onChange={e => setNewEvent(p => ({ ...p, endTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Location (optional)</label>
                  <input
                    className="input"
                    placeholder="Room 304, Library, Google Meet..."
                    value={newEvent.location}
                    onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))}
                  />
                </div>

                <button className="btn btn-primary btn-full" onClick={handleCreateEvent}>
                  Save Event to Calendar
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="input-group">
                  <label className="input-label">Task Title</label>
                  <input
                    className="input"
                    placeholder="e.g. Complete math exercises, review flashcards..."
                    value={newTask.title}
                    onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                    autoFocus
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Priority</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['low', 'medium', 'high', 'critical'].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewTask(prev => ({ ...prev, priority: p }))}
                        style={{
                          flex: 1,
                          padding: '6px 0',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          border: 'none',
                          background: newTask.priority === p ? priorityColors[p] : 'var(--bg-muted)',
                          color: newTask.priority === p ? 'white' : 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label className="input-label">Scheduled Time</label>
                    <input
                      type="time"
                      className="input"
                      value={newTask.time}
                      onChange={e => setNewTask(p => ({ ...p, time: e.target.value }))}
                    />
                  </div>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label className="input-label">Estimated Minutes</label>
                    <input
                      type="number"
                      className="input"
                      value={newTask.estimatedMinutes}
                      onChange={e => setNewTask(p => ({ ...p, estimatedMinutes: Number(e.target.value) || 30 }))}
                    />
                  </div>
                </div>

                <button className="btn btn-primary btn-full" onClick={handleCreateTask}>
                  Save Task to Calendar
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <BottomNav />
    </div>
  )
}
