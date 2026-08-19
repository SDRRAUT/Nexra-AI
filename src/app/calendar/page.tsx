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

interface Task {
  id: string
  title: string
  priority: string
  status: string
  scheduledStart?: string
  scheduledEnd?: string
  estimatedMinutes?: number
  category?: string
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
  critical: 'var(--priority-critical)',
  high: 'var(--priority-high)',
  medium: 'var(--priority-medium)',
  low: 'var(--priority-low)',
}

export default function CalendarPage() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [calendarMode, setCalendarMode] = useState<'week' | 'month'>('week')
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [newEvent, setNewEvent] = useState({
    title: '',
    type: 'class',
    startTime: '09:00',
    endTime: '10:30',
    location: '',
  })

  useEffect(() => {
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    Promise.all([
      fetch(`/api/events?startDate=${start.toISOString()}&endDate=${end.toISOString()}`).then(r => r.json()),
      fetch('/api/tasks').then(r => r.json()),
    ])
      .then(([ev, ta]) => {
        setEvents(Array.isArray(ev) ? ev : [])
        setTasks(Array.isArray(ta) ? ta : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [currentDate])

  // Month days
  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) })
  const firstDayOfWeek = startOfMonth(currentDate).getDay()
  const paddedMonthDays = [...Array(firstDayOfWeek).fill(null), ...daysInMonth]

  // Week strip (current selected date's week)
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const getItemsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const dayEvents = events.filter(e => format(new Date(e.startTime), 'yyyy-MM-dd') === dayStr)
    const dayTasks = tasks.filter(t => t.scheduledStart && format(new Date(t.scheduledStart), 'yyyy-MM-dd') === dayStr)
    return { dayEvents, dayTasks, total: dayEvents.length + dayTasks.length }
  }

  const selectedDayItems = getItemsForDay(selectedDate)
  const selectedDayEvents = selectedDayItems.dayEvents
  const selectedDayTasks = selectedDayItems.dayTasks

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

  const handleCreateEvent = async () => {
    if (!newEvent.title.trim()) return
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const startIso = new Date(`${dateStr}T${newEvent.startTime}:00`).toISOString()
    const endIso = new Date(`${dateStr}T${newEvent.endTime}:00`).toISOString()

    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newEvent.title,
        type: newEvent.type,
        startTime: startIso,
        endTime: endIso,
        location: newEvent.location,
      }),
    })

    setNewEvent({ title: '', type: 'class', startTime: '09:00', endTime: '10:30', location: '' })
    setShowAddEvent(false)

    // Refresh
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    const res = await fetch(`/api/events?startDate=${start.toISOString()}&endDate=${end.toISOString()}`)
    const json = await res.json()
    setEvents(json)
  }

  return (
    <div className="app-shell">
      <AppHeader />

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
                  {selectedDayItems.total === 0 ? 'No events scheduled' : `${selectedDayEvents.length} events · ${selectedDayTasks.length} tasks`}
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
                  onClick={() => setShowAddEvent(true)}
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
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)', fontWeight: 700 }}>
                {format(calendarMode === 'month' ? currentDate : selectedDate, 'MMMM yyyy')}
              </span>
              <button className="btn btn-secondary btn-sm" onClick={nextPeriod} style={{ width: 32, height: 32, padding: 0, fontSize: 16 }}>
                ›
              </button>
            </div>

            {/* Switch between Week and Month */}
            <div style={{ display: 'flex', background: 'var(--bg-muted)', borderRadius: 'var(--radius-full)', padding: '2px' }}>
              <button
                onClick={() => setCalendarMode('week')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: calendarMode === 'week' ? 'var(--bg-surface)' : 'transparent',
                  color: calendarMode === 'week' ? 'var(--brand-primary)' : 'var(--text-tertiary)',
                  boxShadow: calendarMode === 'week' ? 'var(--shadow-sm)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Week
              </button>
              <button
                onClick={() => setCalendarMode('month')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: calendarMode === 'month' ? 'var(--bg-surface)' : 'transparent',
                  color: calendarMode === 'month' ? 'var(--brand-primary)' : 'var(--text-tertiary)',
                  boxShadow: calendarMode === 'month' ? 'var(--shadow-sm)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Month
              </button>
            </div>
          </div>

          {/* ── WEEK STRIP VIEW ─────────────────────────── */}
          {calendarMode === 'week' ? (
            <div
              className="card fade-in-up"
              style={{
                padding: 'var(--space-3)',
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 4,
                marginBottom: 'var(--space-5)',
              }}
            >
              {weekDays.map((day, i) => {
                const isSel = isSameDay(day, selectedDate)
                const isTod = isToday(day)
                const { total } = getItemsForDay(day)
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '10px 4px',
                      borderRadius: 'var(--radius-lg)',
                      background: isSel
                        ? 'linear-gradient(135deg, var(--brand-primary), var(--brand-purple))'
                        : isTod
                        ? 'var(--bg-subtle)'
                        : 'transparent',
                      color: isSel ? 'white' : isTod ? 'var(--brand-primary)' : 'var(--text-primary)',
                      border: isTod && !isSel ? '1.5px solid var(--brand-primary)' : '1.5px solid transparent',
                      cursor: 'pointer',
                      transition: 'all var(--transition-spring)',
                      boxShadow: isSel ? '0 4px 14px rgba(91, 107, 240, 0.35)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '10px', fontWeight: 600, opacity: isSel ? 0.9 : 0.6 }}>
                      {format(day, 'EEE')}
                    </span>
                    <span style={{ fontSize: '16px', fontWeight: 800, marginTop: 2 }}>
                      {format(day, 'd')}
                    </span>
                    {total > 0 && (
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: isSel ? 'white' : 'var(--brand-accent)',
                          marginTop: 4,
                        }}
                      />
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
                  const { total } = getItemsForDay(day)
                  const isSel = isSameDay(day, selectedDate)
                  const isTod = isToday(day)
                  const isCurr = isSameMonth(day, currentDate)
                  return (
                    <div
                      key={i}
                      className={`calendar-day ${isTod ? 'today' : ''} ${isSel && !isTod ? 'selected' : ''} ${!isCurr ? 'other-month' : ''}`}
                      onClick={() => setSelectedDate(day)}
                      style={{ height: 42, borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                    >
                      <span className="calendar-day-num" style={{ fontSize: '12px' }}>{format(day, 'd')}</span>
                      {total > 0 && (
                        <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? 'white' : 'var(--brand-primary)' }} />
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
                {isToday(selectedDate) ? "Today's Agenda" : format(selectedDate, "EEE, MMM d") + ' Agenda'}
              </div>
              <span
                className="section-action"
                onClick={() => router.push('/chat')}
              >
                Plan with Srushti ✨
              </span>
            </div>

            {selectedDayEvents.length === 0 && selectedDayTasks.length === 0 ? (
              <div className="card fade-in-up">
                <div style={{ padding: 'var(--space-8) var(--space-4)', textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 'var(--space-2)' }}>🌱</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                    No commitments scheduled
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', maxWidth: 260, margin: '6px auto 16px' }}>
                    Tap + Add above or ask Srushti to block study and focus sessions for this day.
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => router.push('/chat')}
                  >
                    Auto-Plan with Srushti
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {/* Events list */}
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
                    </div>
                  </div>
                ))}

                {/* Scheduled Tasks for this day */}
                {selectedDayTasks.map(task => (
                  <div
                    key={task.id}
                    className="card fade-in-up"
                    style={{
                      borderLeft: `4px solid ${priorityColors[task.priority] || 'var(--brand-primary)'}`,
                      opacity: task.status === 'completed' ? 0.75 : 1,
                    }}
                  >
                    <div style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 'var(--radius-md)',
                          background: priorityColors[task.priority] || 'var(--brand-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                          color: 'white',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        ✓
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 'var(--text-base)',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                        }}>
                          {task.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 2 }}>
                          {task.scheduledStart && (
                            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              ⏰ {format(new Date(task.scheduledStart), 'h:mm a')}
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
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── ADD EVENT SHEET ─────────────────────────── */}
      {showAddEvent && (
        <>
          <div className="sheet-overlay" onClick={() => setShowAddEvent(false)} />
          <div className="bottom-sheet">
            <div className="sheet-handle" />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
              Add Schedule Event
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="input-group">
                <label className="input-label">Event Title</label>
                <input
                  className="input"
                  placeholder="e.g. CAO Lecture, Lab Session, Study..."
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
                Save to Calendar
              </button>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  )
}
