'use client'

import { useState, useEffect, useRef } from 'react'
import { soundscapes } from '@/lib/audio/soundscapes'
import { localDb } from '@/lib/db/localDb'

interface FocusCompanionProps {
  isOpen: boolean
  onClose: () => void
  initialTaskId?: string
  initialTaskTitle?: string
  onTaskCompleted?: (taskId: string) => void
}

export default function FocusCompanionModal({
  isOpen,
  onClose,
  initialTaskId,
  initialTaskTitle,
  onTaskCompleted,
}: FocusCompanionProps) {
  const [mode, setMode] = useState<'focus' | 'break'>('focus')
  const [durationMinutes, setDurationMinutes] = useState<number>(25)
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(25 * 60)
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [sound, setSound] = useState<'none' | 'rain' | 'waves' | 'whitenoise'>('none')
  const [volume, setVolume] = useState<number>(50)
  const [taskTitle, setTaskTitle] = useState<string>(initialTaskTitle || 'Deep Focus Session')
  const [taskId, setTaskId] = useState<string | undefined>(initialTaskId)
  const [isMinimized, setIsMinimized] = useState<boolean>(false)
  const [availableTasks, setAvailableTasks] = useState<{ id: string; title: string }[]>([])

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (initialTaskTitle) setTaskTitle(initialTaskTitle)
    if (initialTaskId) setTaskId(initialTaskId)
  }, [initialTaskTitle, initialTaskId])

  // Load planned tasks from localDb so user can select from active tasks
  useEffect(() => {
    if (isOpen) {
      localDb.tasks
        .where('status')
        .equals('planned')
        .toArray()
        .then(tasks => setAvailableTasks(tasks.map(t => ({ id: t.id, title: t.title }))))
        .catch(() => {})
    }
  }, [isOpen])

  // Countdown timer logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeftSeconds(prev => {
          if (prev <= 1) {
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
  }, [isRunning, mode])

  const handleTimerComplete = () => {
    setIsRunning(false)
    soundscapes.playChime()

    if (mode === 'focus') {
      alert(`🎉 Focus session complete! Time for a refreshing 5-minute break.`)
      setMode('break')
      setTimeLeftSeconds(5 * 60)
    } else {
      alert(`🔔 Break finished! Ready to dive back in?`)
      setMode('focus')
      setTimeLeftSeconds(durationMinutes * 60)
    }
  }

  const togglePlay = () => {
    const willRun = !isRunning
    setIsRunning(willRun)
    if (willRun && sound !== 'none') {
      soundscapes.play(sound)
    } else if (!willRun) {
      soundscapes.stop()
    }
  }

  const handleSoundChange = (newSound: 'none' | 'rain' | 'waves' | 'whitenoise') => {
    setSound(newSound)
    if (isRunning) {
      soundscapes.play(newSound)
    }
  }

  const handleVolumeChange = (vol: number) => {
    setVolume(vol)
    soundscapes.setVolume(vol / 100)
  }

  const handleModeSwitch = (newMode: 'focus' | 'break', mins?: number) => {
    setIsRunning(false)
    soundscapes.stop()
    setMode(newMode)
    const m = mins || (newMode === 'focus' ? durationMinutes : 5)
    if (newMode === 'focus' && mins) setDurationMinutes(mins)
    setTimeLeftSeconds(m * 60)
  }

  const handleReset = () => {
    setIsRunning(false)
    soundscapes.stop()
    setTimeLeftSeconds((mode === 'focus' ? durationMinutes : 5) * 60)
  }

  const handleCompleteTask = async () => {
    soundscapes.playChime()
    if (taskId) {
      await localDb.tasks.update(taskId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
      }).catch(() => {})
      if (onTaskCompleted) onTaskCompleted(taskId)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('srushti_data_changed'))
      }
    }
    setIsRunning(false)
    soundscapes.stop()
    onClose()
  }

  const handleCloseAll = () => {
    setIsRunning(false)
    soundscapes.stop()
    setIsMinimized(false)
    onClose()
  }

  if (!isOpen) return null

  const minutes = Math.floor(timeLeftSeconds / 60)
  const seconds = timeLeftSeconds % 60
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  const totalSeconds = (mode === 'focus' ? durationMinutes : 5) * 60
  const progressPercent = Math.min(100, Math.max(0, ((totalSeconds - timeLeftSeconds) / totalSeconds) * 100))

  // Floating Dynamic Island / Pill Mode
  if (isMinimized) {
    return (
      <div
        className="focus-floating-pill fade-in-up"
        onClick={() => setIsMinimized(false)}
        title="Click to expand Focus Companion"
      >
        <div className={`focus-pill-pulse ${isRunning ? 'active' : ''}`} />
        <span className="focus-pill-time">{timeFormatted}</span>
        <span className="focus-pill-task">{taskTitle}</span>
        <button
          className="focus-pill-btn"
          onClick={(e) => {
            e.stopPropagation()
            togglePlay()
          }}
        >
          {isRunning ? '⏸' : '▶'}
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="sheet-overlay" onClick={() => setIsMinimized(true)} />
      <div className="focus-companion-modal fade-in-up">
        {/* Header Bar */}
        <div className="focus-modal-header">
          <div className="focus-mode-badge">
            <span>⏱️</span>
            <span>{mode === 'focus' ? 'Focus Mode' : 'Rest Break'}</span>
          </div>
          <div className="focus-header-actions">
            <button
              className="focus-icon-btn"
              onClick={() => setIsMinimized(true)}
              title="Minimize to floating pill"
            >
              ↙
            </button>
            <button
              className="focus-icon-btn"
              onClick={handleCloseAll}
              title="Close focus session"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Task Selector / Title */}
        <div className="focus-task-container">
          <label className="focus-task-label">CURRENT TASK</label>
          {availableTasks.length > 0 ? (
            <select
              className="focus-task-select"
              value={taskId || ''}
              onChange={(e) => {
                const selectedId = e.target.value
                setTaskId(selectedId)
                const found = availableTasks.find(t => t.id === selectedId)
                if (found) setTaskTitle(found.title)
              }}
            >
              {taskId && !availableTasks.some(t => t.id === taskId) && (
                <option value={taskId}>{taskTitle}</option>
              )}
              {availableTasks.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          ) : (
            <input
              className="focus-task-input"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="What are you focusing on?"
            />
          )}
        </div>

        {/* Mode & Duration Switcher */}
        <div className="focus-mode-pills">
          <button
            className={`focus-pill ${mode === 'focus' && durationMinutes === 25 ? 'active' : ''}`}
            onClick={() => handleModeSwitch('focus', 25)}
          >
            25m Focus
          </button>
          <button
            className={`focus-pill ${mode === 'focus' && durationMinutes === 45 ? 'active' : ''}`}
            onClick={() => handleModeSwitch('focus', 45)}
          >
            45m Deep
          </button>
          <button
            className={`focus-pill ${mode === 'focus' && durationMinutes === 60 ? 'active' : ''}`}
            onClick={() => handleModeSwitch('focus', 60)}
          >
            60m Ultra
          </button>
          <button
            className={`focus-pill ${mode === 'break' ? 'active' : ''}`}
            onClick={() => handleModeSwitch('break', 5)}
          >
            5m Break
          </button>
        </div>

        {/* Circular Countdown Display */}
        <div className="focus-timer-display">
          <div className="focus-circle-wrap">
            <svg className="focus-circle-svg" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r="88"
                className="focus-circle-bg"
              />
              <circle
                cx="100"
                cy="100"
                r="88"
                className="focus-circle-progress"
                strokeDasharray={2 * Math.PI * 88}
                strokeDashoffset={2 * Math.PI * 88 * (1 - progressPercent / 100)}
              />
            </svg>
            <div className="focus-circle-content">
              <div className="focus-countdown-time">{timeFormatted}</div>
              <div className="focus-countdown-sub">
                {isRunning ? (mode === 'focus' ? 'Stay in flow ⚡' : 'Relax & breathe 🍃') : 'Ready to start'}
              </div>
            </div>
          </div>
        </div>

        {/* Primary Controls */}
        <div className="focus-controls-row">
          <button
            className="focus-control-secondary"
            onClick={handleReset}
            title="Reset timer"
          >
            ↺
          </button>

          <button
            className={`focus-control-play ${isRunning ? 'running' : ''}`}
            onClick={togglePlay}
          >
            {isRunning ? 'Pause' : 'Start Focus'}
          </button>

          {taskId && (
            <button
              className="focus-control-secondary checkmark"
              onClick={handleCompleteTask}
              title="Mark task completed"
            >
              ✓
            </button>
          )}
        </div>

        {/* Ambient Soundscapes Selector */}
        <div className="focus-soundscapes-box">
          <div className="focus-soundscapes-title">
            <span>🎧 Offline Ambient Soundscape</span>
            <span className="focus-soundscapes-status">{sound === 'none' ? 'Muted' : sound.toUpperCase()}</span>
          </div>

          <div className="focus-sounds-grid">
            {[
              { id: 'none', label: 'Mute', icon: '🔇' },
              { id: 'rain', label: 'Rain', icon: '🌧️' },
              { id: 'waves', label: 'Waves', icon: '🌊' },
              { id: 'whitenoise', label: 'White Noise', icon: '☕' },
            ].map(s => (
              <button
                key={s.id}
                className={`focus-sound-chip ${sound === s.id ? 'active' : ''}`}
                onClick={() => handleSoundChange(s.id as any)}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          {sound !== 'none' && (
            <div className="focus-volume-row">
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Volume</span>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="focus-volume-slider"
              />
              <span style={{ fontSize: '11px', fontWeight: 700, minWidth: 28, color: 'var(--text-primary)' }}>
                {volume}%
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
