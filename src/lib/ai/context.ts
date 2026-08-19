import prisma from '@/lib/db/prisma'
import { format } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'

const DEFAULT_USER_ID = 'default-user'
const DEFAULT_TIMEZONE = 'Asia/Kolkata'

export interface AIContext {
  currentDateTime: string
  timezone: string
  userName: string
  todaySchedule: string
  upcomingDeadlines: string
  activeGoals: string
  recentMemories: string
  overdueAndAtRisk: string
  behaviorInsights: string
}

/**
 * Builds a rich, relevant context snapshot for AI requests.
 * Keeps context focused — doesn't send irrelevant history.
 */
export async function buildContext(): Promise<AIContext> {
  const now = new Date()
  const todayStr = format(now, 'yyyy-MM-dd')
  const tomorrowStr = format(new Date(now.getTime() + 86400000), 'yyyy-MM-dd')
  const in7DaysStr = format(new Date(now.getTime() + 7 * 86400000), 'yyyy-MM-dd')

  const [user, todayTasks, todayEvents, upcomingDeadlines, activeGoals, memories, overdueItems, behaviorPatterns] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: DEFAULT_USER_ID } }),
      
      // Today's tasks
      prisma.task.findMany({
        where: {
          userId: DEFAULT_USER_ID,
          scheduledStart: { gte: new Date(todayStr), lt: new Date(tomorrowStr) },
          status: { notIn: ['completed', 'cancelled'] },
        },
        orderBy: { scheduledStart: 'asc' },
        take: 15,
      }),
      
      // Today's events
      prisma.event.findMany({
        where: {
          userId: DEFAULT_USER_ID,
          startTime: { gte: new Date(todayStr), lt: new Date(tomorrowStr) },
        },
        orderBy: { startTime: 'asc' },
        take: 10,
      }),
      
      // Deadlines in next 7 days
      prisma.task.findMany({
        where: {
          userId: DEFAULT_USER_ID,
          deadline: { gte: now, lte: new Date(in7DaysStr) },
          status: { notIn: ['completed', 'cancelled'] },
        },
        orderBy: { deadline: 'asc' },
        take: 10,
      }),
      
      // Active goals
      prisma.goal.findMany({
        where: { userId: DEFAULT_USER_ID, status: 'active' },
        take: 5,
        orderBy: { priority: 'asc' },
      }),
      
      // Most important memories
      prisma.memory.findMany({
        where: { userId: DEFAULT_USER_ID, importance: { in: ['high', 'critical'] } },
        orderBy: [{ importance: 'desc' }, { lastAccessedAt: 'desc' }],
        take: 10,
      }),
      
      // Overdue tasks
      prisma.task.findMany({
        where: {
          userId: DEFAULT_USER_ID,
          deadline: { lt: now },
          status: { notIn: ['completed', 'cancelled', 'skipped'] },
        },
        orderBy: { deadline: 'asc' },
        take: 5,
      }),
      
      // Behavior patterns
      prisma.behaviorPattern.findMany({
        where: { userId: DEFAULT_USER_ID },
        orderBy: { confidence: 'desc' },
        take: 3,
      }),
    ])

  const userName = user?.name || 'User'
  const tz = user?.timezone || DEFAULT_TIMEZONE
  const currentDateTime = formatInTimeZone(now, tz, "EEEE, MMMM d, yyyy 'at' h:mm a zzz")

  // Build today's schedule string
  const scheduleItems = [
    ...todayEvents.map((e: any) => `  ${format(e.startTime, 'HH:mm')}–${format(e.endTime, 'HH:mm')} [EVENT] ${e.title}`),
    ...todayTasks.map((t: any) => `  ${t.scheduledStart ? format(t.scheduledStart, 'HH:mm') : 'Unscheduled'} [TASK:${t.priority}] ${t.title}${t.estimatedMinutes ? ` (${t.estimatedMinutes}min)` : ''}`),
  ].sort()

  const todaySchedule = scheduleItems.length > 0
    ? scheduleItems.join('\n')
    : '  No items scheduled for today'

  // Upcoming deadlines
  const deadlineStr = upcomingDeadlines.length > 0
    ? upcomingDeadlines.map((t: any) => `  - ${t.title} → due ${t.deadline ? format(t.deadline, 'EEE MMM d') : 'unknown'} [${t.priority}]`).join('\n')
    : '  No upcoming deadlines'

  // Active goals
  const goalsStr = activeGoals.length > 0
    ? activeGoals.map((g: any) => `  - ${g.title} (${g.progress}% complete)`).join('\n')
    : '  No active goals'

  // Memories
  const memoriesStr = memories.length > 0
    ? memories.map((m: any) => `  [${m.category || 'general'}] ${m.content}`).join('\n')
    : '  No important memories stored'

  // Overdue
  const overdueStr = overdueItems.length > 0
    ? `⚠️ OVERDUE (${overdueItems.length} items):\n` + overdueItems.map((t: any) => `  - ${t.title} (was due ${t.deadline ? format(t.deadline, 'MMM d') : 'unknown'})`).join('\n')
    : '  No overdue tasks'

  // Behavior insights
  const behaviorStr = behaviorPatterns.length > 0
    ? behaviorPatterns.map((p: any) => `  - ${p.description}`).join('\n')
    : '  No behavior patterns detected yet'

  return {
    currentDateTime,
    timezone: tz,
    userName,
    todaySchedule,
    upcomingDeadlines: deadlineStr,
    activeGoals: goalsStr,
    recentMemories: memoriesStr,
    overdueAndAtRisk: overdueStr,
    behaviorInsights: behaviorStr,
  }
}

export function formatContextForPrompt(ctx: AIContext): string {
  return `
=== CURRENT CONTEXT ===
Date/Time: ${ctx.currentDateTime}
User: ${ctx.userName}

TODAY'S SCHEDULE:
${ctx.todaySchedule}

UPCOMING DEADLINES (next 7 days):
${ctx.upcomingDeadlines}

ACTIVE GOALS:
${ctx.activeGoals}

IMPORTANT MEMORIES:
${ctx.recentMemories}

STATUS:
${ctx.overdueAndAtRisk}

USER BEHAVIOR INSIGHTS:
${ctx.behaviorInsights}
=== END CONTEXT ===`
}
