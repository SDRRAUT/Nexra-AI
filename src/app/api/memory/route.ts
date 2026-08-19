import prisma from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_USER_ID = 'default-user'

export async function GET() {
  const memories = await prisma.memory.findMany({
    where: { userId: DEFAULT_USER_ID },
    orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(memories)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const memory = await prisma.memory.create({
    data: { userId: DEFAULT_USER_ID, ...body, source: 'user' },
  })
  return NextResponse.json(memory, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.memory.delete({ where: { id, userId: DEFAULT_USER_ID } })
  return NextResponse.json({ success: true })
}
