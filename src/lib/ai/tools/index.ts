import { tool } from 'ai'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { format, addMinutes, parseISO } from 'date-fns'

const DEFAULT_USER_ID = 'default-user'

// ─── TASK TOOLS ───────────────────────────────────────────────────────────────

export const createTaskTool = tool({
  description: 'Create a new task for the user. Use this when the user mentions something they need to do, or when planning preparation for an exam/deadline.',
  inputSchema: z.object({
    title: z.string().describe('Clear, concise task title'),
    description: z.string().optional().describe('Additional context or details'),
    category: z.string().optional().describe('Category: study, work, personal, health, finance, etc.'),
    priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium').describe('Task priority based on deadline and importance'),
    deadline: z.string().optional().describe('ISO 8601 datetime string for when this must be done'),
    scheduledStart: z.string().optional().describe('ISO 8601 datetime for when to start this task'),
    estimatedMinutes: z.number().optional().describe('How long this task will take in minutes'),
    goalId: z.string().optional().describe('ID of the goal this task belongs to'),
    isAiGenerated: z.boolean().default(true),
    aiReason: z.string().optional().describe('Why Srushti is creating this task'),
  }),
  execute: async (params: {
    title: string
    description?: string
    category?: string
    priority: string
    deadline?: string
    scheduledStart?: string
    estimatedMinutes?: number
    goalId?: string
    isAiGenerated: boolean
    aiReason?: string
  }) => {
    const task = await prisma.task.create({
      data: {
        userId: DEFAULT_USER_ID,
        title: params.title,
        description: params.description,
        category: params.category,
        priority: params.priority,
        deadline: params.deadline ? parseISO(params.deadline) : undefined,
        scheduledStart: params.scheduledStart ? parseISO(params.scheduledStart) : undefined,
        scheduledEnd: params.scheduledStart && params.estimatedMinutes
          ? addMinutes(parseISO(params.scheduledStart), params.estimatedMinutes)
          : undefined,
        estimatedMinutes: params.estimatedMinutes,
        goalId: params.goalId,
        isAiGenerated: params.isAiGenerated,
        aiReason: params.aiReason,
        status: params.scheduledStart ? 'scheduled' : 'planned',
      },
    })
    return { success: true, taskId: task.id, task: { id: task.id, title: task.title, status: task.status } }
  },
})

export const updateTaskTool = tool({
  description: 'Update an existing task — change status, reschedule, update priority, etc.',
  inputSchema: z.object({
    taskId: z.string().describe('The ID of the task to update'),
    title: z.string().optional(),
    description: z.string().optional(),
    priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
    status: z.enum(['planned', 'scheduled', 'in_progress', 'completed', 'skipped', 'cancelled', 'overdue', 'rescheduled']).optional(),
    deadline: z.string().optional().describe('ISO 8601 datetime'),
    scheduledStart: z.string().optional().describe('ISO 8601 datetime'),
    estimatedMinutes: z.number().optional(),
    aiReason: z.string().optional().describe('Why this update is being made'),
  }),
  execute: async (params: {
    taskId: string
    title?: string
    description?: string
    priority?: string
    status?: string
    deadline?: string
    scheduledStart?: string
    estimatedMinutes?: number
    aiReason?: string
  }) => {
    const { taskId, aiReason, ...updates } = params
    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...updates,
        deadline: updates.deadline ? parseISO(updates.deadline) : undefined,
        scheduledStart: updates.scheduledStart ? parseISO(updates.scheduledStart) : undefined,
        scheduledEnd: updates.scheduledStart && updates.estimatedMinutes
          ? addMinutes(parseISO(updates.scheduledStart), updates.estimatedMinutes)
          : undefined,
        completedAt: updates.status === 'completed' ? new Date() : undefined,
        postponeCount: updates.status === 'rescheduled'
          ? { increment: 1 }
          : undefined,
        lastPostponedAt: updates.status === 'rescheduled' ? new Date() : undefined,
      },
    })
    
    // Log agent action
    await prisma.agentAction.create({
      data: {
        userId: DEFAULT_USER_ID,
        agentName: 'task_agent',
        actionType: 'updateTask',
        description: aiReason || `Updated task: ${task.title}`,
        payload: JSON.stringify(params),
        canUndo: true,
      },
    })
    
    return { success: true, taskId: task.id, title: task.title, status: task.status }
  },
})

export const getTasksTool = tool({
  description: 'Get tasks for the user, with optional filters by status, date range, or priority.',
  inputSchema: z.object({
    status: z.enum(['planned', 'scheduled', 'in_progress', 'completed', 'skipped', 'cancelled', 'overdue', 'rescheduled', 'all']).default('all'),
    date: z.string().optional().describe('YYYY-MM-DD to get tasks scheduled for that day'),
    priority: z.enum(['critical', 'high', 'medium', 'low', 'all']).optional().default('all'),
    category: z.string().optional(),
    limit: z.number().default(20),
  }),
  execute: async (params: {
    status: string
    date?: string
    priority?: string
    category?: string
    limit: number
  }) => {
    const where: Record<string, unknown> = { userId: DEFAULT_USER_ID }
    
    if (params.status !== 'all') where.status = params.status
    if (params.priority && params.priority !== 'all') where.priority = params.priority
    if (params.category) where.category = params.category
    
    if (params.date) {
      const start = new Date(params.date)
      const end = new Date(params.date)
      end.setDate(end.getDate() + 1)
      where.scheduledStart = { gte: start, lt: end }
    }
    
    const tasks = await prisma.task.findMany({
      where,
      take: params.limit,
      orderBy: [
        { priority: 'asc' },
        { scheduledStart: 'asc' },
        { deadline: 'asc' },
      ],
    })
    
    return { tasks: tasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      status: t.status,
      deadline: t.deadline,
      scheduledStart: t.scheduledStart,
      estimatedMinutes: t.estimatedMinutes,
      category: t.category,
      postponeCount: t.postponeCount,
    }))}
  },
})

export const completeTaskTool = tool({
  description: 'Mark a task as completed.',
  inputSchema: z.object({
    taskId: z.string(),
    actualMinutes: z.number().optional().describe('How long the task actually took'),
  }),
  execute: async (params: { taskId: string; actualMinutes?: number }) => {
    const task = await prisma.task.update({
      where: { id: params.taskId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        actualMinutes: params.actualMinutes,
      },
    })
    return { success: true, message: `✅ "${task.title}" marked as complete!` }
  },
})

// ─── SCHEDULE TOOLS ──────────────────────────────────────────────────────────

export const getScheduleTool = tool({
  description: 'Get the user schedule for a specific date — all events, tasks, and study sessions.',
  inputSchema: z.object({
    date: z.string().describe('YYYY-MM-DD date to get schedule for'),
  }),
  execute: async (params: { date: string }) => {
    const start = new Date(params.date)
    const end = new Date(params.date)
    end.setDate(end.getDate() + 1)
    
    const [events, tasks, studySessions] = await Promise.all([
      prisma.event.findMany({
        where: { userId: DEFAULT_USER_ID, startTime: { gte: start, lt: end } },
        orderBy: { startTime: 'asc' },
      }),
      prisma.task.findMany({
        where: {
          userId: DEFAULT_USER_ID,
          scheduledStart: { gte: start, lt: end },
          status: { notIn: ['completed', 'cancelled'] },
        },
        orderBy: { scheduledStart: 'asc' },
      }),
      prisma.studySession.findMany({
        where: { userId: DEFAULT_USER_ID, scheduledStart: { gte: start, lt: end } },
        orderBy: { scheduledStart: 'asc' },
      }),
    ])
    
    return { date: params.date, events, tasks, studySessions, 
      summary: `${events.length} events, ${tasks.length} tasks, ${studySessions.length} study sessions` }
  },
})

export const findFreeTimeTool = tool({
  description: 'Find available free time slots on a given date, considering existing events and tasks.',
  inputSchema: z.object({
    date: z.string().describe('YYYY-MM-DD'),
    minimumMinutes: z.number().default(30).describe('Minimum slot duration needed'),
    preferredHours: z.object({
      start: z.number().default(8).describe('Preferred start hour (24h)'),
      end: z.number().default(22).describe('Preferred end hour (24h)'),
    }).default({ start: 8, end: 22 }),
  }),
  execute: async (params: {
    date: string
    minimumMinutes: number
    preferredHours: { start: number; end: number }
  }) => {
    const start = new Date(params.date)
    const end = new Date(params.date)
    end.setDate(end.getDate() + 1)
    
    const [events, tasks] = await Promise.all([
      prisma.event.findMany({ where: { userId: DEFAULT_USER_ID, startTime: { gte: start, lt: end } }, orderBy: { startTime: 'asc' } }),
      prisma.task.findMany({ where: { userId: DEFAULT_USER_ID, scheduledStart: { gte: start, lt: end }, status: { notIn: ['completed', 'cancelled'] } }, orderBy: { scheduledStart: 'asc' } }),
    ])
    
    // Build busy blocks
    const busyBlocks: Array<{ start: Date; end: Date }> = [
      ...events.map((e: any) => ({ start: e.startTime, end: e.endTime })),
      ...tasks.filter((t: any) => t.scheduledStart && t.scheduledEnd).map((t: any) => ({ start: t.scheduledStart!, end: t.scheduledEnd! })),
    ].sort((a, b) => a.start.getTime() - b.start.getTime())
    
    // Find free slots
    const dayStart = new Date(params.date)
    dayStart.setHours(params.preferredHours.start, 0, 0, 0)
    const dayEnd = new Date(params.date)
    dayEnd.setHours(params.preferredHours.end, 0, 0, 0)
    
    const freeSlots: Array<{ start: string; end: string; durationMinutes: number }> = []
    let current = dayStart
    
    for (const busy of busyBlocks) {
      if (busy.start > dayEnd) break
      if (current < busy.start) {
        const duration = (busy.start.getTime() - current.getTime()) / 60000
        if (duration >= params.minimumMinutes) {
          freeSlots.push({
            start: format(current, "HH:mm"),
            end: format(busy.start, "HH:mm"),
            durationMinutes: Math.floor(duration),
          })
        }
      }
      current = busy.end > current ? busy.end : current
    }
    
    if (current < dayEnd) {
      const duration = (dayEnd.getTime() - current.getTime()) / 60000
      if (duration >= params.minimumMinutes) {
        freeSlots.push({
          start: format(current, "HH:mm"),
          end: format(dayEnd, "HH:mm"),
          durationMinutes: Math.floor(duration),
        })
      }
    }
    
    return { date: params.date, freeSlots, totalFreeMinutes: freeSlots.reduce((a: number, s: any) => a + s.durationMinutes, 0) }
  },
})

// ─── REMINDER TOOLS ───────────────────────────────────────────────────────────

export const createReminderTool = tool({
  description: 'Create a reminder that will appear in the notification panel at the specified time.',
  inputSchema: z.object({
    title: z.string(),
    body: z.string().optional(),
    triggerAt: z.string().describe('ISO 8601 datetime for when to show the reminder'),
    taskId: z.string().optional().describe('Link to a specific task'),
    type: z.enum(['reminder', 'follow_up', 'accountability']).default('reminder'),
  }),
  execute: async (params: {
    title: string
    body?: string
    triggerAt: string
    taskId?: string
    type: string
  }) => {
    const reminder = await prisma.reminder.create({
      data: {
        userId: DEFAULT_USER_ID,
        title: params.title,
        body: params.body,
        triggerAt: parseISO(params.triggerAt),
        taskId: params.taskId,
        type: params.type,
        isAiGenerated: true,
      },
    })
    return { success: true, reminderId: reminder.id, triggerAt: reminder.triggerAt }
  },
})

// ─── GOAL TOOLS ───────────────────────────────────────────────────────────────

export const createGoalTool = tool({
  description: 'Create a new goal for the user.',
  inputSchema: z.object({
    title: z.string(),
    description: z.string().optional(),
    category: z.string().optional(),
    priority: z.enum(['critical', 'high', 'medium', 'low']).default('high'),
    targetDate: z.string().optional().describe('ISO 8601 date'),
  }),
  execute: async (params: {
    title: string
    description?: string
    category?: string
    priority: string
    targetDate?: string
  }) => {
    const goal = await prisma.goal.create({
      data: {
        userId: DEFAULT_USER_ID,
        title: params.title,
        description: params.description,
        category: params.category,
        priority: params.priority,
        targetDate: params.targetDate ? parseISO(params.targetDate) : undefined,
        isAiGenerated: true,
      },
    })
    return { success: true, goalId: goal.id, title: goal.title }
  },
})

export const getGoalsTool = tool({
  description: 'Get the user current goals and progress.',
  inputSchema: z.object({
    status: z.enum(['active', 'paused', 'completed', 'all']).default('active'),
  }),
  execute: async (params: { status: string }) => {
    const goals = await prisma.goal.findMany({
      where: {
        userId: DEFAULT_USER_ID,
        ...(params.status !== 'all' ? { status: params.status } : {}),
      },
      include: { milestones: true, tasks: { where: { status: { notIn: ['cancelled'] } } } },
      orderBy: { priority: 'asc' },
    })
    return { goals: goals.map((g: any) => ({
      id: g.id,
      title: g.title,
      category: g.category,
      status: g.status,
      progress: g.progress,
      targetDate: g.targetDate,
      milestoneCount: g.milestones.length,
      taskCount: g.tasks.length,
      completedTasks: g.tasks.filter((t: any) => t.status === 'completed').length,
    }))}
  },
})

// ─── MEMORY TOOLS ─────────────────────────────────────────────────────────────

export const saveMemoryTool = tool({
  description: 'Save important information about the user to long-term memory. Use for goals, commitments, preferences, important dates, life context.',
  inputSchema: z.object({
    content: z.string().describe('What to remember — be specific and complete'),
    category: z.string().optional().describe('goal, preference, commitment, fact, pattern, decision, deadline'),
    importance: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    tags: z.string().optional().describe('Comma-separated tags for retrieval'),
  }),
  execute: async (params: {
    content: string
    category?: string
    importance: string
    tags?: string
  }) => {
    const memory = await prisma.memory.create({
      data: {
        userId: DEFAULT_USER_ID,
        content: params.content,
        category: params.category,
        importance: params.importance,
        tags: params.tags,
        source: 'chat',
      },
    })
    return { success: true, memoryId: memory.id }
  },
})

export const getMemoryTool = tool({
  description: 'Retrieve relevant memories about the user based on a search query.',
  inputSchema: z.object({
    query: z.string().describe('What to search for in memory'),
    category: z.string().optional(),
    limit: z.number().default(10),
  }),
  execute: async (params: { query: string; category?: string; limit: number }) => {
    const memories = await prisma.memory.findMany({
      where: {
        userId: DEFAULT_USER_ID,
        ...(params.category ? { category: params.category } : {}),
        content: { contains: params.query },
      },
      orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }],
      take: params.limit,
    })
    
    // Update access tracking
    if (memories.length > 0) {
      await prisma.memory.updateMany({
        where: { id: { in: memories.map((m: any) => m.id) } },
        data: { lastAccessedAt: new Date(), accessCount: { increment: 1 } },
      })
    }
    
    return { memories: memories.map((m: any) => ({ id: m.id, content: m.content, category: m.category, importance: m.importance, createdAt: m.createdAt })) }
  },
})

export const createNotificationTool = tool({
  description: 'Create an in-app notification for the user — for approvals, accountability messages, or important alerts.',
  inputSchema: z.object({
    title: z.string(),
    body: z.string().optional(),
    type: z.enum(['info', 'warning', 'critical', 'reminder', 'accountability', 'approval']),
    actionType: z.string().optional().describe('start_now, reschedule, skip, approve, reject'),
    actionData: z.string().optional().describe('JSON string with action payload'),
    relatedTaskId: z.string().optional(),
  }),
  execute: async (params: {
    title: string
    body?: string
    type: string
    actionType?: string
    actionData?: string
    relatedTaskId?: string
  }) => {
    const notification = await prisma.notification.create({
      data: {
        userId: DEFAULT_USER_ID,
        title: params.title,
        body: params.body,
        type: params.type,
        actionType: params.actionType,
        actionData: params.actionData,
        relatedTaskId: params.relatedTaskId,
      },
    })
    return { success: true, notificationId: notification.id }
  },
})

export const getProductivityTool = tool({
  description: 'Get productivity statistics for a date range.',
  inputSchema: z.object({
    period: z.enum(['today', 'week', 'month']).default('week'),
  }),
  execute: async (params: { period: string }) => {
    const now = new Date()
    let startDate: Date
    
    if (params.period === 'today') {
      startDate = new Date(now); startDate.setHours(0, 0, 0, 0)
    } else if (params.period === 'week') {
      startDate = new Date(now); startDate.setDate(now.getDate() - 7)
    } else {
      startDate = new Date(now); startDate.setDate(now.getDate() - 30)
    }
    
    const records = await prisma.productivityRecord.findMany({
      where: { userId: DEFAULT_USER_ID, date: { gte: format(startDate, 'yyyy-MM-dd') } },
      orderBy: { date: 'asc' },
    })
    
    const totalPlanned = records.reduce((a: number, r: any) => a + r.plannedTasks, 0)
    const totalCompleted = records.reduce((a: number, r: any) => a + r.completedTasks, 0)
    const avgScore = records.length > 0 ? records.reduce((a: number, r: any) => a + r.score, 0) / records.length : 0
    
    return {
      period: params.period,
      records,
      summary: {
        totalPlanned,
        totalCompleted,
        completionRate: totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0,
        averageScore: Math.round(avgScore),
      }
    }
  },
})

export const createEventTool = tool({
  description: 'Create a calendar event (classes, meetings, appointments, exams).',
  inputSchema: z.object({
    title: z.string(),
    description: z.string().optional(),
    type: z.string().default('event').describe('event, class, exam, meeting, appointment'),
    startTime: z.string().describe('ISO 8601 datetime'),
    endTime: z.string().describe('ISO 8601 datetime'),
    location: z.string().optional(),
    color: z.string().optional(),
  }),
  execute: async (params: {
    title: string
    description?: string
    type: string
    startTime: string
    endTime: string
    location?: string
    color?: string
  }) => {
    const event = await prisma.event.create({
      data: {
        userId: DEFAULT_USER_ID,
        title: params.title,
        description: params.description,
        type: params.type,
        startTime: parseISO(params.startTime),
        endTime: parseISO(params.endTime),
        location: params.location,
        color: params.color || (params.type === 'exam' ? '#ef4444' : '#6366f1'),
        isAiGenerated: true,
      },
    })
    return { success: true, eventId: event.id, title: event.title }
  },
})

export const createExpenseTool = tool({
  description: 'Create an expense or bill payment reminder (Finance Agent).',
  inputSchema: z.object({
    title: z.string().describe('Name of the bill or expense (e.g. WiFi bill, Rent)'),
    amount: z.number().optional().describe('Amount in currency'),
    category: z.string().default('utilities').describe('Category: utilities, rent, subscription, food, etc.'),
    dueDate: z.string().optional().describe('ISO 8601 datetime string for due date'),
    isRecurring: z.boolean().default(false),
  }),
  execute: async (params: {
    title: string
    amount?: number
    category: string
    dueDate?: string
    isRecurring: boolean
  }) => {
    const expense = await prisma.expense.create({
      data: {
        userId: DEFAULT_USER_ID,
        title: params.title,
        amount: params.amount,
        category: params.category,
        dueDate: params.dueDate ? parseISO(params.dueDate) : undefined,
        notes: params.isRecurring ? 'Recurring payment' : undefined,
      },
    })
    return { success: true, expenseId: expense.id, title: expense.title }
  },
})

export const createDocumentDeadlineTool = tool({
  description: 'Track an important document or submission deadline (Document Agent).',
  inputSchema: z.object({
    title: z.string().describe('Title of document (e.g. Passport Renewal, Assignment Submission)'),
    type: z.string().default('assignment').describe('Type: passport, license, assignment, contract, certificate'),
    expiryDate: z.string().optional().describe('ISO 8601 datetime string for expiry or submission deadline'),
    notes: z.string().optional(),
  }),
  execute: async (params: {
    title: string
    type: string
    expiryDate?: string
    notes?: string
  }) => {
    const doc = await prisma.document.create({
      data: {
        userId: DEFAULT_USER_ID,
        title: params.title,
        type: params.type,
        expiryDate: params.expiryDate ? parseISO(params.expiryDate) : undefined,
        notes: params.notes,
      },
    })
    return { success: true, documentId: doc.id, title: doc.title }
  },
})

// Export all tools as a single object for easy import
export const allTools = {
  createTask: createTaskTool,
  updateTask: updateTaskTool,
  getTasks: getTasksTool,
  completeTask: completeTaskTool,
  getSchedule: getScheduleTool,
  findFreeTime: findFreeTimeTool,
  createReminder: createReminderTool,
  createGoal: createGoalTool,
  getGoals: getGoalsTool,
  saveMemory: saveMemoryTool,
  getMemory: getMemoryTool,
  createNotification: createNotificationTool,
  getProductivity: getProductivityTool,
  createEvent: createEventTool,
  createExpense: createExpenseTool,
  createDocumentDeadline: createDocumentDeadlineTool,
}
