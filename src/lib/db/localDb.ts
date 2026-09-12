import Dexie, { type Table } from 'dexie'

export interface LocalUser {
  id: string
  name: string
  timezone: string
  aiAutonomy: string
  notifications: boolean
  morningBriefing: boolean
  accountabilityCheck: boolean
}

export interface LocalTask {
  id: string
  title: string
  description?: string
  category?: string
  priority: string // critical, high, medium, low
  status: string // planned, scheduled, in_progress, completed, skipped, cancelled
  deadline?: string
  scheduledStart?: string
  scheduledEnd?: string
  estimatedMinutes?: number
  isAiGenerated?: boolean
  postponeCount: number
  autoOptimizedFrom?: string
  autoOptimizedAt?: string
  completedAt?: string
  createdAt: string
}

export interface LocalEvent {
  id: string
  title: string
  description?: string
  location?: string
  type: string
  startTime: string
  endTime: string
  allDay?: boolean
  color?: string
  createdAt: string
}

export interface LocalGoal {
  id: string
  title: string
  description?: string
  category: string
  status: string // active, paused, completed
  priority: string
  progress: number // 0 - 100
  targetDate?: string
  milestones?: { id: string; title: string; status: string }[]
  createdAt: string
}

export interface LocalHabit {
  id: string
  title: string
  description?: string
  category: string
  frequency: string
  scheduledTime?: string
  currentStreak: number
  longestStreak: number
  totalCompleted: number
  createdAt: string
}

export interface LocalHabitLog {
  id: string
  habitId: string
  date: string // YYYY-MM-DD
  status: string // completed, skipped
  createdAt: string
}

export interface LocalMemory {
  id: string
  content: string
  category: string // goal, preference, commitment, fact, habit, relationship
  importance: string // low, medium, high, critical
  tags?: string
  accessCount: number
  createdAt: string
}

export interface LocalConversation {
  id: string
  title: string
  updatedAt: string
  createdAt: string
}

export interface LocalChatMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  latencyMs?: number
  totalDurationMs?: number
  tokenCount?: number
  createdAt: string
}

export interface LocalNotification {
  id: string
  title: string
  body?: string
  type: string
  status: string // unread, read, dismissed
  actionType?: string
  createdAt: string
}

export interface LocalExpense {
  id: string
  title: string
  amount?: number
  dueDate?: string
  category?: string
  status: string
  createdAt: string
}

export interface LocalDocument {
  id: string
  title: string
  type: 'note' | 'pdf' | 'image' | 'code' | 'sheet' | 'link' | 'other' | string
  mimeType?: string
  size?: number
  content?: string
  dataUrl?: string
  tags?: string[]
  isFavorite?: boolean
  pinned?: boolean
  expiryDate?: string
  notes?: string
  createdAt: string
  updatedAt?: string
}

export interface LocalPreference {
  key: string
  value: string
}

class SrushtiDatabase extends Dexie {
  user!: Table<LocalUser, string>
  tasks!: Table<LocalTask, string>
  events!: Table<LocalEvent, string>
  goals!: Table<LocalGoal, string>
  habits!: Table<LocalHabit, string>
  habitLogs!: Table<LocalHabitLog, string>
  memories!: Table<LocalMemory, string>
  conversations!: Table<LocalConversation, string>
  messages!: Table<LocalChatMessage, string>
  notifications!: Table<LocalNotification, string>
  expenses!: Table<LocalExpense, string>
  documents!: Table<LocalDocument, string>
  preferences!: Table<LocalPreference, string>

  constructor() {
    super('SrushtiLocalDB')
    this.version(1).stores({
      user: 'id',
      tasks: 'id, priority, status, category, deadline, scheduledStart',
      events: 'id, startTime, endTime, type',
      goals: 'id, status, priority, category',
      habits: 'id, category, frequency',
      habitLogs: 'id, habitId, date, [habitId+date]',
      memories: 'id, category, importance, createdAt',
      conversations: 'id, updatedAt',
      messages: 'id, conversationId, role, createdAt',
      notifications: 'id, status, type, createdAt',
      expenses: 'id, status, dueDate',
      documents: 'id, type, expiryDate',
      preferences: 'key',
    })
  }
}

export const localDb = new SrushtiDatabase()

// Seed default user shell if not present
export async function ensureInitialData() {
  if (typeof window === 'undefined') return

  const userCount = await localDb.user.count()
  if (userCount === 0) {
    const customName =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('nexra_user_name') || localStorage.getItem('srushti_user_name') || ''
        : ''
    await localDb.user.add({
      id: 'default-user',
      name: customName || 'Friend',
      timezone: 'Asia/Kolkata',
      aiAutonomy: 'autonomous',
      notifications: true,
      morningBriefing: true,
      accountabilityCheck: true,
    })
  }
}
