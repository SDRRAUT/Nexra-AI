import prisma from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_USER_ID = 'default-user'

export async function GET() {
  const habits = await prisma.habit.findMany({
    where: { userId: DEFAULT_USER_ID, isActive: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(habits)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const habit = await prisma.habit.create({
    data: { userId: DEFAULT_USER_ID, ...body },
  })
  return NextResponse.json(habit, { status: 201 })
}
