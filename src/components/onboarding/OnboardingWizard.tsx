'use client'

import { useState } from 'react'
import { generateInitialPlanFromOnboarding, type OnboardingAnswers } from '@/lib/ai/clientAi'

interface OnboardingWizardProps {
  onCompleted: () => void
}

export default function OnboardingWizard({ onCompleted }: OnboardingWizardProps) {
  const [step, setStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState('Initializing your assistant...')

  const [answers, setAnswers] = useState<OnboardingAnswers>({
    name: '',
    assistantName: '',
    role: '',
    mainGoals: '',
    dailyRoutine: {
      wakeTime: '07:00',
      sleepTime: '23:30',
      focusHours: 4,
    },
    habitsToBuild: '',
    upcomingDeadlines: '',
    aiTone: 'autonomous',
    apiKey: '',
  })

  const totalSteps = 8

  const handleNext = async () => {
    if (step < 7) {
      setStep(prev => prev + 1)
    } else if (step === 7) {
      // Transition to Step 8 (AI Generation)
      setStep(8)
      setIsGenerating(true)

      try {
        setGenerationStatus('Synthesizing your personal goals and milestones...')
        await new Promise(r => setTimeout(r, 600))

        setGenerationStatus('Scheduling your daily habits & focus routines...')
        await new Promise(r => setTimeout(r, 600))

        setGenerationStatus('Building initial high-priority tasks and timeline...')
        const res = await generateInitialPlanFromOnboarding(answers)

        setGenerationStatus(`✅ Created ${res.goalsCount} Goals, ${res.tasksCount} Tasks, ${res.habitsCount} Habits!`)
        await new Promise(r => setTimeout(r, 800))

        onCompleted()
      } catch (e: any) {
        console.error('Error generating plan:', e)
        setGenerationStatus('Finished setup! Welcome to Srushti.')
        setTimeout(() => onCompleted(), 1000)
      } finally {
        setIsGenerating(false)
      }
    }
  }

  const handlePrev = () => {
    if (step > 1 && !isGenerating) {
      setStep(prev => prev - 1)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--bg-base)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-5)',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-2xl)',
          padding: 'var(--space-6)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Progress Bar & Header */}
        {step <= 7 && (
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Setup Srushti · Step {step} of {totalSteps}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)' }}>
                {Math.round((step / totalSteps) * 100)}%
              </span>
            </div>
            <div style={{ width: '100%', height: 6, background: 'var(--bg-muted)', borderRadius: 3, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${(step / totalSteps) * 100}%`,
                  background: 'linear-gradient(90deg, var(--brand-primary), var(--brand-purple))',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* ── STEP 1: IDENTITY & NAME ───────────────────────────── */}
        {step === 1 && (
          <div className="fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 36 }}>🌱</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Welcome to Srushti AI
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Your proactive personal assistant and life operating system. What should Srushti call you?
            </p>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Your Name
              </label>
              <input
                type="text"
                className="input"
                value={answers.name}
                onChange={e => setAnswers({ ...answers, name: e.target.value })}
                placeholder="e.g. Sanket"
                style={{ width: '100%', fontSize: '15px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Name Your AI Assistant (Default: Srushti)
              </label>
              <input
                type="text"
                className="input"
                value={answers.assistantName || ''}
                onChange={e => setAnswers({ ...answers, assistantName: e.target.value })}
                placeholder="e.g. Srushti, Jarvis, Friday, Maya..."
                style={{ width: '100%', fontSize: '15px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Your Primary Role / Profession
              </label>
              <input
                type="text"
                className="input"
                value={answers.role}
                onChange={e => setAnswers({ ...answers, role: e.target.value })}
                placeholder="e.g. Student, Developer, Founder"
                style={{ width: '100%', fontSize: '15px' }}
              />
            </div>
          </div>
        )}

        {/* ── STEP 2: MAIN GOALS & AIMS ─────────────────────────── */}
        {step === 2 && (
          <div className="fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 36 }}>🎯</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              What are your biggest goals?
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              List your top 2-3 aims for this month or year. Srushti will break them into actionable milestones.
            </p>
            <textarea
              className="input"
              rows={3}
              value={answers.mainGoals}
              onChange={e => setAnswers({ ...answers, mainGoals: e.target.value })}
              placeholder="e.g. Master Machine Learning Architecture, Crack Semester Exams, Launch My App"
              style={{ width: '100%', fontSize: '14px', resize: 'none' }}
            />
          </div>
        )}

        {/* ── STEP 3: DAILY ROUTINE ─────────────────────────────── */}
        {step === 3 && (
          <div className="fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 36 }}>⏰</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Your Daily Routine & Focus
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Helps Srushti schedule focus blocks and morning briefings around your natural clock.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Wake Up Time
                </label>
                <input
                  type="time"
                  className="input"
                  value={answers.dailyRoutine.wakeTime}
                  onChange={e => setAnswers({
                    ...answers,
                    dailyRoutine: { ...answers.dailyRoutine, wakeTime: e.target.value }
                  })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Sleep Time
                </label>
                <input
                  type="time"
                  className="input"
                  value={answers.dailyRoutine.sleepTime}
                  onChange={e => setAnswers({
                    ...answers,
                    dailyRoutine: { ...answers.dailyRoutine, sleepTime: e.target.value }
                  })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Target Daily Deep Focus Hours ({answers.dailyRoutine.focusHours}h)
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={answers.dailyRoutine.focusHours}
                onChange={e => setAnswers({
                  ...answers,
                  dailyRoutine: { ...answers.dailyRoutine, focusHours: Number(e.target.value) }
                })}
                style={{ width: '100%', accentColor: 'var(--brand-primary)' }}
              />
            </div>
          </div>
        )}

        {/* ── STEP 4: HABITS TO BUILD ───────────────────────────── */}
        {step === 4 && (
          <div className="fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 36 }}>🔥</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Habits You Want to Build
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Enter 2-3 daily habits you want Srushti to track with streaks and accountability reminders.
            </p>
            <textarea
              className="input"
              rows={3}
              value={answers.habitsToBuild}
              onChange={e => setAnswers({ ...answers, habitsToBuild: e.target.value })}
              placeholder="e.g. Daily 45m Focus Sprint, Hydration 8 Glasses, 30m Reading"
              style={{ width: '100%', fontSize: '14px', resize: 'none' }}
            />
          </div>
        )}

        {/* ── STEP 5: UPCOMING DEADLINES / EXAMS ─────────────────── */}
        {step === 5 && (
          <div className="fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 36 }}>📅</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Upcoming Deadlines or Exams
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Any immediate exams, submissions, or important deadlines coming up?
            </p>
            <textarea
              className="input"
              rows={3}
              value={answers.upcomingDeadlines}
              onChange={e => setAnswers({ ...answers, upcomingDeadlines: e.target.value })}
              placeholder="e.g. CAO Exam on Friday, Project Alpha launch on the 28th"
              style={{ width: '100%', fontSize: '14px', resize: 'none' }}
            />
          </div>
        )}

        {/* ── STEP 6: ASSISTANT TONE & AUTONOMY ─────────────────── */}
        {step === 6 && (
          <div className="fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 36 }}>⚡</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              AI Assistant Persona & Autonomy
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { id: 'autonomous', title: 'Autonomous PA (Recommended)', desc: 'Proactively adjusts schedule, creates focus blocks, and tracks milestones.' },
                { id: 'balanced', title: 'Balanced Co-Pilot', desc: 'Suggests changes and asks for quick confirmation before updating.' },
                { id: 'strict', title: 'Strict Discipline Coach', desc: 'Holds you strictly accountable and enforces study deadlines.' },
              ].map(opt => (
                <div
                  key={opt.id}
                  onClick={() => setAnswers({ ...answers, aiTone: opt.id })}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-lg)',
                    border: `1.5px solid ${answers.aiTone === opt.id ? 'var(--brand-primary)' : 'var(--border-subtle)'}`,
                    background: answers.aiTone === opt.id ? 'var(--brand-primary-light, rgba(91, 107, 240, 0.08))' : 'var(--bg-subtle)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{opt.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 2 }}>{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 7: GEMINI API KEY ────────────────────────────── */}
        {step === 7 && (
          <div className="fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 36 }}>🔑</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Google Gemini API Key
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Your API key is saved locally in your phone&apos;s internal storage and enables real-time AI tool execution.
            </p>
            <input
              type="password"
              className="input"
              value={answers.apiKey || ''}
              onChange={e => setAnswers({ ...answers, apiKey: e.target.value })}
              placeholder="AIzaSy..."
              style={{ width: '100%', fontSize: '14px' }}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              You can also add or change your API key anytime later in Settings ⚙️.
            </div>
          </div>
        )}

        {/* ── STEP 8: LIVE AI GENERATION ────────────────────────── */}
        {step === 8 && (
          <div className="fade-in-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 'var(--space-6) 0', gap: 16 }}>
            <div style={{ fontSize: 48, animation: 'bounce 1.5s infinite' }}>🌱</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Srushti is Building Your Life OS
            </h2>
            <div style={{ fontSize: '14px', color: 'var(--brand-primary)', fontWeight: 600 }}>
              {generationStatus}
            </div>
            <div className="ai-wave-container" style={{ marginTop: 12 }}>
              <div className="ai-wave-bar" />
              <div className="ai-wave-bar" />
              <div className="ai-wave-bar" />
              <div className="ai-wave-bar" />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {step <= 7 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-6)' }}>
            {step > 1 ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handlePrev}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                ← Back
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNext}
              style={{ padding: '10px 22px', fontSize: '14px', fontWeight: 700 }}
            >
              {step === 7 ? '✨ Construct Life OS' : 'Continue →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
