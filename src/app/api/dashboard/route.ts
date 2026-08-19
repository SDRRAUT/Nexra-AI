import prisma from '@/lib/db/prisma'
import { NextResponse } from 'next/server'

const DEFAULT_USER_ID = 'default-user'

// GET /api/dashboard — main dashboard data
export async function GET() {
  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)
  const in7Days = new Date(now.getTime() + 7 * 86400000)

  // Ensure default user exists
  const user = await prisma.user.upsert({
    where: { id: DEFAULT_USER_ID },
    update: {},
    create: { id: DEFAULT_USER_ID, name: 'User', timezone: 'Asia/Kolkata' },
  })

  const [scheduledTodayTasks, allActiveTasks, todayEvents, upcomingDeadlines, activeGoals, activeHabits, recentActions, notifications, overdueItems] =
    await Promise.all([
      prisma.task.findMany({
        where: { userId: DEFAULT_USER_ID, scheduledStart: { gte: todayStart, lte: todayEnd } },
        orderBy: { scheduledStart: 'asc' },
      }),
      prisma.task.findMany({
        where: { userId: DEFAULT_USER_ID, status: { in: ['planned', 'scheduled', 'in_progress'] } },
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        take: 10,
      }),
      prisma.event.findMany({
        where: { userId: DEFAULT_USER_ID, startTime: { gte: todayStart, lte: todayEnd } },
        orderBy: { startTime: 'asc' },
      }),
      prisma.task.findMany({
        where: { userId: DEFAULT_USER_ID, deadline: { gte: now, lte: in7Days }, status: { notIn: ['completed', 'cancelled'] } },
        orderBy: { deadline: 'asc' },
        take: 5,
      }),
      prisma.goal.findMany({ where: { userId: DEFAULT_USER_ID, status: 'active' }, take: 4, orderBy: { priority: 'asc' } }),
      prisma.habit.findMany({ where: { userId: DEFAULT_USER_ID, isActive: true }, take: 6 }),
      prisma.agentAction.findMany({ where: { userId: DEFAULT_USER_ID }, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.notification.findMany({ where: { userId: DEFAULT_USER_ID, status: 'unread' }, orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.task.findMany({
        where: { userId: DEFAULT_USER_ID, deadline: { lt: now }, status: { notIn: ['completed', 'cancelled', 'skipped'] } },
        orderBy: { deadline: 'asc' },
        take: 5,
      }),
    ])

  // If scheduled tasks exist for today, use them; otherwise show active tasks
  const todayTasks = scheduledTodayTasks.length > 0 ? scheduledTodayTasks : allActiveTasks

  // Calculate today's progress
  const completedToday = todayTasks.filter((t: any) => t.status === 'completed').length
  const totalToday = todayTasks.length
  const progressPercent = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0

  // Find next scheduled task or highest priority active task
  const nextTask = scheduledTodayTasks.find((t: any) =>
    t.status !== 'completed' && t.scheduledStart && t.scheduledStart > now
  ) || allActiveTasks[0] || null

  // Critical items (deadline within 48 hours or explicitly critical priority)
  const criticalItems = upcomingDeadlines.filter((t: any) => {
    if (t.priority === 'critical') return true
    if (!t.deadline) return false
    const hoursUntil = (t.deadline.getTime() - now.getTime()) / 3600000
    return hoursUntil <= 48
  })

  // Detect at-risk commitments
  const atRiskCount = overdueItems.length + criticalItems.filter((t: any) => t.status !== 'completed').length

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      timezone: user.timezone,
    },
    today: {
      date: now.toISOString(),
      tasks: todayTasks,
      events: todayEvents,
      completedCount: completedToday,
      totalCount: totalToday,
      progressPercent,
      nextTask,
    },
    critical: criticalItems,
    upcoming: upcomingDeadlines,
    goals: activeGoals,
    habits: activeHabits,
    atRisk: atRiskCount,
    overdue: overdueItems,
    recentActions,
    notifications,
    unreadCount: notifications.length,
  })
}
