import prisma from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_USER_ID = 'default-user'

export async function GET() {
  const notifications = await prisma.notification.findMany({
    where: { userId: DEFAULT_USER_ID, status: { not: 'dismissed' } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(notifications)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const notification = await prisma.notification.create({
    data: {
      userId: DEFAULT_USER_ID,
      title: body.title,
      body: body.body,
      type: body.type || 'info',
      actionType: body.actionType,
      actionData: body.actionData,
      relatedTaskId: body.relatedTaskId,
    },
  })
  return NextResponse.json(notification, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json()
  
  if (id === 'all') {
    await prisma.notification.updateMany({
      where: { userId: DEFAULT_USER_ID, status: 'unread' },
      data: { status: 'read', readAt: new Date() },
    })
    return NextResponse.json({ success: true })
  }

  const notification = await prisma.notification.update({
    where: { id },
    data: {
      status,
      readAt: status === 'read' || status === 'actioned' ? new Date() : undefined,
    },
  })
  
  return NextResponse.json(notification)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (id === 'all') {
    await prisma.notification.deleteMany({
      where: { userId: DEFAULT_USER_ID },
    })
    return NextResponse.json({ success: true })
  }

  if (id) {
    await prisma.notification.delete({
      where: { id },
    })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Missing id' }, { status: 400 })
}
