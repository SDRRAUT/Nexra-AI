import prisma from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { addHours, addMinutes, startOfTomorrow } from 'date-fns'

const DEFAULT_USER_ID = 'default-user'

export async function POST(req: NextRequest) {
  try {
    const { taskId, action, reason } = await req.json()

    if (!taskId || !action) {
      return NextResponse.json({ error: 'Missing taskId or action' }, { status: 400 })
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    let updatedTask
    let agentActionDesc = ''

    if (action === 'start_now') {
      const now = new Date()
      const end = task.estimatedMinutes ? addMinutes(now, task.estimatedMinutes) : addHours(now, 1)

      updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'in_progress',
          scheduledStart: now,
          scheduledEnd: end,
        },
      })

      agentActionDesc = `Started focus session for "${task.title}" right now`

      // Log notification
      await prisma.notification.create({
        data: {
          userId: DEFAULT_USER_ID,
          title: `🎯 Focus Mode Active: ${task.title}`,
          body: `Nexra blocked out time for the next ${task.estimatedMinutes || 60} mins. Stay focused!`,
          type: 'reminder',
          status: 'unread',
        },
      })
    } else if (action === 'reschedule') {
      // Find next free slot (e.g., 2 hours from now or tomorrow morning)
      const newStart = addHours(new Date(), 2)
      const newEnd = task.estimatedMinutes ? addMinutes(newStart, task.estimatedMinutes) : addHours(newStart, 1)

      const postponeCount = (task.postponeCount || 0) + 1

      updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'scheduled',
          scheduledStart: newStart,
          scheduledEnd: newEnd,
          postponeCount,
          lastPostponedAt: new Date(),
        },
      })

      agentActionDesc = `Rescheduled "${task.title}" to ${newStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

      // If postponed multiple times, log behavioral pattern
      if (postponeCount >= 2) {
        await prisma.behaviorPattern.create({
          data: {
            userId: DEFAULT_USER_ID,
            patternType: 'repeated_postponement',
            confidence: 0.85,
            description: `User postponed "${task.title}" ${postponeCount} times. Recommend breaking into 20-30 min subtasks.`,
            data: JSON.stringify({ taskId, postponeCount, taskTitle: task.title }),
          },
        })
      }
    } else if (action === 'skip') {
      updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'skipped',
          notes: reason ? `${task.notes ? task.notes + ' | ' : ''}Skipped reason: ${reason}` : task.notes,
        },
      })

      agentActionDesc = `Marked "${task.title}" as skipped${reason ? ` (Reason: ${reason})` : ''}`
    }

    // Log agent action
    if (agentActionDesc) {
      await prisma.agentAction.create({
        data: {
          userId: DEFAULT_USER_ID,
          agentName: 'schedule_agent',
          actionType: `recover_task_${action}`,
          description: agentActionDesc,
          canUndo: true,
          undoPayload: JSON.stringify({
            taskId,
            previousStatus: task.status,
            previousStart: task.scheduledStart,
            previousEnd: task.scheduledEnd,
          }),
        },
      })
    }

    return NextResponse.json({ success: true, task: updatedTask })
  } catch (error) {
    console.error('Error recovering task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
