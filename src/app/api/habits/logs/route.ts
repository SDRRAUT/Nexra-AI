import prisma from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_USER_ID = 'default-user'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const logs = await prisma.habitLog.findMany({
    where: { habit: { userId: DEFAULT_USER_ID }, ...(date ? { date } : {}) },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(logs)
}

export async function POST(req: NextRequest) {
  const { habitId, date, status, notes } = await req.json()

  // Upsert log
  const log = await prisma.habitLog.upsert({
    where: { habitId_date: { habitId, date } },
    update: { status, notes, completedAt: status === 'completed' ? new Date() : null },
    create: { habitId, date, status, notes, completedAt: status === 'completed' ? new Date() : null },
  })

  // Update streaks if completed
  if (status === 'completed') {
    const habit = await prisma.habit.findUnique({ where: { id: habitId } })
    if (habit) {
      await prisma.habit.update({
        where: { id: habitId },
        data: {
          totalCompleted: { increment: 1 },
          currentStreak: { increment: 1 },
          longestStreak: Math.max(habit.longestStreak, habit.currentStreak + 1),
        },
      })
    }
  }

  return NextResponse.json(log)
}
