'use client'

import { useState, useEffect } from 'react'
import { format, addDays } from 'date-fns'
import { localDb } from '@/lib/db/localDb'

interface ScheduleOptimizerProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date
  onScheduleOptimized?: () => void
}

interface OverloadAnalysis {
  totalMinutes: number
  taskCount: number
  eventCount: number
  isOverloaded: boolean
  hasConflicts: boolean
  moveableTasks: { id: string; title: string; priority: string; estimatedMinutes: number }[]
}

export default function ScheduleOptimizerModal({
  isOpen,
  onClose,
  selectedDate,
  onScheduleOptimized,
}: ScheduleOptimizerProps) {
  const [analysis, setAnalysis] = useState<OverloadAnalysis | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [selectedTaskIdsToMove, setSelectedTaskIdsToMove] = useState<string[]>([])

  const dayStr = format(selectedDate, 'yyyy-MM-dd')
  const tomorrowDate = addDays(selectedDate, 1)
  const tomorrowStr = format(tomorrowDate, 'EEEE, MMM d')

  useEffect(() => {
    if (!isOpen) return

    const runAnalysis = async () => {
      try {
        const [tasks, events] = await Promise.all([
          localDb.tasks.toArray(),
          localDb.events.toArray(),
        ])

        const dayTasks = tasks.filter(t => {
          if (t.status === 'completed' || t.status === 'cancelled') return false
          const start = t.scheduledStart ? format(new Date(t.scheduledStart), 'yyyy-MM-dd') : null
          const dead = t.deadline ? format(new Date(t.deadline), 'yyyy-MM-dd') : null
          const created = t.createdAt ? format(new Date(t.createdAt), 'yyyy-MM-dd') : null
          return start === dayStr || dead === dayStr || (!start && !dead && created === dayStr)
        })

        const dayEvents = events.filter(e => {
          if (!e.startTime) return false
          try {
            return format(new Date(e.startTime), 'yyyy-MM-dd') === dayStr
          } catch {
            return false
          }
        })

        let taskMins = 0
        dayTasks.forEach(t => {
          taskMins += Number(t.estimatedMinutes) || 45
        })

        let eventMins = 0
        dayEvents.forEach(e => {
          try {
            const s = new Date(e.startTime).getTime()
            const end = new Date(e.endTime).getTime()
            const diff = (end - s) / (1000 * 60)
            if (diff > 0) eventMins += diff
          } catch {}
        })

        const totalMins = taskMins + eventMins
        const isOverloaded = totalMins >= 330 // >= 5.5 hours

        // Check for time overlap
        let hasConflicts = false
        const timeRanges = dayEvents.map(e => ({
          start: new Date(e.startTime).getTime(),
          end: new Date(e.endTime).getTime(),
        }))
        for (let i = 0; i < timeRanges.length; i++) {
          for (let j = i + 1; j < timeRanges.length; j++) {
            if (timeRanges[i].start < timeRanges[j].end && timeRanges[j].start < timeRanges[i].end) {
              hasConflicts = true
              break
            }
          }
        }

        // Identify low / medium priority tasks that can be safely rescheduled
        const moveable = dayTasks
          .filter(t => t.priority === 'low' || t.priority === 'medium')
          .map(t => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            estimatedMinutes: t.estimatedMinutes || 45,
          }))

        setAnalysis({
          totalMinutes: totalMins,
          taskCount: dayTasks.length,
          eventCount: dayEvents.length,
          isOverloaded,
          hasConflicts,
          moveableTasks: moveable,
        })

        // Pre-select non-urgent tasks to move
        setSelectedTaskIdsToMove(moveable.slice(0, 3).map(t => t.id))
      } catch (e) {
        console.error('Failed to run overload analysis', e)
      }
    }

    runAnalysis()
  }, [isOpen, dayStr])

  const toggleTaskSelection = (id: string) => {
    setSelectedTaskIdsToMove(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleApplyOptimization = async () => {
    if (selectedTaskIdsToMove.length === 0) {
      onClose()
      return
    }

    setIsApplying(true)
    try {
      const tomorrowIso = tomorrowDate.toISOString()

      // Update selected tasks to tomorrow
      for (const taskId of selectedTaskIdsToMove) {
        await localDb.tasks.update(taskId, {
          scheduledStart: tomorrowIso,
          deadline: tomorrowIso,
          postponeCount: 1,
        })
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('srushti_data_changed'))
      }

      if (onScheduleOptimized) onScheduleOptimized()
      onClose()
    } catch (e) {
      console.error('Failed to apply schedule optimization', e)
    } finally {
      setIsApplying(false)
    }
  }

  if (!isOpen) return null

  const hours = analysis ? Math.floor(analysis.totalMinutes / 60) : 0
  const remainingMins = analysis ? analysis.totalMinutes % 60 : 0
  const savedMinutes = analysis
    ? analysis.moveableTasks
        .filter(t => selectedTaskIdsToMove.includes(t.id))
        .reduce((sum, t) => sum + t.estimatedMinutes, 0)
    : 0

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="optimizer-modal fade-in-up">
        {/* Header */}
        <div className="optimizer-modal-header">
          <div className="optimizer-title-row">
            <span className="optimizer-icon">⚡</span>
            <div>
              <div className="optimizer-title">Schedule Optimizer</div>
              <div className="optimizer-subtitle">{format(selectedDate, 'EEEE, MMMM d')}</div>
            </div>
          </div>
          <button className="focus-icon-btn" onClick={onClose}>✕</button>
        </div>

        {/* Diagnosis Status Box */}
        <div className="optimizer-diagnosis-card">
          <div className="optimizer-stat-row">
            <div>
              <div className="optimizer-stat-label">Planned Load</div>
              <div className="optimizer-stat-val text-amber">
                {hours}h {remainingMins > 0 ? `${remainingMins}m` : ''}
              </div>
            </div>
            <div>
              <div className="optimizer-stat-label">Safe Target</div>
              <div className="optimizer-stat-val text-emerald">≤ 5h 00m</div>
            </div>
            <div>
              <div className="optimizer-stat-label">Conflicts</div>
              <div className="optimizer-stat-val">
                {analysis?.hasConflicts ? '⚠️ 1 Overlap' : 'None'}
              </div>
            </div>
          </div>

          <div className="optimizer-advice-text">
            {analysis?.isOverloaded ? (
              <span>
                Your day is booked with <strong>{analysis?.taskCount} tasks & {analysis?.eventCount} events</strong>. High cognitive fatigue is likely without workload adjustment.
              </span>
            ) : (
              <span>
                Your schedule is reasonably balanced, but Nexra can buffer your schedule for optimal retention and focus.
              </span>
            )}
          </div>
        </div>

        {/* Action Plan: Select Tasks to Defer */}
        {analysis && analysis.moveableTasks.length > 0 ? (
          <div className="optimizer-tasks-section">
            <div className="optimizer-section-label">
              <span>PROPOSED RESOLUTION</span>
              <span className="optimizer-saving-tag">Saves {savedMinutes} min</span>
            </div>
            <p className="optimizer-section-desc">
              Move these non-urgent tasks to <strong>{tomorrowStr}</strong> to keep today focused:
            </p>

            <div className="optimizer-tasks-list">
              {analysis.moveableTasks.map(task => {
                const isSelected = selectedTaskIdsToMove.includes(task.id)
                return (
                  <div
                    key={task.id}
                    className={`optimizer-task-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleTaskSelection(task.id)}
                  >
                    <div className="optimizer-checkbox">
                      {isSelected ? '✓' : ''}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="optimizer-task-name">{task.title}</div>
                      <div className="optimizer-task-meta">
                        <span className={`priority-tag ${task.priority}`}>{task.priority}</span>
                        <span>· {task.estimatedMinutes} mins</span>
                      </div>
                    </div>
                    <span className="optimizer-arrow-tag">→ Tomorrow</span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="optimizer-empty-box">
            <span>✨ All scheduled activities are high-priority. No non-urgent tasks to push.</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="optimizer-actions-row">
          <button className="btn btn-secondary btn-full" onClick={onClose} disabled={isApplying}>
            Keep As Is
          </button>
          <button
            className="btn btn-primary btn-full"
            onClick={handleApplyOptimization}
            disabled={isApplying || selectedTaskIdsToMove.length === 0}
            style={{
              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              fontWeight: 700,
            }}
          >
            {isApplying ? 'Optimizing...' : '✨ Accept Optimized Schedule'}
          </button>
        </div>
      </div>
    </>
  )
}
