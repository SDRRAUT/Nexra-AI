import prisma from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { actionId } = await req.json()

    if (!actionId) {
      return NextResponse.json({ error: 'Missing actionId' }, { status: 400 })
    }

    const action = await prisma.agentAction.findUnique({
      where: { id: actionId },
    })

    if (!action || !action.canUndo) {
      return NextResponse.json({ error: 'Action cannot be undone' }, { status: 400 })
    }

    if (action.undoneAt) {
      return NextResponse.json({ error: 'Action is already undone' }, { status: 400 })
    }

    if (action.undoPayload) {
      try {
        const payload = JSON.parse(action.undoPayload)
        if (payload.taskId) {
          await prisma.task.update({
            where: { id: payload.taskId },
            data: {
              status: payload.previousStatus || 'planned',
              scheduledStart: payload.previousStart ? new Date(payload.previousStart) : null,
              scheduledEnd: payload.previousEnd ? new Date(payload.previousEnd) : null,
            },
          })
        }
      } catch (e) {
        console.error('Failed to parse undo payload', e)
      }
    }

    const updatedAction = await prisma.agentAction.update({
      where: { id: actionId },
      data: {
        undoneAt: new Date(),
        status: 'undone',
      },
    })

    return NextResponse.json({ success: true, action: updatedAction })
  } catch (error) {
    console.error('Error undoing agent action:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
