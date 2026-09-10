'use client'

import { useState, useEffect, useRef } from 'react'
import { localDb } from '@/lib/db/localDb'
import { sendNativeNotification } from '@/lib/notifications/native'

interface FocusTimerProps {
  tasks: Array<{ id: string; title: string; status: string }>
}

export default function FocusTimerCard({ tasks }: FocusTimerProps) {
  const [mode, setMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus')
  const [durationMinutes, setDurationMinutes] = useState(25)
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60)
  const [isActive, setIsActive] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')
  const [completedSessions, setCompletedSessions] = useState(0)

  const selectedTask = tasks.find(t => t.id === selectedTaskId)
  const selectedTaskTitle = selectedTask ? selectedTask.title : 'Deep Focus (General)'

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const totalSeconds = durationMinutes * 60

  useEffect(() => {
    // Select first pending task by default if available
    const pending = tasks.find(t => t.status === 'pending' || t.status === 'in_progress' || t.status === 'planned')
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
  }, [isActive, durationMinutes, selectedTaskId, mode])

  const handleTimerComplete = async () => {
    if (mode === 'focus') {
      setCompletedSessions(p => p + 1)
      sendNativeNotification({
        title: '🎯 Focus Session Complete!',
        body: `Great work! You finished your ${durationMinutes}-minute focus block. Time for a short break.`,
      })
    } else {
      sendNativeNotification({
        title: '☕ Break Over!',
        body: `Feeling refreshed? Let's get back into the focus flow.`,
      })
    }

    // Play completion chime
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(mode === 'focus' ? 587.33 : 440, audioCtx.currentTime)
      osc.frequency.setValueAtTime(mode === 'focus' ? 880 : 659.25, audioCtx.currentTime + 0.15)
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + 0.6)
    } catch {}

    // Update task in progress
    if (mode === 'focus' && selectedTaskId) {
      const task = await localDb.tasks.get(selectedTaskId).catch(() => null)
      if (task) {
        await localDb.tasks.update(selectedTaskId, {
          status: 'in_progress',
        }).catch(() => {})
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('srushti_data_changed'))
        }
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

  const switchMode = (newMode: 'focus' | 'shortBreak' | 'longBreak') => {
    setIsActive(false)
    setMode(newMode)
    let mins = 25
    if (newMode === 'shortBreak') mins = 5
    if (newMode === 'longBreak') mins = 15
    setDurationMinutes(mins)
    setSecondsRemaining(mins * 60)
  }

  const setCustomMinutes = (mins: number) => {
    setIsActive(false)
    setDurationMinutes(mins)
    setSecondsRemaining(mins * 60)
  }

  const minutes = Math.floor(secondsRemaining / 60)
  const seconds = secondsRemaining % 60
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const progressPercent = totalSeconds > 0 ? ((totalSeconds - secondsRemaining) / totalSeconds) * 100 : 0
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference

  const isBreak = mode !== 'focus'
  const activeColor = isBreak ? '#10B981' : '#6366F1'

  return (
    <div
      className="card fade-in-up"
      style={{
        padding: '16px 18px',
        background: 'linear-gradient(145deg, #FFFFFF 0%, #F8FAFC 100%)',
        border: '1.5px solid rgba(226, 232, 240, 0.85)',
        boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.07), 0 2px 6px rgba(0, 0, 0, 0.02)',
        borderRadius: 22,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle background ambient aura when active */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            top: -40,
            left: -40,
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: isBreak
              ? 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
            filter: 'blur(12px)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ── HEADER & SLEEK MODE SWITCHER ─────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              background: isBreak ? 'rgba(16, 185, 129, 0.12)' : 'rgba(99, 102, 241, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
            }}
          >
            {isBreak ? '☕' : '⚡'}
          </div>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
            Focus Flow
          </span>
          {isActive && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: activeColor,
                display: 'inline-block',
                boxShadow: `0 0 8px ${activeColor}`,
                animation: 'pulse 1.5s infinite',
              }}
            />
          )}
        </div>

        {/* Minimalist Segmented Pill Toggle */}
        <div
          style={{
            display: 'flex',
            background: '#F1F5F9',
            borderRadius: 999,
            padding: 3,
            border: '1px solid #E2E8F0',
          }}
        >
          <button
            type="button"
            onClick={() => switchMode('focus')}
            style={{
              padding: '4px 12px',
              borderRadius: 999,
              fontSize: '11.5px',
              fontWeight: mode === 'focus' ? 800 : 600,
              border: 'none',
              background: mode === 'focus' ? '#FFFFFF' : 'transparent',
              color: mode === 'focus' ? '#0F172A' : '#64748B',
              boxShadow: mode === 'focus' ? '0 2px 6px rgba(0, 0, 0, 0.06)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Focus
          </button>
          <button
            type="button"
            onClick={() => switchMode('shortBreak')}
            style={{
              padding: '4px 12px',
              borderRadius: 999,
              fontSize: '11.5px',
              fontWeight: mode === 'shortBreak' ? 800 : 600,
              border: 'none',
              background: mode === 'shortBreak' ? '#FFFFFF' : 'transparent',
              color: mode === 'shortBreak' ? '#059669' : '#64748B',
              boxShadow: mode === 'shortBreak' ? '0 2px 6px rgba(0, 0, 0, 0.06)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Break
          </button>
        </div>
      </div>

      {/* ── MAIN BODY: RADIAL DIAL + CONTROLS ─────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        {/* Left: Modern Glowing Radial Dial */}
        <div style={{ position: 'relative', width: 108, height: 108, flexShrink: 0 }}>
          <svg width="108" height="108" viewBox="0 0 108 108" style={{ transform: 'rotate(-90deg)' }}>
            <defs>
              <linearGradient id="focusGradModern" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="60%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
              <linearGradient id="breakGradModern" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>
            </defs>

            {/* Background Track */}
            <circle
              cx="54"
              cy="54"
              r={radius}
              fill="none"
              stroke="#F1F5F9"
              strokeWidth="5.5"
            />

            {/* Glowing Active Progress Stroke */}
            <circle
              cx="54"
              cy="54"
              r={radius}
              fill="none"
              stroke={isBreak ? 'url(#breakGradModern)' : 'url(#focusGradModern)'}
              strokeWidth="5.5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 0.5s linear, stroke 0.3s ease',
                filter: isActive
                  ? isBreak
                    ? 'drop-shadow(0 0 5px rgba(16, 185, 129, 0.45))'
                    : 'drop-shadow(0 0 5px rgba(99, 102, 241, 0.45))'
                  : 'none',
              }}
            />
          </svg>

          {/* Center Digital Clock Display */}
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
            <span
              style={{
                fontFamily: 'var(--font-display, "Outfit", sans-serif)',
                fontSize: '23px',
                fontWeight: 800,
                letterSpacing: '-0.5px',
                color: '#0F172A',
                lineHeight: 1,
              }}
            >
              {formattedTime}
            </span>

            <div style={{ marginTop: 5 }}>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 999,
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  background: isActive
                    ? isBreak
                      ? 'rgba(16, 185, 129, 0.12)'
                      : 'rgba(99, 102, 241, 0.12)'
                    : '#F1F5F9',
                  color: isActive
                    ? isBreak
                      ? '#059669'
                      : '#4F46E5'
                    : '#64748B',
                }}
              >
                {isActive ? (isBreak ? 'Resting' : 'In Flow') : 'Paused'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Modern Task Target & Action Controls */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          {/* Target Task Selector Pill */}
          <div style={{ position: 'relative', width: '100%', minWidth: 0 }}>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                background: '#F8FAFC',
                border: '1.5px solid #E2E8F0',
                borderRadius: 12,
                padding: '0 26px 0 10px',
                height: 35,
                width: '100%',
                minWidth: 0,
                boxSizing: 'border-box',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: '12px', marginRight: 6, flexShrink: 0 }}>🎯</span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: '#0F172A',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {selectedTaskTitle}
              </span>
              <select
                value={selectedTaskId}
                onChange={e => setSelectedTaskId(e.target.value)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                }}
              >
                <option value="">Deep Focus (General)</option>
                {tasks.filter(t => t.status !== 'completed').map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94A3B8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ position: 'absolute', right: 10, pointerEvents: 'none' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>

          {/* Quick Preset Duration Chips */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {[15, 25, 45].map(mins => {
              const isSelected = durationMinutes === mins
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setCustomMinutes(mins)}
                  style={{
                    padding: '5px 0',
                    borderRadius: 10,
                    fontSize: '11.5px',
                    fontWeight: isSelected ? 800 : 600,
                    border: isSelected ? '1.5px solid #6366F1' : '1.5px solid #E2E8F0',
                    background: isSelected ? 'linear-gradient(135deg, #EEF2FF, #E0E7FF)' : '#FFFFFF',
                    color: isSelected ? '#4338CA' : '#64748B',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 2px 8px rgba(99, 102, 241, 0.15)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {mins}m
                </button>
              )
            })}
          </div>

          {/* Primary Action Button & Reset */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={toggleTimer}
              style={{
                flex: 1,
                height: 38,
                borderRadius: 999,
                background: isActive
                  ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                  : isBreak
                  ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #6366F1 0%, #4F46E5 50%, #4338CA 100%)',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: isActive
                  ? '0 6px 16px rgba(245, 158, 11, 0.28)'
                  : isBreak
                  ? '0 6px 16px rgba(16, 185, 129, 0.28)'
                  : '0 6px 16px rgba(99, 102, 241, 0.28)',
                transition: 'all 0.2s ease',
              }}
            >
              {isActive ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1.5" />
                    <rect x="14" y="4" width="4" height="16" rx="1.5" />
                  </svg>
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>Start Flow</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={resetTimer}
              style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                background: '#F8FAFC',
                border: '1.5px solid #E2E8F0',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
              title="Reset Timer"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Completed Sessions Streak Footer */}
      {completedSessions > 0 && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
            Session Progress
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '2px 9px',
              borderRadius: 999,
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#059669',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            🔥 {completedSessions} Block{completedSessions > 1 ? 's' : ''} Finished
          </span>
        </div>
      )}
    </div>
  )
}
