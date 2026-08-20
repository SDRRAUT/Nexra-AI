import prisma from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { format, subDays } from 'date-fns'

const DEFAULT_USER_ID = 'default-user'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || 'week'
  
  const now = new Date()
  let startDate: Date
  if (period === 'today') { startDate = new Date(now); startDate.setHours(0, 0, 0, 0) }
  else if (period === 'month') { startDate = subDays(now, 30) }
  else { startDate = subDays(now, 7) }

  const records = await prisma.productivityRecord.findMany({
    where: { userId: DEFAULT_USER_ID, date: { gte: format(startDate, 'yyyy-MM-dd') } },
    orderBy: { date: 'asc' },
  })

  const totalPlanned = records.reduce((a: number, r: any) => a + r.plannedTasks, 0)
  const totalCompleted = records.reduce((a: number, r: any) => a + r.completedTasks, 0)
  const avgScore = records.length > 0 ? records.reduce((a: number, r: any) => a + r.score, 0) / records.length : 0

  return NextResponse.json({
    period,
    records,
    summary: {
      totalPlanned,
      totalCompleted,
      completionRate: totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0,
      averageScore: Math.round(avgScore),
    }
  })
}
