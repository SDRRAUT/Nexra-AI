import { localDb, ensureInitialData, type LocalTask, type LocalGoal, type LocalHabit, type LocalEvent, type LocalMemory } from '@/lib/db/localDb'

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
    customName = localStorage.getItem('srushti_user_name') || ''
  }

  const user = userList[0] || {
    id: 'default-user',
    name: customName || 'Sanket',
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
        : 'Your schedule is clear. Plan your next goals with Srushti.',
      priorities: tasks.filter(t => t.priority === 'high' || t.priority === 'critical').map(t => t.title),
      focusBlock: '09:00 AM - 11:30 AM (Deep Focus)',
    },
  }
}

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
  return newTask
}

export async function updateClientTask(id: string, updates: Partial<LocalTask>): Promise<void> {
  await localDb.tasks.update(id, updates)
}

export async function deleteClientTask(id: string): Promise<void> {
  await localDb.tasks.delete(id)
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
  return newGoal
}

export async function deleteClientGoal(id: string): Promise<void> {
  await localDb.goals.delete(id)
}

// ── 4. HABITS CRUD ────────────────────────────────────────────
export async function getClientHabits(): Promise<LocalHabit[]> {
  await ensureInitialData()
  return localDb.habits.toArray()
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
  return newHabit
}

export async function deleteClientHabit(id: string): Promise<void> {
  await localDb.habits.delete(id)
}

export async function toggleClientHabit(id: string, completed: boolean): Promise<void> {
  const habit = await localDb.habits.get(id)
  if (!habit) return

  const newStreak = completed ? habit.currentStreak + 1 : Math.max(0, habit.currentStreak - 1)
  const newLongest = Math.max(habit.longestStreak, newStreak)
  const newTotal = completed ? habit.totalCompleted + 1 : habit.totalCompleted

  await localDb.habits.update(id, {
    currentStreak: newStreak,
    longestStreak: newLongest,
    totalCompleted: newTotal,
  })
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
  return newMem
}

export async function deleteClientMemory(id: string): Promise<void> {
  await localDb.memories.delete(id)
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
  return newEvent
}

export async function deleteClientEvent(id: string): Promise<void> {
  await localDb.events.delete(id)
}
