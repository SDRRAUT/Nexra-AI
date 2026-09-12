import { localDb, ensureInitialData, type LocalTask, type LocalGoal, type LocalHabit, type LocalHabitLog, type LocalEvent, type LocalMemory } from '@/lib/db/localDb'

export interface DashboardData {
  user: {
    id: string
    name: string
    timezone: string
    aiAutonomy: string
  }
  tasks: LocalTask[]
  todayTasks: LocalTask[]
  completedTodayCount: number
  totalTodayCount: number
  progressPercent: number
  habits: LocalHabit[]
  goals: LocalGoal[]
  upcomingEvents: LocalEvent[]
  briefing: {
    greeting: string
    summary: string
    priorities: string[]
    focusBlock: string
  }
}

export function isOnboardingCompleted(): boolean {
  if (typeof window === 'undefined') return false
  return (
    localStorage.getItem('nexra_onboarding_done') === 'true' ||
    localStorage.getItem('srushti_onboarding_done') === 'true'
  )
}

// ── 1. DASHBOARD DATA ─────────────────────────────────────────
export async function getClientDashboard(): Promise<DashboardData> {
  await ensureInitialData()

  const [userList, tasks, habits, goals, events] = await Promise.all([
    localDb.user.toArray(),
    localDb.tasks.toArray(),
    localDb.habits.toArray(),
    localDb.goals.toArray(),
    localDb.events.toArray(),
  ])

  let customName = ''
  if (typeof localStorage !== 'undefined') {
    customName = localStorage.getItem('nexra_user_name') || localStorage.getItem('srushti_user_name') || ''
  }

  const user = userList[0] || {
    id: 'default-user',
    name: customName || 'Friend',
    timezone: 'Asia/Kolkata',
    aiAutonomy: 'autonomous',
  }
  if (customName) {
    user.name = customName
  }

  const todayTasks = tasks.filter(t => t.status !== 'cancelled')
  const completedTodayCount = todayTasks.filter(t => t.status === 'completed').length
  const totalTodayCount = todayTasks.length
  const progressPercent = totalTodayCount > 0 ? Math.round((completedTodayCount / totalTodayCount) * 100) : 0

  // Hour-based greeting
  const hour = new Date().getHours()
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return {
    user,
    tasks,
    todayTasks,
    completedTodayCount,
    totalTodayCount,
    progressPercent,
    habits,
    goals,
    upcomingEvents: events.slice(0, 3),
    briefing: {
      greeting: `${timeGreeting}, ${user.name || 'Sanket'}`,
      summary: totalTodayCount > 0 
        ? `You have ${totalTodayCount - completedTodayCount} tasks remaining for today.`
        : 'Your schedule is clear. Plan your next goals with Nexra.',
      priorities: tasks.filter(t => (t.priority === 'high' || t.priority === 'critical') && t.status !== 'completed').map(t => t.title),
      focusBlock: '09:00 AM - 11:30 AM (Deep Focus)',
    },
  }
}

function notifyDataChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('srushti_data_changed'))
  }
}

import { scheduleTaskReminder, syncAllActiveReminders } from '@/lib/notifications/native'

// ── 2. TASKS CRUD ─────────────────────────────────────────────
export async function getClientTasks(): Promise<LocalTask[]> {
  await ensureInitialData()
  return localDb.tasks.toArray()
}

export async function createClientTask(task: Partial<LocalTask>): Promise<LocalTask> {
  const newTask: LocalTask = {
    id: 'task-' + Date.now(),
    title: task.title || 'Untitled Task',
    category: task.category || 'general',
    priority: task.priority || 'medium',
    status: task.status || 'planned',
    estimatedMinutes: task.estimatedMinutes || 30,
    postponeCount: 0,
    createdAt: new Date().toISOString(),
    ...task,
  }
  await localDb.tasks.add(newTask)
  scheduleTaskReminder(newTask).catch(() => {})
  notifyDataChanged()
  return newTask
}

export async function updateClientTask(id: string, updates: Partial<LocalTask>): Promise<void> {
  await localDb.tasks.update(id, updates)
  const updated = await localDb.tasks.get(id)
  if (updated) {
    scheduleTaskReminder(updated).catch(() => {})
  }
  notifyDataChanged()
}

export async function toggleClientTask(id: string, completed: boolean): Promise<void> {
  await localDb.tasks.update(id, {
    status: completed ? 'completed' : 'planned',
    completedAt: completed ? new Date().toISOString() : undefined,
  })
  notifyDataChanged()
}

export async function deleteClientTask(id: string): Promise<void> {
  await localDb.tasks.delete(id)
  notifyDataChanged()
}

// ── 3. GOALS CRUD ─────────────────────────────────────────────
export async function getClientGoals(): Promise<LocalGoal[]> {
  await ensureInitialData()
  return localDb.goals.toArray()
}

export async function createClientGoal(goal: Partial<LocalGoal>): Promise<LocalGoal> {
  const newGoal: LocalGoal = {
    id: 'goal-' + Date.now(),
    title: goal.title || 'New Goal',
    category: goal.category || 'personal',
    status: 'active',
    priority: goal.priority || 'high',
    progress: goal.progress || 0,
    milestones: goal.milestones || [],
    createdAt: new Date().toISOString(),
    ...goal,
  }
  await localDb.goals.add(newGoal)
  notifyDataChanged()
  return newGoal
}

export async function updateClientGoal(id: string, updates: Partial<LocalGoal>): Promise<void> {
  await localDb.goals.update(id, updates)
  notifyDataChanged()
}

export async function deleteClientGoal(id: string): Promise<void> {
  await localDb.goals.delete(id)
  notifyDataChanged()
}

// ── 4. HABITS CRUD ────────────────────────────────────────────
export async function getClientHabits(): Promise<LocalHabit[]> {
  await ensureInitialData()
  return localDb.habits.toArray()
}

export async function getClientHabitLogs(): Promise<LocalHabitLog[]> {
  await ensureInitialData()
  return localDb.habitLogs.toArray()
}

export async function createClientHabit(habit: Partial<LocalHabit>): Promise<LocalHabit> {
  const newHabit: LocalHabit = {
    id: 'habit-' + Date.now(),
    title: habit.title || 'New Habit',
    category: habit.category || 'productivity',
    frequency: habit.frequency || 'daily',
    scheduledTime: habit.scheduledTime || '08:30',
    currentStreak: 0,
    longestStreak: 0,
    totalCompleted: 0,
    createdAt: new Date().toISOString(),
    ...habit,
  }
  await localDb.habits.add(newHabit)
  notifyDataChanged()
  return newHabit
}

export async function updateClientHabit(id: string, updates: Partial<LocalHabit>): Promise<void> {
  await localDb.habits.update(id, updates)
  notifyDataChanged()
}

export async function deleteClientHabit(id: string): Promise<void> {
  await localDb.habits.delete(id)
  await localDb.habitLogs.where('habitId').equals(id).delete().catch(() => {})
  notifyDataChanged()
}

export async function toggleClientHabit(id: string, completed: boolean, dateStr?: string): Promise<void> {
  const habit = await localDb.habits.get(id)
  if (!habit) return

  const now = new Date()
  const localY = now.getFullYear()
  const localM = String(now.getMonth() + 1).padStart(2, '0')
  const localD = String(now.getDate()).padStart(2, '0')
  const defaultToday = `${localY}-${localM}-${localD}`
  const targetDate = dateStr || defaultToday

  if (completed) {
    const existing = await localDb.habitLogs
      .where('habitId')
      .equals(id)
      .filter(l => l.date === targetDate)
      .first()
      .catch(() => null)

    if (!existing) {
      await localDb.habitLogs.add({
        id: `hlog-${id}-${targetDate}-${Date.now()}`,
        habitId: id,
        date: targetDate,
        status: 'completed',
        createdAt: new Date().toISOString(),
      }).catch(() => {})
    }
  } else {
    await localDb.habitLogs
      .where('habitId')
      .equals(id)
      .filter(l => l.date === targetDate)
      .delete()
      .catch(() => {})
  }

  // Calculate actual streak accurately from all completed logs
  const allLogs = await localDb.habitLogs.where('habitId').equals(id).toArray().catch(() => [])
  const completedDates = new Set(allLogs.filter(l => l.status === 'completed').map(l => l.date))

  let streak = 0
  const cur = new Date()
  const getFmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const todayFmt = getFmt(cur)

  if (completedDates.has(todayFmt)) {
    while (completedDates.has(getFmt(cur))) {
      streak++
      cur.setDate(cur.getDate() - 1)
    }
  } else {
    // Check if yesterday was completed
    cur.setDate(cur.getDate() - 1)
    while (completedDates.has(getFmt(cur))) {
      streak++
      cur.setDate(cur.getDate() - 1)
    }
  }

  const newTotal = completedDates.size
  const newLongest = Math.max(habit.longestStreak || 0, streak)

  await localDb.habits.update(id, {
    currentStreak: streak,
    longestStreak: newLongest,
    totalCompleted: newTotal,
  })
  notifyDataChanged()
}

// ── 5. MEMORIES CRUD ──────────────────────────────────────────
export async function getClientMemories(): Promise<LocalMemory[]> {
  await ensureInitialData()
  return localDb.memories.toArray()
}

export async function createClientMemory(content: string, category: string = 'preference'): Promise<LocalMemory> {
  const newMem: LocalMemory = {
    id: 'mem-' + Date.now(),
    content,
    category,
    importance: 'medium',
    accessCount: 1,
    createdAt: new Date().toISOString(),
  }
  await localDb.memories.add(newMem)
  notifyDataChanged()
  return newMem
}

export async function deleteClientMemory(id: string): Promise<void> {
  await localDb.memories.delete(id)
  notifyDataChanged()
}

// ── 6. EVENTS CRUD ────────────────────────────────────────────
export async function getClientEvents(): Promise<LocalEvent[]> {
  await ensureInitialData()
  return localDb.events.toArray()
}

export async function createClientEvent(event: Partial<LocalEvent>): Promise<LocalEvent> {
  const newEvent: LocalEvent = {
    id: 'event-' + Date.now(),
    title: event.title || 'New Event',
    type: event.type || 'focus',
    startTime: event.startTime || new Date().toISOString(),
    endTime: event.endTime || new Date(Date.now() + 3600000).toISOString(),
    createdAt: new Date().toISOString(),
    ...event,
  }
  await localDb.events.add(newEvent)
  notifyDataChanged()
  return newEvent
}

export async function deleteClientEvent(id: string): Promise<void> {
  await localDb.events.delete(id)
  notifyDataChanged()
}

// ── 7. CHAT CONVERSATIONS & MESSAGES CRUD ─────────────────────
export async function getClientConversations(): Promise<any[]> {
  await ensureInitialData()
  const convs = await localDb.conversations.orderBy('updatedAt').reverse().toArray()
  
  // Attach message counts
  const result = await Promise.all(
    convs.map(async (c) => {
      const msgCount = await localDb.messages.where('conversationId').equals(c.id).count()
      return {
        ...c,
        _count: { messages: msgCount }
      }
    })
  )
  return result
}

export async function getClientMessages(conversationId: string): Promise<any[]> {
  await ensureInitialData()
  return localDb.messages.where('conversationId').equals(conversationId).sortBy('createdAt')
}

export async function createClientConversation(title: string = 'New Conversation'): Promise<any> {
  await ensureInitialData()
  const convId = 'conv-' + Date.now()
  const newConv = {
    id: convId,
    title,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }
  await localDb.conversations.add(newConv)
  return newConv
}

export async function saveClientMessage(msg: {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  latencyMs?: number
  totalDurationMs?: number
  tokenCount?: number
  createdAt?: string
}): Promise<void> {
  await localDb.messages.put({
    id: msg.id,
    conversationId: msg.conversationId,
    role: msg.role,
    content: msg.content,
    latencyMs: msg.latencyMs,
    totalDurationMs: msg.totalDurationMs,
    tokenCount: msg.tokenCount,
    createdAt: msg.createdAt || new Date().toISOString(),
  })

  // Update conversation updatedAt timestamp and title if first message
  const conv = await localDb.conversations.get(msg.conversationId)
  if (conv) {
    let newTitle = conv.title
    if (conv.title === 'New Conversation' && msg.role === 'user') {
      newTitle = msg.content.slice(0, 32) + (msg.content.length > 32 ? '...' : '')
    }
    await localDb.conversations.update(msg.conversationId, {
      title: newTitle,
      updatedAt: new Date().toISOString(),
    })
  }
}

export async function deleteClientConversation(conversationId: string): Promise<void> {
  await localDb.conversations.delete(conversationId)
  await localDb.messages.where('conversationId').equals(conversationId).delete()
}
