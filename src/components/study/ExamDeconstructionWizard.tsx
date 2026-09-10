'use client'

import { useState } from 'react'
import { format, addDays, differenceInDays } from 'date-fns'
import { localDb } from '@/lib/db/localDb'

interface ExamWizardProps {
  isOpen: boolean
  onClose: () => void
  onPlanCreated?: () => void
}

export default function ExamDeconstructionWizard({
  isOpen,
  onClose,
  onPlanCreated,
}: ExamWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [examName, setExamName] = useState('')
  const [examDate, setExamDate] = useState(format(addDays(new Date(), 14), 'yyyy-MM-dd'))
  const [dailyHours, setDailyHours] = useState(2)
  const [chaptersInput, setChaptersInput] = useState(
    'Module 1: Core Fundamentals & Theory\nModule 2: Practical Implementation & Algorithms\nModule 3: Advanced Optimization & Architecture\nModule 4: Case Studies & Problem Solving'
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const daysRemaining = Math.max(1, differenceInDays(new Date(examDate), new Date()))
  const parsedChapters = chaptersInput
    .split('\n')
    .map(c => c.trim())
    .filter(Boolean)

  const handleCreateSchedule = async () => {
    if (!examName.trim() || parsedChapters.length === 0) return
    setIsSubmitting(true)

    try {
      // 1. Create the Exam event itself on the exam date
      const examIso = new Date(`${examDate}T09:00:00`).toISOString()
      const examEndIso = new Date(`${examDate}T12:00:00`).toISOString()

      await localDb.events.add({
        id: 'event-exam-' + Date.now(),
        title: `📝 ${examName} Exam`,
        description: `Official exam date for ${examName}. Good luck!`,
        type: 'exam',
        startTime: examIso,
        endTime: examEndIso,
        color: '#EF4444',
        createdAt: new Date().toISOString(),
      })

      // 2. Distribute chapters into study blocks
      // Reserve the last 2 days before exam for Mock Tests & Final Revision
      const studyDaysAvailable = Math.max(1, daysRemaining - 2)
      const daysPerChapter = Math.max(1, Math.floor(studyDaysAvailable / parsedChapters.length))

      for (let i = 0; i < parsedChapters.length; i++) {
        const chapter = parsedChapters[i]
        const targetDayOffset = Math.min(studyDaysAvailable, (i * daysPerChapter) + 1)
        const scheduledDate = addDays(new Date(), targetDayOffset)
        const dateStr = format(scheduledDate, 'yyyy-MM-dd')
        const startIso = new Date(`${dateStr}T17:00:00`).toISOString()

        await localDb.tasks.add({
          id: `task-exam-${Date.now()}-${i}`,
          title: `📚 ${examName}: ${chapter}`,
          description: `Study & solve revision exercises for ${chapter}`,
          category: 'study',
          priority: i === 0 ? 'high' : 'medium',
          status: 'planned',
          deadline: startIso,
          scheduledStart: startIso,
          estimatedMinutes: dailyHours * 60,
          isAiGenerated: true,
          postponeCount: 0,
          createdAt: new Date().toISOString(),
        })
      }

      // 3. Add Mock Test Day (1 day before exam)
      if (daysRemaining >= 2) {
        const mockDay = addDays(new Date(examDate), -1)
        const mockIso = new Date(`${format(mockDay, 'yyyy-MM-dd')}T14:00:00`).toISOString()

        await localDb.tasks.add({
          id: `task-mock-${Date.now()}`,
          title: `🎯 ${examName}: Full Mock Test & Formula Revision`,
          description: `Complete previous year question paper under timed conditions.`,
          category: 'study',
          priority: 'critical',
          status: 'planned',
          deadline: mockIso,
          scheduledStart: mockIso,
          estimatedMinutes: 120,
          isAiGenerated: true,
          postponeCount: 0,
          createdAt: new Date().toISOString(),
        })
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('srushti_data_changed'))
      }

      if (onPlanCreated) onPlanCreated()
      onClose()
    } catch (e) {
      console.error('Failed to create exam plan', e)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="exam-wizard-modal fade-in-up">
        {/* Header */}
        <div className="exam-wizard-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>📚</span>
            <div>
              <div className="exam-wizard-title">Exam Prep Wizard</div>
              <div className="exam-wizard-sub">Step {step} of 3</div>
            </div>
          </div>
          <button className="focus-icon-btn" onClick={onClose}>✕</button>
        </div>

        {/* Step 1: Exam Details */}
        {step === 1 && (
          <div className="exam-wizard-body">
            <div className="input-group">
              <label className="input-label">Exam / Subject Title</label>
              <input
                className="input"
                placeholder="e.g. Operating Systems, Calculus, Microeconomics"
                value={examName}
                onChange={e => setExamName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="input-group">
              <label className="input-label">Exam Date</label>
              <input
                type="date"
                className="input"
                value={examDate}
                min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                onChange={e => setExamDate(e.target.value)}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 4 }}>
                ⏱️ {daysRemaining} days remaining until exam
              </span>
            </div>

            <div className="input-group">
              <label className="input-label">Daily Study Commitment</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1.5, 2, 3, 4].map(h => (
                  <button
                    key={h}
                    type="button"
                    className={`focus-pill ${dailyHours === h ? 'active' : ''}`}
                    onClick={() => setDailyHours(h)}
                    style={{ flex: 1, padding: '8px 0', fontSize: '12px' }}
                  >
                    {h}h / day
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn btn-primary btn-full"
              style={{ marginTop: 12 }}
              disabled={!examName.trim()}
              onClick={() => setStep(2)}
            >
              Continue to Syllabus →
            </button>
          </div>
        )}

        {/* Step 2: Syllabus Modules */}
        {step === 2 && (
          <div className="exam-wizard-body">
            <div className="input-group">
              <label className="input-label">Modules / Chapters (1 per line)</label>
              <textarea
                className="input"
                rows={6}
                value={chaptersInput}
                onChange={e => setChaptersInput(e.target.value)}
                placeholder="Paste or type each chapter on a new line..."
                style={{ fontSize: '13px', lineHeight: 1.5, resize: 'none' }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 4 }}>
                📋 Detected {parsedChapters.length} study chapters
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>
                ← Back
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 2 }}
                disabled={parsedChapters.length === 0}
                onClick={() => setStep(3)}
              >
                Preview Plan →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Plan Review & Scheduling */}
        {step === 3 && (
          <div className="exam-wizard-body">
            <div className="exam-plan-card">
              <div className="exam-plan-badge">🎯 AI STUDY STRATEGY</div>
              <div className="exam-plan-headline">
                {examName} · {daysRemaining} Days Plan
              </div>
              <p className="exam-plan-p">
                Srushti will allocate <strong>{parsedChapters.length} study blocks</strong> spaced evenly before your exam, plus a dedicated <strong>Mock Test & Formula Review Day</strong>.
              </p>

              <div className="exam-plan-breakdown">
                {parsedChapters.map((ch, idx) => (
                  <div key={idx} className="exam-breakdown-row">
                    <span className="exam-row-dot" />
                    <span style={{ flex: 1, minWidth: 0, fontWeight: 600 }}>{ch}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{dailyHours}h</span>
                  </div>
                ))}
                <div className="exam-breakdown-row highlight">
                  <span>🏆</span>
                  <span style={{ flex: 1, minWidth: 0, fontWeight: 700 }}>Mock Exam & Final Buffer Day</span>
                  <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700 }}>1 Day Before</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)} style={{ flex: 1 }}>
                ← Edit
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 2, background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', fontWeight: 700 }}
                disabled={isSubmitting}
                onClick={handleCreateSchedule}
              >
                {isSubmitting ? 'Scheduling...' : '📅 Add to Calendar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
