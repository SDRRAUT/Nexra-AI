'use client'

import React, { useMemo } from 'react'

export interface TaskBombFuseProps {
  task: {
    id: string
    title: string
    status: string
    deadline?: string | null
    scheduledStart?: string | null
    createdAt?: string | Date
    priority?: string
  }
  urgentOverride?: boolean
  compact?: boolean
}

export function TaskBombFuse({ task, urgentOverride = false, compact = false }: TaskBombFuseProps) {
  const fuseState = useMemo(() => {
    const isDone = task.status === 'completed'
    if (isDone) {
      return {
        status: 'defused' as const,
        percent: 0,
        statusText: '🛡️ DEFUSED',
        timeText: 'Complete',
        statusColor: '#10B981',
        bombEmoji: '🛡️',
      }
    }

    const now = Date.now()

    // Determine target deadline timestamp
    let targetTime: number
    let hasExplicitTime = false
    if (task.deadline) {
      const parsed = new Date(task.deadline).getTime()
      if (!isNaN(parsed)) {
        targetTime = parsed
        hasExplicitTime = true
      } else {
        const endOfDay = new Date()
        endOfDay.setHours(23, 59, 59, 999)
        targetTime = endOfDay.getTime()
      }
    } else if (task.scheduledStart) {
      const parsed = new Date(task.scheduledStart).getTime()
      if (!isNaN(parsed)) {
        targetTime = parsed
        hasExplicitTime = true
      } else {
        const endOfDay = new Date()
        endOfDay.setHours(23, 59, 59, 999)
        targetTime = endOfDay.getTime()
      }
    } else {
      // Default to End of Today
      const endOfDay = new Date()
      endOfDay.setHours(23, 59, 59, 999)
      targetTime = endOfDay.getTime()
    }

    const diffMs = targetTime - now

    // ── 1. BOMB BLASTED (OVERDUE) ───────────────────────────────────
    if (diffMs <= 0) {
      const overdueMins = Math.max(1, Math.round(Math.abs(diffMs) / (1000 * 60)))
      const overdueStr =
        overdueMins < 60
          ? `${overdueMins}m`
          : `${Math.floor(overdueMins / 60)}h ${overdueMins % 60}m`

      return {
        status: 'blasted' as const,
        percent: 100,
        statusText: '💥 BLASTED!',
        timeText: `${overdueStr} Overdue`,
        statusColor: '#EF4444',
        bombEmoji: '💥',
      }
    }

    // ── 2. BURNING / TICKING DOWN ───────────────────────────────────
    const diffMins = Math.max(1, Math.round(diffMs / (1000 * 60)))
    const isCritical =
      task.priority === 'critical' || urgentOverride || diffMins <= 60

    // Reference timeline window: 8 hours (or total from day start)
    const windowMs = 8 * 60 * 60 * 1000
    // Scale burn percent from 15% (just ignited) to 95% (right at the bomb wick)
    const rawBurned = 1 - Math.min(Math.max(diffMs / windowMs, 0), 1)
    const percent = Math.min(95, Math.max(15, Math.round(rawBurned * 100)))

    const timeText =
      diffMins < 60
        ? `${diffMins}m left`
        : diffMins < 1440
        ? `${Math.floor(diffMins / 60)}h ${diffMins % 60}m left`
        : `${Math.round(diffMins / 1440)}d left`

    if (isCritical) {
      return {
        status: 'urgent' as const,
        percent: Math.max(percent, 80), // spark right at the bomb!
        statusText: '💣 TICKING URGENT',
        timeText,
        statusColor: '#F59E0B',
        bombEmoji: '💣',
      }
    }

    return {
      status: 'burning' as const,
      percent,
      statusText: '🔥 FUSE BURNING',
      timeText: hasExplicitTime ? timeText : `Today · ${timeText}`,
      statusColor: '#EA580C',
      bombEmoji: '💣',
    }
  }, [task, urgentOverride])

  return (
    <div
      className={`task-bomb-fuse-container ${fuseState.status} ${
        compact ? 'compact' : ''
      }`}
    >
      {/* Top micro-header with status & countdown */}
      <div className="task-bomb-fuse-header">
        <div
          className="task-bomb-fuse-status"
          style={{ color: fuseState.statusColor }}
        >
          <span>{fuseState.statusText}</span>
        </div>
        <div
          className="task-bomb-fuse-time"
          style={{ color: fuseState.statusColor }}
        >
          {fuseState.timeText}
        </div>
      </div>

      {/* Burning Fuse Track */}
      <div className="task-bomb-fuse-track-row">
        <div className="task-bomb-fuse-rope-track">
          {/* Burned charred ash segment */}
          <div
            className="task-bomb-fuse-rope-burned"
            style={{ width: `${fuseState.percent}%` }}
          />

          {/* Sizzling Flame & Spark at the burning tip */}
          {fuseState.status !== 'defused' && (
            <div
              className="task-bomb-fuse-spark-head"
              style={{ left: `${fuseState.percent}%` }}
            >
              <span className="task-bomb-fuse-spark-flame">🔥</span>
              <span className="task-bomb-fuse-spark-ember" />
            </div>
          )}
        </div>

        {/* Bomb / Blast / Defused Icon at the end */}
        <div
          className={`task-bomb-fuse-bomb-icon ${fuseState.status}`}
          title={
            fuseState.status === 'blasted'
              ? 'Deadline blasted!'
              : fuseState.status === 'urgent'
              ? 'Detonating soon!'
              : fuseState.status === 'defused'
              ? 'Defused'
              : 'Fuse burning towards deadline'
          }
        >
          {fuseState.bombEmoji}
        </div>
      </div>
    </div>
  )
}

export default TaskBombFuse
