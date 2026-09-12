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

export function TaskBombFuse({ task, compact = false }: TaskBombFuseProps) {
  const fuseState = useMemo(() => {
    const isDone = task.status === 'completed'
    if (isDone) {
      return {
        status: 'defused' as const,
        percent: 100,
        sparkColor: '#10B981',
      }
    }

    const now = Date.now()

    // Determine target deadline timestamp
    let targetTime: number
    if (task.deadline) {
      const parsed = new Date(task.deadline).getTime()
      if (!isNaN(parsed)) {
        targetTime = parsed
      } else {
        const endOfDay = new Date()
        endOfDay.setHours(23, 59, 59, 999)
        targetTime = endOfDay.getTime()
      }
    } else if (task.scheduledStart) {
      const parsed = new Date(task.scheduledStart).getTime()
      if (!isNaN(parsed)) {
        targetTime = parsed
      } else {
        const endOfDay = new Date()
        endOfDay.setHours(23, 59, 59, 999)
        targetTime = endOfDay.getTime()
      }
    } else {
      const endOfDay = new Date()
      endOfDay.setHours(23, 59, 59, 999)
      targetTime = endOfDay.getTime()
    }

    const diffMs = targetTime - now

    // ── OVERDUE ──────────────────────────────────────────────────
    if (diffMs <= 0) {
      return {
        status: 'blasted' as const,
        percent: 100,
        sparkColor: '#EF4444',
      }
    }

    // Reference timeline window: 8 hours (or day span)
    const windowMs = 8 * 60 * 60 * 1000
    const rawBurned = 1 - Math.min(Math.max(diffMs / windowMs, 0), 1)
    // Scale burn percent from 8% to 96%
    const percent = Math.min(96, Math.max(8, Math.round(rawBurned * 100)))

    let sparkColor = '#10B981'
    if (percent > 75) {
      sparkColor = '#EF4444'
    } else if (percent > 40) {
      sparkColor = '#F59E0B'
    }

    return {
      status: percent > 75 ? ('urgent' as const) : ('burning' as const),
      percent,
      sparkColor,
    }
  }, [task])

  return (
    <div className={`task-bomb-fuse-container ${fuseState.status} ${compact ? 'compact' : ''}`}>
      {/* Pure Minimalist Gradient Deadline Line (Green -> Amber -> Red at the end) */}
      <div className="task-bomb-fuse-track-bg">
        <div
          className={`task-bomb-fuse-progress ${fuseState.status}`}
          style={{ width: `${fuseState.percent}%` }}
        />

        {fuseState.status !== 'defused' && (
          <div
            className="task-bomb-fuse-spark"
            style={{ left: `${fuseState.percent}%` }}
          >
            <span
              className="task-bomb-fuse-spark-dot"
              style={{
                boxShadow: `0 0 4px ${fuseState.sparkColor}, 0 0 8px ${fuseState.sparkColor}`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default TaskBombFuse
