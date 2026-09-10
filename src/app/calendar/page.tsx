'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import ScheduleOptimizerModal from '@/components/calendar/ScheduleOptimizerModal'

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

const CalendarIconSvg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const ClockIconSvg = ({ color = 'currentColor' }: { color?: string }) => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2.4}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'inline-block', verticalAlign: '-1px', marginRight: 5, flexShrink: 0 }}
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

/* Head profile with brain illustration (Deep work) */
const HeadBrainGraphic = () => (
  <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
    {/* Head Outline */}
    <path
      d="M32 10C21 10 14 17 14 26C14 32.5 17.5 37 20 40V52C20 54.2 21.8 56 24 56H38C40.2 56 42 54.2 42 52V47H44C46.2 47 48 45.2 48 43V38.5C51.5 38.5 54 35.8 54 32.5C54 30.2 52.8 28.2 51 27.2V24C51 15 42.5 10 32 10Z"
      stroke="#0284C7"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Brain Convolutions inside */}
    <path
      d="M28 20C25 20 22 22 22 25C22 27.5 24 29 26.5 29.5C28.5 30 30 32 30 34"
      stroke="#0284C7"
      strokeWidth="2.8"
      strokeLinecap="round"
    />
    <path
      d="M35 18C39 18 42 20.5 42 24C42 26.5 40.5 28 38.5 29C36 30 36 32.5 37.5 34"
      stroke="#0284C7"
      strokeWidth="2.8"
      strokeLinecap="round"
    />
    <path
      d="M29 25C31 25 33 27 33 29"
      stroke="#0284C7"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
)

/* Dog silhouette illustration (Walk the dog) */
const DogGraphic = () => (
  <svg width="50" height="42" viewBox="0 0 100 84" fill="#F97316">
    {/* Tail */}
    <path d="M12 36 C 8 26, 16 14, 26 18 C 22 24, 20 30, 22 38 Z" />
    {/* Back & Torso */}
    <path d="M22 38 C 26 34, 38 34, 52 35 C 58 35, 62 30, 68 22 C 72 16, 78 16, 82 22 C 84 25, 88 28, 92 28 C 95 28, 96 32, 94 35 C 91 38, 86 40, 82 42 C 80 48, 76 52, 70 54 C 64 56, 55 56, 44 56 C 34 56, 26 52, 22 46 Z" />
    {/* Back Legs */}
    <path d="M22 46 C 24 54, 24 64, 22 74 C 21 77, 26 78, 29 78 C 31 78, 32 75, 31 71 C 33 63, 35 55, 37 49 Z" />
    <path d="M32 48 C 34 56, 36 64, 34 72 C 34 75, 38 76, 41 76 C 43 76, 43 73, 42 70 C 42 62, 41 55, 40 49 Z" opacity="0.85" />
    {/* Front Legs */}
    <path d="M62 52 C 63 60, 63 68, 62 76 C 62 79, 67 80, 70 80 C 72 80, 72 77, 71 73 C 71 65, 70 58, 68 52 Z" />
    <path d="M72 50 C 74 58, 75 66, 74 74 C 74 77, 78 78, 81 78 C 83 78, 83 75, 82 72 C 81 64, 79 57, 77 50 Z" opacity="0.85" />
    {/* Ear */}
    <path d="M72 20 C 70 24, 71 30, 74 34 C 76 34, 77 31, 76 26 Z" fill="#EA580C" />
  </svg>
)

/* Web Conference group illustration */
const ConferenceGraphic = () => (
  <svg width="50" height="42" viewBox="0 0 64 48" fill="#2563EB">
    {/* Center figure */}
    <circle cx="32" cy="14" r="7" />
    <path d="M19 40c0-7 5.8-12 13-12s13 5 13 12v2H19v-2z" />
    {/* Left figure */}
    <circle cx="14" cy="18" r="5.5" opacity="0.9" />
    <path d="M4 39c0-5.5 4.5-9.5 10-9.5 2 0 3.8.5 5.2 1.5-1.2 2-2 4.4-2 7.5v2.5H4V39z" opacity="0.9" />
    {/* Right figure */}
    <circle cx="50" cy="18" r="5.5" opacity="0.9" />
    <path d="M60 39c0-5.5-4.5-9.5-10-9.5-2 0-3.8.5-5.2 1.5 1.2 2 2 4.4 2 7.5v2.5h13.2V39z" opacity="0.9" />
  </svg>
)

/* Stretching runner/athlete illustration */
const StretchingGraphic = () => (
  <svg width="48" height="44" viewBox="0 0 60 52" fill="#F43F5E">
    {/* Head */}
    <circle cx="43" cy="11" r="5" />
    {/* Body & Front Bent Leg in lunge stretch */}
    <path d="M38 18c-2 1-4.2 1.5-6.5 1.5-4 0-7.2-1.5-9.8-4l-3.5 3.5c3.3 3.3 7.8 5.5 13.3 5.5 2.2 0 4.5-.4 6.5-1.2l-2.5 8.2-15 2c-1.4.2-2.5 1.4-2.4 2.8.2 1.4 1.4 2.5 2.8 2.4l17-2.2 4 11c.5 1.3 1.9 2 3.2 1.5 1.3-.5 2-1.9 1.5-3.2l-5-13.8 4.8-16c.4-1.4-.4-2.8-1.9-3.3l-6.5-2z" />
    {/* Back Leg Extended in Lunge */}
    <path d="M21 24l-11 9.5c-1 .9-1.1 2.4-.2 3.4.9 1 2.4 1.1 3.4.2l10-8.8-2.2-4.3z" />
  </svg>
)

const MonthViewIconSvg = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const WeekViewIconSvg = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
  </svg>
)

const PlusIconSvg = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const CalendarEmptySvg = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" strokeWidth={2.6} strokeLinecap="round" />
  </svg>
)

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
  const [showOptimizerModal, setShowOptimizerModal] = useState(false)

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

  // Week strip (current selected date's week, starts on Monday)
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
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

  // Map real user items into modern pastel activity cards
  const userActivities = [
    ...selectedDayTasks.map((task, idx) => {
      const isDone = task.status === 'completed'
      const titleLower = task.title.toLowerCase()
      const isDeep = titleLower.includes('deep') || titleLower.includes('focus') || titleLower.includes('study') || titleLower.includes('code')
      const isWalk = titleLower.includes('walk') || titleLower.includes('dog') || titleLower.includes('errand') || titleLower.includes('break')
      const isConf = titleLower.includes('meet') || titleLower.includes('conference') || titleLower.includes('call') || titleLower.includes('class')
      const isStretch = titleLower.includes('stretch') || titleLower.includes('workout') || titleLower.includes('gym') || titleLower.includes('yoga')

      let theme = 'activity-card-deepwork'
      let graphic = <HeadBrainGraphic />
      if (isWalk) { theme = 'activity-card-walk'; graphic = <DogGraphic /> }
      else if (isConf) { theme = 'activity-card-conference'; graphic = <ConferenceGraphic /> }
      else if (isStretch) { theme = 'activity-card-stretching'; graphic = <StretchingGraphic /> }

      const timeStr = task.scheduledStart 
        ? format(new Date(task.scheduledStart), 'HH:mm') + (task.estimatedMinutes ? ` · ${task.estimatedMinutes}m` : '') 
        : task.deadline 
        ? `Due ${format(new Date(task.deadline), 'HH:mm')}`
        : `${task.estimatedMinutes || 30} min remaining`

      const timeLabel = task.scheduledStart 
        ? format(new Date(task.scheduledStart), 'HH:mm')
        : task.deadline 
        ? format(new Date(task.deadline), 'HH:mm')
        : '08:00'

      return {
        id: task.id,
        title: task.title,
        subtitle: isDone ? 'Completed' : timeStr,
        timeLabel,
        theme,
        graphic,
        isNow: !isDone && idx === 0,
        isDone,
        subtitleClass: isDeep ? 'accent-blue' : '',
        onToggle: () => handleToggleTask(task),
      }
    }),
    ...selectedDayEvents.map((event, idx) => {
      const titleLower = event.title.toLowerCase()
      const isWalk = titleLower.includes('walk') || titleLower.includes('dog')
      const isConf = titleLower.includes('conference') || titleLower.includes('meet') || event.type === 'meeting'
      const isStretch = titleLower.includes('stretch') || titleLower.includes('gym')

      let theme = 'activity-card-conference'
      let graphic = <ConferenceGraphic />
      if (isWalk) { theme = 'activity-card-walk'; graphic = <DogGraphic /> }
      else if (isStretch) { theme = 'activity-card-stretching'; graphic = <StretchingGraphic /> }
      else if (event.type === 'study') { theme = 'activity-card-deepwork'; graphic = <HeadBrainGraphic /> }

      const timeStr = `${format(new Date(event.startTime), 'HH:mm')} - ${format(new Date(event.endTime), 'HH:mm')}`
      const timeLabel = format(new Date(event.startTime), 'HH:mm')

      return {
        id: event.id,
        title: event.title,
        subtitle: timeStr + (event.location ? ` · 📍 ${event.location}` : ''),
        timeLabel,
        theme,
        graphic,
        isNow: idx === 0 && selectedDayTasks.length === 0,
        isDone: false,
        subtitleClass: '',
        onToggle: () => handleDeleteEvent(event.id, event.title),
      }
    }),
  ]

  const displayedActivities = userActivities
  const completedActivitiesCount = displayedActivities.filter(a => a.isDone).length
  const totalActivitiesCount = displayedActivities.length

  return (
    <div className="app-shell modern-cal-page">
      {/* ── BEAUTIFUL MODERN CALENDAR HEADER ── */}
      <div className="modern-cal-header">
        <h1 className="modern-cal-title">Calendar</h1>

        <div className="cal-header-actions">
          {!isToday(selectedDate) && (
            <button
              className="cal-today-pill-btn"
              onClick={() => {
                const now = new Date()
                setSelectedDate(now)
                setCurrentDate(now)
              }}
              title="Jump to today"
              id="cal-jump-today-btn"
            >
              Today
            </button>
          )}

          <button
            className={`modern-cal-toggle-btn ${calendarMode === 'month' ? 'active' : ''}`}
            onClick={() => setCalendarMode(m => m === 'week' ? 'month' : 'week')}
            title={calendarMode === 'week' ? 'Switch to Full Month View' : 'Switch to Week View'}
            id="cal-toggle-mode-btn"
          >
            {calendarMode === 'week' ? <MonthViewIconSvg /> : <WeekViewIconSvg />}
          </button>

          <button
            className="cal-header-add-btn"
            onClick={() => setShowAddSheet(true)}
            title="Add Task or Event"
            id="cal-header-add-btn"
          >
            <PlusIconSvg />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* ── SUB-HEADER: WEEK OF [DATE] WITH NAVIGATION ── */}
      <div className="modern-cal-week-label">
        <button className="modern-cal-nav-arrow" onClick={prevPeriod} title="Previous period" aria-label="Previous">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="cal-week-label-text">
          {calendarMode === 'week' ? `Week of ${format(weekStart, 'MMMM d')}` : format(currentDate, 'MMMM yyyy')}
        </span>
        <button className="modern-cal-nav-arrow" onClick={nextPeriod} title="Next period" aria-label="Next">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* ── 7-DAY HORIZONTAL WEEK STRIP (WEEK VIEW) ── */}
      {calendarMode === 'week' ? (
        <div className="modern-cal-strip">
          {weekDays.map((day, idx) => {
            const isSel = isSameDay(day, selectedDate)
            const dayOfWeek = day.getDay()
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
            return (
              <div
                key={idx}
                className={`modern-day-pill ${isSel ? 'active' : ''}`}
                onClick={() => setSelectedDate(day)}
                id={`cal-day-pill-${idx}`}
              >
                <span className={`modern-day-tag ${isWeekend ? 'weekend' : 'weekday'}`}>
                  {format(day, 'EEE')}
                </span>
                <span className={`modern-day-number ${isWeekend ? 'weekend' : ''}`}>
                  {format(day, 'd')}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── FULL MONTH GRID VIEW (WHEN TOGGLED) ── */
        <div className="card fade-in-up" style={{ margin: '0 16px 16px 16px', padding: '14px', borderRadius: 20 }}>
          <div className="calendar-grid" style={{ marginBottom: 8 }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="calendar-day-header" style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                {d}
              </div>
            ))}
          </div>
          <div className="calendar-grid">
            {paddedMonthDays.map((day, i) => {
              if (!day) return <div key={i} />
              const isSel = isSameDay(day, selectedDate)
              const isTod = isToday(day)
              const isCurr = isSameMonth(day, currentDate)
              return (
                <div
                  key={i}
                  className={`calendar-day ${isTod ? 'today' : ''} ${isSel && !isTod ? 'selected' : ''} ${!isCurr ? 'other-month' : ''}`}
                  onClick={() => {
                    setSelectedDate(day)
                    setCalendarMode('week')
                  }}
                  style={{ height: 42, borderRadius: 12, cursor: 'pointer' }}
                >
                  <span className="calendar-day-num" style={{ fontSize: '12px' }}>{format(day, 'd')}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── TODAY SUMMARY BOX ── */}
      <div className="modern-cal-summary-box">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="modern-cal-summary-title">
            {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE')}
          </div>
          {totalActivitiesCount > 0 && (
            <button
              onClick={() => setShowOptimizerModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(234, 88, 12, 0.12))',
                border: '1px solid rgba(245, 158, 11, 0.28)',
                color: '#D97706',
                fontWeight: 800,
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: 12,
                cursor: 'pointer',
              }}
              title="Scan schedule for overload and resolve conflicts"
              id="cal-ai-optimizer-btn"
            >
              <span>⚡</span>
              <span>AI Optimizer</span>
            </button>
          )}
        </div>
        <div className="modern-cal-summary-sub">
          {totalActivitiesCount > 0 ? (
            <>
              You completed <span className="modern-cal-counter-highlight">{completedActivitiesCount}/{totalActivitiesCount}</span> {totalActivitiesCount === 1 ? 'activity' : 'activities'} scheduled
            </>
          ) : (
            <span>No scheduled activities for this day</span>
          )}
        </div>
      </div>

      {/* ── SCHEDULE TIMELINE OR EMPTY STATE ── */}
      <div className="modern-timeline-container">
        {displayedActivities.length > 0 ? (
          <div className="modern-timeline-list">
            {displayedActivities.map((act, index) => (
              <div key={act.id} className="modern-timeline-row">
                {/* Left Timeline Axis */}
                <div className="modern-timeline-axis-cell">
                  {act.isNow ? (
                    <span className="modern-timeline-now-pill">Now</span>
                  ) : (
                    <span className="modern-timeline-time-label">{act.timeLabel}</span>
                  )}

                  {/* Connector dots leading to next item */}
                  {index < displayedActivities.length - 1 ? (
                    <div className={`modern-timeline-dots-connector ${act.isNow ? 'connector-active' : ''}`} />
                  ) : (
                    <div className="modern-timeline-dots-connector-end" />
                  )}
                </div>

                {/* Right Activity Card */}
                <div className="modern-timeline-card-cell">
                  <div
                    className={`modern-activity-card ${act.theme} fade-in-up`}
                    onClick={act.onToggle}
                    title="Click to toggle completed or manage"
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        className="modern-activity-title"
                        style={{
                          textDecoration: act.isDone ? 'line-through' : 'none',
                          opacity: act.isDone ? 0.6 : 1,
                        }}
                      >
                        {act.title}
                      </div>
                      <div className={`modern-activity-subtitle ${act.subtitleClass || ''}`}>
                        <ClockIconSvg color={act.subtitleClass === 'accent-blue' ? '#0284C7' : '#94A3B8'} />
                        <span>{act.subtitle}</span>
                      </div>
                    </div>

                    {/* Illustration / Graphic */}
                    <div className="modern-activity-graphic">
                      {act.graphic}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Quick Action Buttons Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingLeft: 64 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => router.push('/chat')}
                style={{ fontSize: '12px', borderRadius: 16, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span>✨</span> Plan with AI
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowAddSheet(true)}
                style={{ fontSize: '12px', borderRadius: 16, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span>+</span> Add Activity
              </button>
            </div>
          </div>
        ) : (
          <div className="calendar-empty-state fade-in-up">
            <div className="calendar-empty-icon-box">
              <CalendarEmptySvg />
            </div>
            <div className="calendar-empty-title">No activities scheduled</div>
            <p className="calendar-empty-desc">
              {isToday(selectedDate)
                ? 'Your schedule is clear for today. Add tasks, meetings, or study blocks.'
                : `No tasks or events recorded for ${format(selectedDate, 'EEEE, MMMM d')}.`}
            </p>
            <div className="calendar-empty-actions">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowAddSheet(true)}
                style={{ borderRadius: 14, padding: '9px 18px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                id="cal-empty-add-btn"
              >
                <PlusIconSvg />
                <span>Add Task / Event</span>
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => router.push('/chat')}
                style={{ borderRadius: 14, padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
                id="cal-empty-plan-ai-btn"
              >
                <span>✨</span>
                <span>Plan with AI</span>
              </button>
            </div>
          </div>
        )}
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

      {showOptimizerModal && (
        <ScheduleOptimizerModal
          isOpen={showOptimizerModal}
          selectedDate={selectedDate}
          onClose={() => {
            setShowOptimizerModal(false)
            loadAllCalendarData()
          }}
          onScheduleOptimized={() => {
            loadAllCalendarData()
          }}
        />
      )}

      <BottomNav />
    </div>
  )
}
