import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { format } from 'date-fns'

const DEFAULT_USER_ID = 'default-user'

// GET: Export entire database as a downloadable JSON backup
export async function GET() {
  try {
    const [
      user,
      preferences,
      tasks,
      events,
      goals,
      habits,
      memories,
      conversations,
      expenses,
      documents,
      productivityRecords,
    ] = await Promise.all([
      prisma.user.findUnique({ where: { id: DEFAULT_USER_ID } }),
      prisma.preference.findMany({ where: { userId: DEFAULT_USER_ID } }),
      prisma.task.findMany({ where: { userId: DEFAULT_USER_ID } }),
      prisma.event.findMany({ where: { userId: DEFAULT_USER_ID } }),
      prisma.goal.findMany({
        where: { userId: DEFAULT_USER_ID },
        include: { milestones: true },
      }),
      prisma.habit.findMany({
        where: { userId: DEFAULT_USER_ID },
        include: { logs: true },
      }),
      prisma.memory.findMany({ where: { userId: DEFAULT_USER_ID } }),
      prisma.conversation.findMany({
        where: { userId: DEFAULT_USER_ID },
        include: { messages: true },
      }),
      prisma.expense.findMany({ where: { userId: DEFAULT_USER_ID } }),
      prisma.document.findMany({ where: { userId: DEFAULT_USER_ID } }),
      prisma.productivityRecord.findMany({ where: { userId: DEFAULT_USER_ID } }),
    ])

    const backupData = {
      app: 'Srushti AI',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      user: {
        name: user?.name || 'User',
        timezone: user?.timezone || 'Asia/Kolkata',
      },
      preferences: preferences.map(p => ({ key: p.key, value: p.value })),
      tasks,
      events,
      goals,
      habits,
      memories,
      conversations,
      expenses,
      documents,
      productivityRecords,
    }

    const filename = `srushti-backup-${format(new Date(), 'yyyy-MM-dd')}.json`

    return new Response(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('Export backup error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to export backup' }, { status: 500 })
  }
}

// POST: Import & Restore data from JSON backup
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { backupData, mode = 'merge' } = body

    if (!backupData || typeof backupData !== 'object') {
      return NextResponse.json({ error: 'Invalid backup file format' }, { status: 400 })
    }

    // If overwrite mode, clear existing user data first
    if (mode === 'overwrite') {
      await prisma.$transaction([
        prisma.message.deleteMany({ where: { conversation: { userId: DEFAULT_USER_ID } } }),
        prisma.conversation.deleteMany({ where: { userId: DEFAULT_USER_ID } }),
        prisma.habitLog.deleteMany({ where: { habit: { userId: DEFAULT_USER_ID } } }),
        prisma.habit.deleteMany({ where: { userId: DEFAULT_USER_ID } }),
        prisma.milestone.deleteMany({ where: { goal: { userId: DEFAULT_USER_ID } } }),
        prisma.task.deleteMany({ where: { userId: DEFAULT_USER_ID } }),
        prisma.goal.deleteMany({ where: { userId: DEFAULT_USER_ID } }),
        prisma.event.deleteMany({ where: { userId: DEFAULT_USER_ID } }),
        prisma.memory.deleteMany({ where: { userId: DEFAULT_USER_ID } }),
        prisma.expense.deleteMany({ where: { userId: DEFAULT_USER_ID } }),
        prisma.document.deleteMany({ where: { userId: DEFAULT_USER_ID } }),
      ])
    }

    let importedCounts = {
      tasks: 0,
      goals: 0,
      habits: 0,
      memories: 0,
      events: 0,
      expenses: 0,
      documents: 0,
    }

    // 1. Restore User Settings
    if (backupData.user?.name || backupData.user?.timezone) {
      await prisma.user.upsert({
        where: { id: DEFAULT_USER_ID },
        update: {
          name: backupData.user.name || undefined,
          timezone: backupData.user.timezone || undefined,
        },
        create: {
          id: DEFAULT_USER_ID,
          name: backupData.user.name || 'User',
          timezone: backupData.user.timezone || 'Asia/Kolkata',
        },
      }).catch(() => {})
    }

    // 2. Restore Preferences
    if (Array.isArray(backupData.preferences)) {
      for (const pref of backupData.preferences) {
        if (pref.key && pref.value) {
          await prisma.preference.upsert({
            where: { userId_key: { userId: DEFAULT_USER_ID, key: pref.key } },
            update: { value: pref.value },
            create: { userId: DEFAULT_USER_ID, key: pref.key, value: pref.value },
          }).catch(() => {})
        }
      }
    }

    // 3. Restore Goals
    if (Array.isArray(backupData.goals)) {
      for (const g of backupData.goals) {
        try {
          const goal = await prisma.goal.create({
            data: {
              userId: DEFAULT_USER_ID,
              title: g.title,
              description: g.description,
              category: g.category || 'personal',
              status: g.status || 'active',
              priority: g.priority || 'high',
              progress: g.progress || 0,
              targetDate: g.targetDate ? new Date(g.targetDate) : undefined,
            },
          })
          if (Array.isArray(g.milestones)) {
            for (const m of g.milestones) {
              await prisma.milestone.create({
                data: {
                  goalId: goal.id,
                  title: m.title,
                  description: m.description,
                  status: m.status || 'pending',
                },
              }).catch(() => {})
            }
          }
          importedCounts.goals++
        } catch {}
      }
    }

    // 4. Restore Habits
    if (Array.isArray(backupData.habits)) {
      for (const h of backupData.habits) {
        try {
          const habit = await prisma.habit.create({
            data: {
              userId: DEFAULT_USER_ID,
              title: h.title,
              description: h.description,
              category: h.category || 'health',
              frequency: h.frequency || 'daily',
              scheduledTime: h.scheduledTime,
              color: h.color,
              currentStreak: h.currentStreak || 0,
              longestStreak: h.longestStreak || 0,
              totalCompleted: h.totalCompleted || 0,
            },
          })
          if (Array.isArray(h.logs)) {
            for (const log of h.logs) {
              await prisma.habitLog.create({
                data: {
                  habitId: habit.id,
                  date: log.date,
                  status: log.status || 'completed',
                  notes: log.notes,
                },
              }).catch(() => {})
            }
          }
          importedCounts.habits++
        } catch {}
      }
    }

    // 5. Restore Tasks
    if (Array.isArray(backupData.tasks)) {
      for (const t of backupData.tasks) {
        try {
          await prisma.task.create({
            data: {
              userId: DEFAULT_USER_ID,
              title: t.title,
              description: t.description,
              category: t.category,
              priority: t.priority || 'medium',
              status: t.status || 'planned',
              deadline: t.deadline ? new Date(t.deadline) : undefined,
              scheduledStart: t.scheduledStart ? new Date(t.scheduledStart) : undefined,
              scheduledEnd: t.scheduledEnd ? new Date(t.scheduledEnd) : undefined,
              estimatedMinutes: t.estimatedMinutes,
              isAiGenerated: Boolean(t.isAiGenerated),
            },
          })
          importedCounts.tasks++
        } catch {}
      }
    }

    // 6. Restore Events
    if (Array.isArray(backupData.events)) {
      for (const e of backupData.events) {
        try {
          await prisma.event.create({
            data: {
              userId: DEFAULT_USER_ID,
              title: e.title,
              description: e.description,
              location: e.location,
              type: e.type || 'event',
              startTime: e.startTime ? new Date(e.startTime) : new Date(),
              endTime: e.endTime ? new Date(e.endTime) : new Date(),
              allDay: Boolean(e.allDay),
              color: e.color,
            },
          })
          importedCounts.events++
        } catch {}
      }
    }

    // 7. Restore Memories
    if (Array.isArray(backupData.memories)) {
      for (const m of backupData.memories) {
        try {
          await prisma.memory.create({
            data: {
              userId: DEFAULT_USER_ID,
              content: m.content,
              category: m.category || 'fact',
              importance: m.importance || 'medium',
              tags: m.tags,
              source: m.source || 'backup_import',
            },
          })
          importedCounts.memories++
        } catch {}
      }
    }

    // 8. Restore Expenses
    if (Array.isArray(backupData.expenses)) {
      for (const exp of backupData.expenses) {
        try {
          await prisma.expense.create({
            data: {
              userId: DEFAULT_USER_ID,
              title: exp.title,
              amount: exp.amount,
              dueDate: exp.dueDate ? new Date(exp.dueDate) : undefined,
              category: exp.category,
              status: exp.status || 'pending',
            },
          })
          importedCounts.expenses++
        } catch {}
      }
    }

    // 9. Restore Documents
    if (Array.isArray(backupData.documents)) {
      for (const doc of backupData.documents) {
        try {
          await prisma.document.create({
            data: {
              userId: DEFAULT_USER_ID,
              title: doc.title,
              type: doc.type,
              expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : undefined,
              notes: doc.notes,
            },
          })
          importedCounts.documents++
        } catch {}
      }
    }

    return NextResponse.json({
      success: true,
      importedCounts,
      message: 'Backup imported successfully!',
    })
  } catch (error: any) {
    console.error('Import backup error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to import backup' }, { status: 500 })
  }
}

// DELETE: Factory reset / wipe all user data with confirmation
export async function DELETE() {
  try {
    await prisma.$transaction([
      prisma.message.deleteMany({ where: { conversation: { userId: DEFAULT_USER_ID } } }),
      prisma.conversation.deleteMany({ where: { userId: DEFAULT_USER_ID } }),
      prisma.habitLog.deleteMany({ where: { habit: { userId: DEFAULT_USER_ID } } }),
      prisma.habit.deleteMany({ where: { userId: DEFAULT_USER_ID } }),
      prisma.milestone.deleteMany({ where: { goal: { userId: DEFAULT_USER_ID } } }),
      prisma.task.deleteMany({ where: { userId: DEFAULT_USER_ID } }),
      prisma.goal.deleteMany({ where: { userId: DEFAULT_USER_ID } }),
      prisma.event.deleteMany({ where: { userId: DEFAULT_USER_ID } }),
      prisma.memory.deleteMany({ where: { userId: DEFAULT_USER_ID } }),
      prisma.expense.deleteMany({ where: { userId: DEFAULT_USER_ID } }),
      prisma.document.deleteMany({ where: { userId: DEFAULT_USER_ID } }),
      prisma.agentAction.deleteMany({ where: { userId: DEFAULT_USER_ID } }),
      prisma.notification.deleteMany({ where: { userId: DEFAULT_USER_ID } }),
      prisma.productivityRecord.deleteMany({ where: { userId: DEFAULT_USER_ID } }),
    ])

    return NextResponse.json({ success: true, message: 'All user data wiped.' })
  } catch (error) {
    console.error('Reset error:', error)
    return NextResponse.json({ error: 'Failed to reset data' }, { status: 500 })
  }
}
