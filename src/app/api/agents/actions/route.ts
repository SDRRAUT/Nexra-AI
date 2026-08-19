import prisma from '@/lib/db/prisma'
import { NextResponse } from 'next/server'

const DEFAULT_USER_ID = 'default-user'

export async function GET() {
  const actions = await prisma.agentAction.findMany({
    where: { userId: DEFAULT_USER_ID },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return NextResponse.json(actions)
}
