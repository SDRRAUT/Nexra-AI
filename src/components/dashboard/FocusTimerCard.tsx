'use client'

import { useState, useEffect, useRef } from 'react'
import { localDb } from '@/lib/db/localDb'
import { sendNativeNotification } from '@/lib/notifications/native'

interface FocusTimerProps {
  tasks: Array<{ id: string; title: string; status: string }>
}

export default function FocusTimerCard({ tasks }: FocusTimerProps) {
  const [durationMinutes, setDurationMinutes] = useState(25)
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60)
  const [isActive, setIsActive] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')
  const [completedSessions, setCompletedSessions] = useState(0)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const totalSeconds = durationMinutes * 60

  useEffect(() => {
    // Select first pending task by default if available
    const pending = tasks.find(t => t.status === 'pending' || t.status === 'in_progress')
    if (pending && !selectedTaskId) {
      setSelectedTaskId(pending.id)
    }
  }, [tasks, selectedTaskId])

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!)
            setIsActive(false)
            handleTimerComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isActive, durationMinutes, selectedTaskId])

  const handleTimerComplete = async () => {
    setCompletedSessions(p => p + 1)

    // 1. Send native completion alarm notification
    sendNativeNotification({
      title: '🎯 Focus Block Completed!',
      body: `Awesome job! You finished your ${durationMinutes}-minute focus session. Take a 5-minute break.`,
    })

    // 2. Play completion audio chime if supported
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime) // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15) // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + 0.6)
    } catch {}

    // 3. Mark task as in progress or prompt complete
    if (selectedTaskId) {
      const task = await localDb.tasks.get(selectedTaskId).catch(() => null)
      if (task) {
        await localDb.tasks.update(selectedTaskId, {
          status: 'in_progress',
        }).catch(() => {})
        window.dispatchEvent(new CustomEvent('srushti_data_changed'))
      }
    }
  }

  const toggleTimer = () => {
    setIsActive(!isActive)
  }

  const resetTimer = () => {
    setIsActive(false)
    setSecondsRemaining(durationMinutes * 60)
  }

  const setTime = (mins: number) => {
    setIsActive(false)
    setDurationMinutes(mins)
    setSecondsRemaining(mins * 60)
  }

  const minutes = Math.floor(secondsRemaining / 60)
  const seconds = secondsRemaining % 60
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const progressPercent = ((totalSeconds - secondsRemaining) / totalSeconds) * 100
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference

  return (
    <div
      className="card fade-in-up"
      style={{
        padding: 'var(--space-4) var(--space-5)',
        background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-subtle))',
        border: '1px solid var(--border-default)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>⏱️</span>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Focus & Pomodoro Flow
          </span>
        </div>
        {completedSessions > 0 && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(16, 185, 129, 0.12)',
              color: 'var(--status-success)',
            }}
          >
            🔥 {completedSessions} Block{completedSessions > 1 ? 's' : ''} Done
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
        {/* Left: Radial Circular Timer */}
        <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
          <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="var(--bg-muted)"
              strokeWidth="7"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={isActive ? 'var(--brand-primary)' : 'var(--text-tertiary)'}
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.3s ease' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {formattedTime}
            </span>
            <span style={{ fontSize: '9px', fontWeight: 600, color: isActive ? 'var(--brand-primary)' : 'var(--text-tertiary)', textTransform: 'uppercase' }}>
              {isActive ? 'FOCUSING' : 'PAUSED'}
            </span>
          </div>
        </div>

        {/* Right: Task Target & Controls */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Target Task selector */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)' }}>Target Task</label>
            <select
              value={selectedTaskId}
              onChange={e => setSelectedTaskId(e.target.value)}
              style={{
                width: '100%',
                marginTop: 2,
                padding: '5px 8px',
                fontSize: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
            >
              <option value="">🎯 Deep Focus (General)</option>
              {tasks.filter(t => t.status !== 'completed').map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          {/* Quick preset durations */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[15, 25, 45].map(mins => (
              <button
                key={mins}
                onClick={() => setTime(mins)}
                style={{
                  flex: 1,
                  padding: '3px 0',
                  fontSize: '11px',
                  fontWeight: durationMinutes === mins ? 700 : 500,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid',
                  borderColor: durationMinutes === mins ? 'var(--brand-primary)' : 'var(--border-default)',
                  background: durationMinutes === mins ? 'rgba(91,107,240,0.12)' : 'transparent',
                  color: durationMinutes === mins ? 'var(--brand-primary)' : 'var(--text-tertiary)',
                  cursor: 'pointer',
                }}
              >
                {mins}m
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
            <button
              onClick={toggleTimer}
              style={{
                flex: 1,
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'var(--status-error, #EF4444)' : 'var(--brand-primary)',
                color: 'white',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                boxShadow: isActive ? '0 2px 8px rgba(239,68,68,0.3)' : '0 2px 8px rgba(91,107,240,0.3)',
              }}
            >
              <span>{isActive ? '⏸️ Pause' : '▶️ Start'}</span>
            </button>
            <button
              onClick={resetTimer}
              style={{
                padding: '6px 10px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-muted)',
                color: 'var(--text-secondary)',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Reset"
            >
              🔄
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
