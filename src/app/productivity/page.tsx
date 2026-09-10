'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import { localDb } from '@/lib/db/localDb'

interface ProductivityData {
  period: string
  records: Record[]
  summary: { totalPlanned: number; totalCompleted: number; completionRate: number; averageScore: number }
}
interface Record { date: string; plannedTasks: number; completedTasks: number; score: number }

export default function ProductivityPage() {
  const router = useRouter()
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week')
  const [data, setData] = useState<ProductivityData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProductivity = async () => {
    try {
      const tasks = await localDb.tasks.toArray().catch(() => [])
      const totalPlanned = tasks.length
      const totalCompleted = tasks.filter(t => t.status === 'completed').length
      const completionRate = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 100
      const averageScore = completionRate

      const records = [
        { date: 'Today', plannedTasks: totalPlanned, completedTasks: totalCompleted, score: completionRate }
      ]

      setData({
        period,
        records,
        summary: {
          totalPlanned,
          totalCompleted,
          completionRate,
          averageScore,
        }
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProductivity()
    const handleDataChanged = () => {
      loadProductivity()
    }
    window.addEventListener('srushti_data_changed', handleDataChanged)
    return () => window.removeEventListener('srushti_data_changed', handleDataChanged)
  }, [period])

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'var(--brand-accent)'
    if (score >= 60) return 'var(--brand-primary)'
    if (score >= 40) return 'var(--priority-high)'
    return 'var(--priority-critical)'
  }

  const getScoreLabel = (rate: number) => {
    if (rate >= 90) return '🔥 Peak Performance'
    if (rate >= 75) return '⚡ High Velocity'
    if (rate >= 60) return '👍 Steady Progress'
    if (rate >= 40) return '🌱 Rebuilding Momentum'
    return '⚠️ Needs Attention'
  }

  return (
    <div className="app-shell">
      <AppHeader />

      <div className="page-content">
        <div className="page-section" style={{ marginTop: 'var(--space-4)' }}>

          {/* ── PERIOD SELECTOR ─────────────────────────── */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', background: 'var(--bg-muted)', borderRadius: 'var(--radius-full)', padding: '3px', marginBottom: 'var(--space-4)' }}>
            {(['today', 'week', 'month'] as const).map(p => (
              <button
                key={p}
                onClick={() => { setPeriod(p); setLoading(true) }}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  transition: 'all var(--transition-fast)',
                  background: period === p ? 'var(--bg-surface)' : 'transparent',
                  color: period === p ? 'var(--brand-primary)' : 'var(--text-tertiary)',
                  boxShadow: period === p ? 'var(--shadow-sm)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {loading ? (
            <>
              <div className="skeleton" style={{ height: 160, borderRadius: 20, marginBottom: 16 }} />
              <div className="skeleton" style={{ height: 100, borderRadius: 20 }} />
            </>
          ) : data ? (
            <>
              {/* ── SCORE HERO CARD ─────────────────────────── */}
              <div
                className="card fade-in-up"
                style={{
                  padding: 'var(--space-5)',
                  background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-subtle))',
                  border: '1px solid var(--border-default)',
                  marginBottom: 'var(--space-5)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  {getScoreLabel(data.summary.completionRate)}
                </div>

                {/* Big Score Ring / Value */}
                <div style={{ margin: 'var(--space-3) 0' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '56px', fontWeight: 800, color: getScoreColor(data.summary.completionRate), lineHeight: 1 }}>
                    {data.summary.completionRate}%
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 4 }}>
                    Execution velocity this {period}
                  </div>
                </div>

                {/* 3-Stat Matrix */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 'var(--space-2)',
                    marginTop: 'var(--space-4)',
                    paddingTop: 'var(--space-4)',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--brand-accent)' }}>
                      {data.summary.totalCompleted}
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                      Completed
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--brand-primary)' }}>
                      {data.summary.totalPlanned}
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                      Planned
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--brand-purple)' }}>
                      {data.summary.averageScore}
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                      Focus Score
                    </div>
                  </div>
                </div>
              </div>

              {/* ── DAILY TIMELINE BREAKDOWN ─────────────────────────── */}
              {data.records.length > 0 && (
                <div style={{ marginBottom: 'var(--space-6)' }}>
                  <div className="section-header">
                    <div className="section-title">Daily Execution Breakdown</div>
                  </div>
                  <div className="card fade-in-up">
                    {data.records.map(record => (
                      <div
                        key={record.date}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-4)',
                          padding: 'var(--space-3) var(--space-4)',
                          borderBottom: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ minWidth: 64, fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          {new Date(record.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <div style={{ flex: 1, height: 8, background: 'var(--bg-muted)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%',
                                  width: `${record.plannedTasks > 0 ? (record.completedTasks / record.plannedTasks) * 100 : 0}%`,
                                  background: `linear-gradient(90deg, ${getScoreColor(record.score)}, ${getScoreColor(record.score)}cc)`,
                                  borderRadius: 'var(--radius-full)',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: getScoreColor(record.score), minWidth: 36, textAlign: 'right' }}>
                              {record.completedTasks}/{record.plannedTasks}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── AI PRODUCTIVITY AUDIT PROMPT ─────────────────────────── */}
              <div
                className="card fade-in-up"
                style={{
                  padding: 'var(--space-4) var(--space-5)',
                  background: 'linear-gradient(135deg, rgba(91,107,240,0.06), rgba(139,92,246,0.06))',
                  border: '1px solid rgba(91,107,240,0.18)',
                  cursor: 'pointer',
                  marginBottom: 'var(--space-6)',
                }}
                onClick={() => {
                  sessionStorage.setItem('srushti_prefill', 'Analyze my productivity over the last week and tell me what is holding me back.')
                  router.push('/chat')
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{ fontSize: 28 }}>🌱</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>
                      Request Deep AI Audit
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
                      Ask Nexra to analyze bottlenecks and suggest an optimal work rhythm.
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ fontSize: '11px' }}>
                    Audit →
                  </button>
                </div>
              </div>
            </>
          ) : null}

        </div>
      </div>

      <BottomNav />
    </div>
  )
}
