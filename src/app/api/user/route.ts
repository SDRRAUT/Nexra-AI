import prisma from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_USER_ID = 'default-user'

export async function GET() {
  const user = await prisma.user.upsert({
    where: { id: DEFAULT_USER_ID },
    update: {},
    create: { id: DEFAULT_USER_ID, name: 'User', timezone: 'Asia/Kolkata' },
  })
  return NextResponse.json(user)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const user = await prisma.user.update({
    where: { id: DEFAULT_USER_ID },
    data: body,
  })
  return NextResponse.json(user)
}
