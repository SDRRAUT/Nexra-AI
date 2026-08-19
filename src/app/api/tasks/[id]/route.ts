import prisma from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_USER_ID = 'default-user'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const task = await prisma.task.update({
    where: { id, userId: DEFAULT_USER_ID },
    data: {
      ...body,
      completedAt: body.status === 'completed' ? new Date() : undefined,
    },
  })
  return NextResponse.json(task)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.task.delete({ where: { id, userId: DEFAULT_USER_ID } })
  return NextResponse.json({ success: true })
}
