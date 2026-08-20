import prisma from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_USER_ID = 'default-user'

export async function GET() {
  const goals = await prisma.goal.findMany({
    where: { userId: DEFAULT_USER_ID },
    include: { milestones: true, tasks: { where: { status: { not: 'cancelled' } } } },
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(goals)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const goal = await prisma.goal.create({
    data: { userId: DEFAULT_USER_ID, ...body },
  })
  return NextResponse.json(goal, { status: 201 })
}
