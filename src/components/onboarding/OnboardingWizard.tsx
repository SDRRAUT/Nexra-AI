'use client'

import { useState } from 'react'
import { generateInitialPlanFromOnboarding, type OnboardingAnswers } from '@/lib/ai/clientAi'

interface OnboardingWizardProps {
  onCompleted: () => void
}

function parse24To12(time24: string) {
  const [hStr, mStr] = (time24 || '07:00').split(':')
  let h = parseInt(hStr, 10) || 7
  const m = mStr || '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  const hour12 = h < 10 ? `0${h}` : `${h}`
  return { hour12, minute: m, ampm: ampm as 'AM' | 'PM' }
}

function format12To24(hour12: string, minute: string, ampm: 'AM' | 'PM') {
  let h = parseInt(hour12, 10) || 7
  if (ampm === 'PM' && h < 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  const hStr = h < 10 ? `0${h}` : `${h}`
  return `${hStr}:${minute}`
}

export default function OnboardingWizard({ onCompleted }: OnboardingWizardProps) {
  const [step, setStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState('Initializing your personal assistant...')
  const [validationError, setValidationError] = useState<string | null>(null)

  const [answers, setAnswers] = useState<OnboardingAnswers>({
    name: '',
    assistantName: 'Nexra',
    role: 'Student',
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

  const totalSteps = 5

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(prev => prev + 1)
      setValidationError(null)
    } else if (step === totalSteps) {
      // Step 5 validation: Name, AI Name, and Main Goal are required!
      const missing: string[] = []
      if (!answers.name.trim()) missing.push('Your Name')
      if (!answers.assistantName?.trim()) missing.push('AI Name')
      if (!answers.mainGoals.trim()) missing.push('Target Goal / Mission')

      if (missing.length > 0) {
        setValidationError(`Please fill in ${missing.join(', ')} to continue!`)
        return
      }

      setValidationError(null)
      setIsGenerating(true)

      try {
        setGenerationStatus('Synthesizing your personalized goals and milestones...')
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
        setGenerationStatus('Finished setup! Welcome to your Personal Assistant.')
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
        width: '100vw',
        height: '100dvh',
        background: '#0F172A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* ── FULL-SCREEN APP FRAME (440PX MAX ON DESKTOP, 100% ON PHONES) ─────────────────── */}
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          height: '100%',
          maxHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          background: '#FFFFFF',
          overflowY: 'auto',
          overflowX: 'hidden',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
        }}
      >
        {/* ── GENERATING OVERLAY ─────────────────────────── */}
        {isGenerating ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 24px',
              textAlign: 'center',
              background: 'linear-gradient(180deg, #F8FAFC 0%, #EFF6FF 50%, #FAF5FF 100%)',
            }}
          >
            {/* Glowing Luminous Orb */}
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366F1, #EC4899, #8B5CF6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
                color: 'white',
                boxShadow: '0 0 45px rgba(99, 102, 241, 0.45)',
                marginBottom: 30,
                animation: 'pulse 2s infinite ease-in-out',
              }}
            >
              ✨
            </div>

            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 12px' }}>
              Setting Up Your Assistant
            </h2>

            <p style={{ fontSize: '15px', color: '#64748B', lineHeight: 1.6, margin: '0 0 32px', maxWidth: 320, minHeight: 48 }}>
              {generationStatus}
            </p>

            <div style={{ width: '240px', height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: '100%',
                  background: 'linear-gradient(90deg, #6366F1, #EC4899)',
                  animation: 'pulse 1.2s infinite',
                }}
              />
            </div>
          </div>
        ) : (
          <>
            {/* ── SLIDE 1: SMART AI COMPANION ─────────────────────────── */}
            {step === 1 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }} className="fade-in-up">
                {/* Visual Top Half - Bleeds Edge to Edge into Background */}
                <div
                  style={{
                    height: '54dvh',
                    minHeight: 330,
                    width: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    background: '#EDE9FE',
                  }}
                >
                  <img
                    src="/onboarding/slide1.jpg"
                    alt="Smart AI Companion"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center 35%',
                      maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,0) 100%)',
                      WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,0) 100%)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      left: 0,
                      right: 0,
                      height: 120,
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 30%, rgba(255,255,255,0.9) 75%, #FFFFFF 100%)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>

                {/* Content Area */}
                <div style={{ padding: '0 28px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 999, background: 'rgba(236, 72, 153, 0.1)', color: '#DB2777', fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>
                    <span>✨</span> Smart AI Companion
                  </div>

                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 800, color: '#0F172A', margin: '0 0 10px', lineHeight: 1.25, letterSpacing: '-0.5px' }}>
                    Suggestions That Speak Like You
                  </h1>

                  <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.5, margin: 0, maxWidth: 330 }}>
                    Smart suggestions help you organize tasks, break down complex goals, and take action without overthinking.
                  </p>
                </div>
              </div>
            )}

            {/* ── SLIDE 2: UNIFIED SCHEDULE & HABITS ─────────────────────────── */}
            {step === 2 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }} className="fade-in-up">
                {/* Visual Top Half - Bleeds Edge to Edge into Background */}
                <div
                  style={{
                    height: '54dvh',
                    minHeight: 330,
                    width: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    background: '#E0F2FE',
                  }}
                >
                  <img
                    src="/onboarding/slide2.jpg"
                    alt="Unified Schedule"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center 40%',
                      maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,0) 100%)',
                      WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,0) 100%)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      left: 0,
                      right: 0,
                      height: 120,
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 30%, rgba(255,255,255,0.9) 75%, #FFFFFF 100%)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>

                {/* Content Area */}
                <div style={{ padding: '0 28px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 999, background: 'rgba(59, 130, 246, 0.1)', color: '#2563EB', fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>
                    <span>📅</span> Unified Schedule
                  </div>

                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 800, color: '#0F172A', margin: '0 0 10px', lineHeight: 1.25, letterSpacing: '-0.5px' }}>
                    Tasks & Habits in One Flow
                  </h1>

                  <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.5, margin: 0, maxWidth: 330 }}>
                    Every commitment, exam deadline, and daily habit streak synchronizes seamlessly into your visual calendar.
                  </p>
                </div>
              </div>
            )}

            {/* ── SLIDE 3: PROACTIVE ALERTS & NUDGES ─────────────────────────── */}
            {step === 3 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }} className="fade-in-up">
                {/* Visual Top Half - Bleeds Edge to Edge into Background */}
                <div
                  style={{
                    height: '54dvh',
                    minHeight: 330,
                    width: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    background: '#FDE68A',
                  }}
                >
                  <img
                    src="/onboarding/slide3.jpg"
                    alt="Proactive Alerts"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center 42%',
                      maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,0) 100%)',
                      WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,0) 100%)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      left: 0,
                      right: 0,
                      height: 120,
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 30%, rgba(255,255,255,0.9) 75%, #FFFFFF 100%)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>

                {/* Content Area */}
                <div style={{ padding: '0 28px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 999, background: 'rgba(245, 158, 11, 0.12)', color: '#D97706', fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>
                    <span>🔔</span> Proactive Alerts
                  </div>

                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 800, color: '#0F172A', margin: '0 0 10px', lineHeight: 1.25, letterSpacing: '-0.5px' }}>
                    Never Miss a Beat or Deadline
                  </h1>

                  <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.5, margin: 0, maxWidth: 330 }}>
                    Receive exact lockscreen sound alarms, morning briefings, and gentle accountability nudges on your phone.
                  </p>
                </div>
              </div>
            )}

            {/* ── SLIDE 4: BUILT BY TEAM SDR (SUPPORT & GRATITUDE) ─────────────────────────── */}
            {step === 4 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }} className="fade-in-up">
                {/* Visual Top Half - Bleeds Edge to Edge into Background */}
                <div
                  style={{
                    height: '54dvh',
                    minHeight: 330,
                    width: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    background: '#FDF2F8',
                  }}
                >
                  <img
                    src="/onboarding/slide4.jpg"
                    alt="Team SDR Support"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center 40%',
                      maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,0) 100%)',
                      WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,0) 100%)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      left: 0,
                      right: 0,
                      height: 120,
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 30%, rgba(255,255,255,0.9) 75%, #FFFFFF 100%)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>

                {/* Content Area */}
                <div style={{ padding: '0 24px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 12px',
                    borderRadius: 999,
                    background: 'rgba(236, 72, 153, 0.1)',
                    color: '#DB2777',
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    marginBottom: 6,
                  }}>
                    <span>❤️</span> Community &amp; Support
                  </div>

                  {/* HERO: TEAM SDR IN BIG HIGHLIGHTED TEXT */}
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '34px',
                    fontWeight: 900,
                    letterSpacing: '-0.5px',
                    lineHeight: 1.1,
                    background: 'linear-gradient(135deg, #E11D48 0%, #DB2777 30%, #7C3AED 70%, #4F46E5 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    margin: '0 0 6px',
                    textTransform: 'uppercase',
                    filter: 'drop-shadow(0 2px 8px rgba(236, 72, 153, 0.2))',
                  }}>
                    TEAM SDR
                  </div>

                  <h1 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '20px',
                    fontWeight: 800,
                    color: '#0F172A',
                    margin: '0 0 8px',
                    lineHeight: 1.25,
                    letterSpacing: '-0.3px',
                  }}>
                    Empowering You in Every Situation
                  </h1>

                  <p style={{
                    fontSize: '13.5px',
                    color: '#64748B',
                    lineHeight: 1.5,
                    margin: 0,
                    maxWidth: 340,
                  }}>
                    Team SDR supports people to overcome their situations and thrive. Thank you for using our app — keep supporting us!
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP 5: COMPLETE PROFILE & PREFERENCES (FINAL STEP · MANDATORY VALIDATION & MODERN CLOCK) ─────────────────────────── */}
            {step === 5 && (
              <div
                style={{
                  flex: 1,
                  padding: '20px 22px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 0,
                  overflowY: 'auto',
                  background: 'radial-gradient(ellipse at 50% 0%, rgba(99, 102, 241, 0.08) 0%, rgba(255, 255, 255, 0) 65%), #FFFFFF',
                }}
                className="fade-in-up"
              >
                {/* Modern Header with Luminous Avatar */}
                <div style={{ textAlign: 'center', flexShrink: 0, marginBottom: 6 }}>
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366F1, #8B5CF6, #EC4899)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      color: 'white',
                      margin: '0 auto 8px',
                      boxShadow: '0 8px 24px -4px rgba(99, 102, 241, 0.38)',
                      border: '3px solid #FFFFFF',
                    }}
                  >
                    ✨
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '3px 12px',
                      borderRadius: 999,
                      background: 'rgba(99, 102, 241, 0.08)',
                      color: '#4F46E5',
                      fontSize: '10.5px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px',
                      marginBottom: 4,
                    }}
                  >
                    Final Step · Instant Setup
                  </div>

                  <h1
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '23px',
                      fontWeight: 800,
                      color: '#0F172A',
                      margin: '0 0 2px',
                      letterSpacing: '-0.5px',
                    }}
                  >
                    Make It Yours
                  </h1>

                  <p style={{ fontSize: '13px', color: '#64748B', margin: 0, lineHeight: 1.35 }}>
                    Personalize your AI companion and daily schedule.
                  </p>
                </div>

                {/* Validation Warning Notice (if user tries to proceed without filling required fields) */}
                {validationError && (
                  <div
                    style={{
                      background: '#FEF2F2',
                      border: '1.5px solid #FCA5A5',
                      borderRadius: 12,
                      padding: '8px 12px',
                      color: '#B91C1C',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 8,
                      flexShrink: 0,
                    }}
                  >
                    <span>⚠️</span>
                    <span>{validationError}</span>
                  </div>
                )}

                {/* ── 4 SEPARATE BEAUTIFUL PASTEL LIGHT CARDS ── */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-evenly',
                    gap: 10,
                    margin: '4px 0',
                  }}
                >
                  {/* CARD 1: IDENTITY & COMPANION (Soft Sky Blue / Periwinkle) */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #F0F7FF 0%, #EEF2FF 100%)',
                      border: validationError && (!answers.name.trim() || !answers.assistantName?.trim()) ? '1.5px solid #FCA5A5' : '1.5px solid #DBEAFE',
                      borderRadius: 16,
                      padding: '10px 13px',
                      boxShadow: '0 3px 12px -2px rgba(99, 102, 241, 0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: '12px' }}>👤</span>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Profile & Assistant
                        </span>
                      </div>
                      <span style={{ fontSize: '9.5px', color: '#EF4444', fontWeight: 700 }}>* Required</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: '10px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 3 }}>
                          Your Name
                        </label>
                        <input
                          type="text"
                          value={answers.name}
                          onChange={e => {
                            setAnswers({ ...answers, name: e.target.value })
                            if (validationError) setValidationError(null)
                          }}
                          placeholder="e.g. Your Name"
                          style={{
                            width: '100%',
                            height: 38,
                            fontSize: '13px',
                            fontWeight: 500,
                            borderRadius: 10,
                            background: '#FFFFFF',
                            border: validationError && !answers.name.trim() ? '1.5px solid #EF4444' : '1.5px solid #BFDBFE',
                            padding: '0 10px',
                            color: '#0F172A',
                            outline: 'none',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit',
                            transition: 'all 0.2s ease',
                          }}
                          onFocus={e => {
                            e.currentTarget.style.borderColor = '#2563EB'
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.15)'
                          }}
                          onBlur={e => {
                            e.currentTarget.style.borderColor = validationError && !answers.name.trim() ? '#EF4444' : '#BFDBFE'
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                          autoFocus
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '10px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 3 }}>
                          AI Name <span style={{ fontWeight: 400, color: '#94A3B8' }}>(Nexra)</span>
                        </label>
                        <input
                          type="text"
                          value={answers.assistantName || ''}
                          onChange={e => {
                            setAnswers({ ...answers, assistantName: e.target.value })
                            if (validationError) setValidationError(null)
                          }}
                          placeholder="e.g. Nexra, Maya"
                          style={{
                            width: '100%',
                            height: 38,
                            fontSize: '13px',
                            fontWeight: 500,
                            borderRadius: 10,
                            background: '#FFFFFF',
                            border: validationError && !answers.assistantName?.trim() ? '1.5px solid #EF4444' : '1.5px solid #BFDBFE',
                            padding: '0 10px',
                            color: '#0F172A',
                            outline: 'none',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit',
                            transition: 'all 0.2s ease',
                          }}
                          onFocus={e => {
                            e.currentTarget.style.borderColor = '#2563EB'
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.15)'
                          }}
                          onBlur={e => {
                            e.currentTarget.style.borderColor = validationError && !answers.assistantName?.trim() ? '#EF4444' : '#BFDBFE'
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* CARD 2: PRIMARY FOCUS (Soft Lavender / Blush) */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #FAF5FF 0%, #FDF2F8 100%)',
                      border: '1.5px solid #F3E8FF',
                      borderRadius: 16,
                      padding: '10px 13px',
                      boxShadow: '0 3px 12px -2px rgba(168, 85, 247, 0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                      <span style={{ fontSize: '12px' }}>🎯</span>
                      <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Primary Focus Role
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {[
                        { label: 'Student', icon: '🎓' },
                        { label: 'Developer', icon: '💻' },
                        { label: 'Founder', icon: '🚀' },
                        { label: 'Pro', icon: '💼' },
                        { label: 'Creator', icon: '✨' },
                      ].map(item => {
                        const isSelected = answers.role === item.label
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => setAnswers({ ...answers, role: item.label })}
                            style={{
                              padding: '6px 11px',
                              borderRadius: 999,
                              fontSize: '12px',
                              fontWeight: isSelected ? 700 : 500,
                              border: isSelected ? '1.5px solid #7C3AED' : '1.5px solid #E9D5FF',
                              background: isSelected ? 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)' : '#FFFFFF',
                              color: isSelected ? '#FFFFFF' : '#475569',
                              cursor: 'pointer',
                              boxShadow: isSelected ? '0 4px 10px rgba(139, 92, 246, 0.25)' : 'none',
                              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* CARD 3: TARGET MISSION & GOAL (Soft Amber / Sunrise Cream) */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
                      border: validationError && !answers.mainGoals.trim() ? '1.5px solid #FCA5A5' : '1.5px solid #FDE68A',
                      borderRadius: 16,
                      padding: '10px 13px',
                      boxShadow: '0 3px 12px -2px rgba(245, 158, 11, 0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: '12px' }}>🚀</span>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Main Target Mission / Goal
                        </span>
                      </div>
                      <span style={{ fontSize: '9.5px', color: '#EF4444', fontWeight: 700 }}>* Required</span>
                    </div>

                    <input
                      type="text"
                      value={answers.mainGoals}
                      onChange={e => {
                        setAnswers({ ...answers, mainGoals: e.target.value })
                        if (validationError) setValidationError(null)
                      }}
                      placeholder="e.g. Master Machine Learning, Launch Startup"
                      style={{
                        width: '100%',
                        height: 38,
                        fontSize: '13px',
                        fontWeight: 500,
                        borderRadius: 10,
                        background: '#FFFFFF',
                        border: validationError && !answers.mainGoals.trim() ? '1.5px solid #EF4444' : '1.5px solid #FCD34D',
                        padding: '0 10px',
                        color: '#0F172A',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                        transition: 'all 0.2s ease',
                      }}
                      onFocus={e => {
                        e.currentTarget.style.borderColor = '#D97706'
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217, 119, 6, 0.15)'
                      }}
                      onBlur={e => {
                        e.currentTarget.style.borderColor = validationError && !answers.mainGoals.trim() ? '#EF4444' : '#FCD34D'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    />
                  </div>

                  {/* CARD 4: DAILY SCHEDULE RHYTHM (Soft Fresh Mint / Modern Digital Clock Selector) */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)',
                      border: '1.5px solid #A7F3D0',
                      borderRadius: 16,
                      padding: '10px 13px',
                      boxShadow: '0 3px 12px -2px rgba(16, 185, 129, 0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                      <span style={{ fontSize: '12px' }}>⏰</span>
                      <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Daily Routine Clock
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {/* Wake Up Modern Clock */}
                      {(() => {
                        const { hour12, minute, ampm } = parse24To12(answers.dailyRoutine.wakeTime)
                        return (
                          <div
                            style={{
                              background: '#FFFFFF',
                              border: '1.5px solid #FED7AA',
                              borderRadius: 12,
                              padding: '7px 8px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#D97706', display: 'flex', alignItems: 'center', gap: 3 }}>
                                ☀️ Wake
                              </span>
                              <span style={{ fontSize: '9px', color: '#B45309', fontWeight: 700, background: '#FFFBEB', padding: '1px 5px', borderRadius: 5 }}>
                                {hour12}:{minute} {ampm}
                              </span>
                            </div>

                            {/* Digital Time Pickers Row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                              <select
                                value={hour12}
                                onChange={e => {
                                  const newTime = format12To24(e.target.value, minute, ampm)
                                  setAnswers({ ...answers, dailyRoutine: { ...answers.dailyRoutine, wakeTime: newTime } })
                                }}
                                style={{
                                  background: '#FFFBEB',
                                  border: '1px solid #FDE68A',
                                  borderRadius: 7,
                                  padding: '2px 4px',
                                  fontSize: '13px',
                                  fontWeight: 800,
                                  color: '#92400E',
                                  cursor: 'pointer',
                                  outline: 'none',
                                  fontFamily: 'inherit',
                                }}
                              >
                                {['01','02','03','04','05','06','07','08','09','10','11','12'].map(h => (
                                  <option key={h} value={h}>{h}</option>
                                ))}
                              </select>

                              <span style={{ fontWeight: 800, color: '#D97706', fontSize: '12px' }}>:</span>

                              <select
                                value={minute}
                                onChange={e => {
                                  const newTime = format12To24(hour12, e.target.value, ampm)
                                  setAnswers({ ...answers, dailyRoutine: { ...answers.dailyRoutine, wakeTime: newTime } })
                                }}
                                style={{
                                  background: '#FFFBEB',
                                  border: '1px solid #FDE68A',
                                  borderRadius: 7,
                                  padding: '2px 4px',
                                  fontSize: '13px',
                                  fontWeight: 800,
                                  color: '#92400E',
                                  cursor: 'pointer',
                                  outline: 'none',
                                  fontFamily: 'inherit',
                                }}
                              >
                                {['00','15','30','45'].map(m => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                              </select>

                              <button
                                type="button"
                                onClick={() => {
                                  const newAmpm = ampm === 'AM' ? 'PM' : 'AM'
                                  const newTime = format12To24(hour12, minute, newAmpm)
                                  setAnswers({ ...answers, dailyRoutine: { ...answers.dailyRoutine, wakeTime: newTime } })
                                }}
                                style={{
                                  padding: '3px 6px',
                                  borderRadius: 6,
                                  background: '#D97706',
                                  color: '#FFFFFF',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                {ampm}
                              </button>
                            </div>

                            {/* Quick Presets */}
                            <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                              {[
                                { label: '6:30', val: '06:30' },
                                { label: '7:00', val: '07:00' },
                                { label: '8:00', val: '08:00' },
                              ].map(p => (
                                <button
                                  key={p.val}
                                  type="button"
                                  onClick={() => setAnswers({ ...answers, dailyRoutine: { ...answers.dailyRoutine, wakeTime: p.val } })}
                                  style={{
                                    fontSize: '9px',
                                    fontWeight: answers.dailyRoutine.wakeTime === p.val ? 800 : 500,
                                    padding: '2px 5px',
                                    borderRadius: 5,
                                    border: answers.dailyRoutine.wakeTime === p.val ? '1px solid #D97706' : '1px solid #FEF3C7',
                                    background: answers.dailyRoutine.wakeTime === p.val ? '#FEF3C7' : '#FFFFFF',
                                    color: '#B45309',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })()}

                      {/* Bed Time Modern Clock */}
                      {(() => {
                        const { hour12, minute, ampm } = parse24To12(answers.dailyRoutine.sleepTime)
                        return (
                          <div
                            style={{
                              background: '#FFFFFF',
                              border: '1.5px solid #C7D2FE',
                              borderRadius: 12,
                              padding: '7px 8px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#4F46E5', display: 'flex', alignItems: 'center', gap: 3 }}>
                                🌙 Bed
                              </span>
                              <span style={{ fontSize: '9px', color: '#4338CA', fontWeight: 700, background: '#EEF2FF', padding: '1px 5px', borderRadius: 5 }}>
                                {hour12}:{minute} {ampm}
                              </span>
                            </div>

                            {/* Digital Time Pickers Row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                              <select
                                value={hour12}
                                onChange={e => {
                                  const newTime = format12To24(e.target.value, minute, ampm)
                                  setAnswers({ ...answers, dailyRoutine: { ...answers.dailyRoutine, sleepTime: newTime } })
                                }}
                                style={{
                                  background: '#EEF2FF',
                                  border: '1px solid #C7D2FE',
                                  borderRadius: 7,
                                  padding: '2px 4px',
                                  fontSize: '13px',
                                  fontWeight: 800,
                                  color: '#3730A3',
                                  cursor: 'pointer',
                                  outline: 'none',
                                  fontFamily: 'inherit',
                                }}
                              >
                                {['01','02','03','04','05','06','07','08','09','10','11','12'].map(h => (
                                  <option key={h} value={h}>{h}</option>
                                ))}
                              </select>

                              <span style={{ fontWeight: 800, color: '#4F46E5', fontSize: '12px' }}>:</span>

                              <select
                                value={minute}
                                onChange={e => {
                                  const newTime = format12To24(hour12, e.target.value, ampm)
                                  setAnswers({ ...answers, dailyRoutine: { ...answers.dailyRoutine, sleepTime: newTime } })
                                }}
                                style={{
                                  background: '#EEF2FF',
                                  border: '1px solid #C7D2FE',
                                  borderRadius: 7,
                                  padding: '2px 4px',
                                  fontSize: '13px',
                                  fontWeight: 800,
                                  color: '#3730A3',
                                  cursor: 'pointer',
                                  outline: 'none',
                                  fontFamily: 'inherit',
                                }}
                              >
                                {['00','15','30','45'].map(m => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                              </select>

                              <button
                                type="button"
                                onClick={() => {
                                  const newAmpm = ampm === 'AM' ? 'PM' : 'AM'
                                  const newTime = format12To24(hour12, minute, newAmpm)
                                  setAnswers({ ...answers, dailyRoutine: { ...answers.dailyRoutine, sleepTime: newTime } })
                                }}
                                style={{
                                  padding: '3px 6px',
                                  borderRadius: 6,
                                  background: '#4F46E5',
                                  color: '#FFFFFF',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                {ampm}
                              </button>
                            </div>

                            {/* Quick Presets */}
                            <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                              {[
                                { label: '10:30', val: '22:30' },
                                { label: '11:30', val: '23:30' },
                                { label: '12:00', val: '00:00' },
                              ].map(p => (
                                <button
                                  key={p.val}
                                  type="button"
                                  onClick={() => setAnswers({ ...answers, dailyRoutine: { ...answers.dailyRoutine, sleepTime: p.val } })}
                                  style={{
                                    fontSize: '9px',
                                    fontWeight: answers.dailyRoutine.sleepTime === p.val ? 800 : 500,
                                    padding: '2px 5px',
                                    borderRadius: 5,
                                    border: answers.dailyRoutine.sleepTime === p.val ? '1px solid #4F46E5' : '1px solid #E0E7FF',
                                    background: answers.dailyRoutine.sleepTime === p.val ? '#EEF2FF' : '#FFFFFF',
                                    color: '#4338CA',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── BOTTOM NAVIGATION AREA ─────────────────────────── */}
            <div
              style={{
                padding: '14px 28px 26px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: '#FFFFFF',
              }}
            >
              {/* Progress Dots Indicator (5 Dots) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                {[1, 2, 3, 4, 5].map(dotIndex => (
                  <div
                    key={dotIndex}
                    style={{
                      width: step === dotIndex ? 22 : 6,
                      height: 6,
                      borderRadius: 3,
                      background: step === dotIndex ? '#0F172A' : '#E2E8F0',
                      transition: 'all 0.3s ease',
                    }}
                  />
                ))}
              </div>

              {/* Action Buttons Row */}
              <div style={{ width: '100%', display: 'flex', gap: 12 }}>
                {step > 1 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    style={{
                      padding: '14px 20px',
                      borderRadius: 999,
                      background: '#F1F5F9',
                      color: '#475569',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ← Back
                  </button>
                )}

                {/* Main Action Pill */}
                <div
                  onClick={handleNext}
                  style={{
                    flex: 1,
                    height: 54,
                    borderRadius: 999,
                    background: step === 5
                      ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)'
                      : 'linear-gradient(90deg, #0F172A 48%, rgba(244, 114, 182, 0.25) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '5px 6px 5px 22px',
                    cursor: 'pointer',
                    boxShadow: step === 5 ? '0 8px 25px rgba(99, 102, 241, 0.38)' : '0 8px 24px -4px rgba(15, 23, 42, 0.25)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.2px' }}>
                    {step === 5 ? 'Launch Personal Assistant' : step === 4 ? 'Set Up Profile' : 'Next'}
                  </span>

                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: step === 5 ? 'rgba(255, 255, 255, 0.2)' : '#0F172A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontSize: '16px',
                      fontWeight: 800,
                    }}
                  >
                    {step === 5 ? '🚀' : '›››'}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
