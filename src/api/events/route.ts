import prisma from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { format } from 'date-fns'

const DEFAULT_USER_ID = 'default-user'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const where: Record<string, unknown> = { userId: DEFAULT_USER_ID }
  if (startDate && endDate) {
    where.startTime = { gte: new Date(startDate), lte: new Date(endDate) }
  }

  const events = await prisma.event.findMany({
    where,
    orderBy: { startTime: 'asc' },
  })
  return NextResponse.json(events)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const event = await prisma.event.create({
    data: { userId: DEFAULT_USER_ID, ...body },
  })
  return NextResponse.json(event, { status: 201 })
}
