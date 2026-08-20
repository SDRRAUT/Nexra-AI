import prisma from '@/lib/db/prisma'
import { NextResponse } from 'next/server'
import { startOfDay, endOfDay, addDays, isPast } from 'date-fns'

const DEFAULT_USER_ID = 'default-user'

export async function GET() {
  try {
    const todayStart = startOfDay(new Date())
    const todayEnd = endOfDay(new Date())
    const weekEnd = endOfDay(addDays(new Date(), 7))
    const now = new Date()

    const [user, todayTasks, todayEvents, deadlines, habits] = await Promise.all([
      prisma.user.findUnique({ where: { id: DEFAULT_USER_ID } }),
      prisma.task.findMany({
        where: {
          userId: DEFAULT_USER_ID,
          scheduledStart: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.event.findMany({
        where: {
          userId: DEFAULT_USER_ID,
          startTime: { gte: todayStart, lte: todayEnd },
        },
        orderBy: { startTime: 'asc' },
      }),
      prisma.task.findMany({
        where: {
          userId: DEFAULT_USER_ID,
          deadline: { gte: todayStart, lte: weekEnd },
          status: { not: 'completed' },
        },
        orderBy: { deadline: 'asc' },
        take: 3,
      }),
      prisma.habit.findMany({
        where: { userId: DEFAULT_USER_ID },
      }),
    ])

    const hour = now.getHours()
    const isEvening = hour >= 18
    const completedTasks = todayTasks.filter(t => t.status === 'completed')
    const pendingTasks = todayTasks.filter(t => t.status !== 'completed')

    // Find overdue / missed tasks
    const missedTasks = await prisma.task.findMany({
      where: {
        userId: DEFAULT_USER_ID,
        scheduledStart: { lt: now },
        status: { in: ['planned', 'scheduled'] },
      },
      take: 2,
    })

    let briefingTitle = ''
    let briefingText = ''
    let aiRecommendation = ''

    if (isEvening) {
      briefingTitle = 'Evening Reflection & Wrap-up'
      if (completedTasks.length === todayTasks.length && todayTasks.length > 0) {
        briefingText = `Incredible execution! You completed all ${completedTasks.length} planned tasks today.`
        aiRecommendation = 'Wind down and prepare your focus blocks for tomorrow.'
      } else {
        briefingText = `You completed ${completedTasks.length} of ${todayTasks.length} tasks today. ${pendingTasks.length} items remain.`
        aiRecommendation = pendingTasks.length > 0
          ? `Recommend moving "${pendingTasks[0].title}" to tomorrow morning.`
          : 'Ready for tomorrow.'
      }
    } else {
      briefingTitle = 'Daily Focus & Priorities'
      if (todayEvents.length > 0) {
        briefingText = `You have ${todayEvents.length} calendar events today starting with "${todayEvents[0].title}".`
      } else {
        briefingText = `Open calendar day with ${todayTasks.length} planned tasks.`
      }

      if (deadlines.length > 0) {
        aiRecommendation = `Primary deadline: "${deadlines[0].title}". Recommend 60m focus block before afternoon.`
      } else {
        aiRecommendation = 'Keep steady momentum across your daily habit streak.'
      }
    }

    return NextResponse.json({
      userName: user?.name || 'User',
      setupDone: user?.setupDone ?? true,
      isEvening,
      briefingTitle,
      briefingText,
      aiRecommendation,
      missedTasks,
      todayTasksCount: todayTasks.length,
      completedTasksCount: completedTasks.length,
      deadlinesCount: deadlines.length,
      habitsCount: habits.length,
    })
  } catch (error) {
    console.error('Error generating briefing:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
