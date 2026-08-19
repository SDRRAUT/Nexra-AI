import prisma from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_USER_ID = 'default-user'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const date = searchParams.get('date')
  const priority = searchParams.get('priority')

  const where: Record<string, unknown> = { userId: DEFAULT_USER_ID }
  if (status && status !== 'all') where.status = status
  if (priority && priority !== 'all') where.priority = priority
  if (date) {
    const start = new Date(date)
    const end = new Date(date); end.setDate(end.getDate() + 1)
    where.scheduledStart = { gte: start, lt: end }
  }

  const tasks = await prisma.task.findMany({
    where,
    include: { subtasks: true, reminders: true },
    orderBy: [{ priority: 'asc' }, { scheduledStart: 'asc' }, { deadline: 'asc' }],
  })

  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const task = await prisma.task.create({
    data: { userId: DEFAULT_USER_ID, ...body },
  })
  return NextResponse.json(task, { status: 201 })
}
