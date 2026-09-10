'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { localDb } from '@/lib/db/localDb'

export interface LifeDimension {
  id: string
  name: string
  icon: string
  score: number // 10 to 100
  color: string
}

const DEFAULT_DIMENSIONS: LifeDimension[] = [
  { id: 'academics', name: 'Career / Study', icon: '🎓', score: 75, color: '#6366F1' },
  { id: 'health', name: 'Health & Fitness', icon: '💪', score: 55, color: '#10B981' },
  { id: 'wellbeing', name: 'Mental Wellbeing', icon: '🧘', score: 65, color: '#06B6D4' },
  { id: 'finance', name: 'Finance & Discipline', icon: '💰', score: 60, color: '#F59E0B' },
  { id: 'social', name: 'Social & Relations', icon: '🤝', score: 50, color: '#EC4899' },
  { id: 'growth', name: 'Personal Growth', icon: '🚀', score: 70, color: '#8B5CF6' },
]

export default function WheelOfLifeRadar() {
  const router = useRouter()
  const [dimensions, setDimensions] = useState<LifeDimension[]>(DEFAULT_DIMENSIONS)
  const [activeDimId, setActiveDimId] = useState<string>('academics')

  // Load user data to dynamically calculate intelligent initial scores
  useEffect(() => {
    const calculateScores = async () => {
      try {
        const [tasks, habits, goals] = await Promise.all([
          localDb.tasks.toArray(),
          localDb.habits.toArray(),
          localDb.goals.toArray(),
        ])

        const studyTasks = tasks.filter(t => t.category === 'study' || t.category === 'work')
        const healthHabits = habits.filter(h => h.category === 'health' || h.title.toLowerCase().includes('water') || h.title.toLowerCase().includes('walk') || h.title.toLowerCase().includes('gym'))
        const growthGoals = goals.filter(g => g.category === 'learning' || g.category === 'growth')

        setDimensions(prev => prev.map(dim => {
          let score = dim.score
          if (dim.id === 'academics' && studyTasks.length > 0) {
            const completed = studyTasks.filter(t => t.status === 'completed').length
            score = Math.min(95, Math.max(40, Math.round((completed / studyTasks.length) * 100)))
          } else if (dim.id === 'health' && healthHabits.length > 0) {
            const avgStreak = healthHabits.reduce((acc, h) => acc + h.currentStreak, 0) / healthHabits.length
            score = Math.min(95, Math.max(35, Math.round(avgStreak * 12 + 40)))
          } else if (dim.id === 'growth' && growthGoals.length > 0) {
            const avgProgress = growthGoals.reduce((acc, g) => acc + g.progress, 0) / growthGoals.length
            score = Math.min(95, Math.max(45, Math.round(avgProgress)))
          }
          return { ...dim, score }
        }))
      } catch (e) {
        console.error(e)
      }
    }

    calculateScores()
  }, [])

  const updateScore = (id: string, newScore: number) => {
    setDimensions(prev =>
      prev.map(d => (d.id === id ? { ...d, score: Math.max(10, Math.min(100, newScore)) } : d))
    )
  }

  // Calculate geometry for 6-sided radar polygon
  const size = 260
  const center = size / 2
  const maxRadius = center - 38
  const angleStep = (Math.PI * 2) / dimensions.length

  // Points for data polygon
  const points = dimensions.map((dim, i) => {
    const angle = i * angleStep - Math.PI / 2
    const r = (dim.score / 100) * maxRadius
    const x = center + r * Math.cos(angle)
    const y = center + r * Math.sin(angle)
    return `${x},${y}`
  }).join(' ')

  // Overall Life Balance Average
  const averageScore = Math.round(
    dimensions.reduce((acc, d) => acc + d.score, 0) / dimensions.length
  )

  // Identify lowest dimension for targeted coaching
  const sorted = [...dimensions].sort((a, b) => a.score - b.score)
  const lowest = sorted[0]
  const highest = sorted[sorted.length - 1]

  const handleFixBalance = () => {
    const prompt = `Review my Wheel of Life: My ${highest.name} is strong (${highest.score}%), but my ${lowest.name} is low (${lowest.score}%). Suggest 3 immediate, small actions I can schedule today to balance my life.`
    sessionStorage.setItem('srushti_prefill', prompt)
    router.push('/chat')
  }

  const activeDim = dimensions.find(d => d.id === activeDimId) || dimensions[0]

  return (
    <div className="wheel-radar-card fade-in-up">
      {/* Title & Overall Score Header */}
      <div className="wheel-header-row">
        <div>
          <div className="wheel-title">Wheel of Life</div>
          <div className="wheel-subtitle">Macro Life Balance Radar</div>
        </div>
        <div className="wheel-score-badge">
          <span className="wheel-score-num">{averageScore}%</span>
          <span className="wheel-score-tag">Harmony</span>
        </div>
      </div>

      {/* Hexagonal Radar Chart */}
      <div className="wheel-svg-container">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Concentric guide rings (25%, 50%, 75%, 100%) */}
          {[0.25, 0.5, 0.75, 1.0].map((level, idx) => {
            const ringPoints = dimensions.map((_, i) => {
              const angle = i * angleStep - Math.PI / 2
              const r = level * maxRadius
              return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`
            }).join(' ')
            return (
              <polygon
                key={idx}
                points={ringPoints}
                className="radar-guide-ring"
                fill="none"
                stroke="var(--border-subtle, rgba(226, 232, 240, 0.6))"
                strokeWidth={idx === 3 ? '1.5' : '1'}
                strokeDasharray={idx === 3 ? 'none' : '3 3'}
              />
            )
          })}

          {/* Axes spokes */}
          {dimensions.map((_, i) => {
            const angle = i * angleStep - Math.PI / 2
            const x = center + maxRadius * Math.cos(angle)
            const y = center + maxRadius * Math.sin(angle)
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="var(--border-subtle, rgba(226, 232, 240, 0.5))"
                strokeWidth="1"
              />
            )
          })}

          {/* User Data Polygon */}
          <polygon
            points={points}
            className="radar-data-polygon"
            fill="rgba(99, 102, 241, 0.22)"
            stroke="#6366F1"
            strokeWidth="2.5"
          />

          {/* Outer Vertex Labels & Nodes */}
          {dimensions.map((dim, i) => {
            const angle = i * angleStep - Math.PI / 2
            const rData = (dim.score / 100) * maxRadius
            const xData = center + rData * Math.cos(angle)
            const yData = center + rData * Math.sin(angle)

            const labelRadius = maxRadius + 22
            const xLabel = center + labelRadius * Math.cos(angle)
            const yLabel = center + labelRadius * Math.sin(angle)
            const isSelected = dim.id === activeDimId

            return (
              <g
                key={dim.id}
                onClick={() => setActiveDimId(dim.id)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={xData}
                  cy={yData}
                  r={isSelected ? '6' : '4.5'}
                  fill={dim.color}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  className="radar-node-circle"
                />
                <text
                  x={xLabel}
                  y={yLabel + 4}
                  textAnchor="middle"
                  className={`radar-label-text ${isSelected ? 'active' : ''}`}
                  fontSize="13"
                >
                  {dim.icon}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Interactive Dimension Sliders & Selector */}
      <div className="wheel-slider-card">
        <div className="wheel-slider-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 18 }}>{activeDim.icon}</span>
            <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)' }}>
              {activeDim.name}
            </span>
          </div>
          <span className="wheel-slider-score" style={{ color: activeDim.color }}>
            {activeDim.score}%
          </span>
        </div>

        <input
          type="range"
          min="10"
          max="100"
          value={activeDim.score}
          onChange={(e) => updateScore(activeDim.id, Number(e.target.value))}
          className="wheel-range-slider"
          style={{ accentColor: activeDim.color }}
        />

        {/* Quick chip buttons to select dimension */}
        <div className="wheel-chips-row">
          {dimensions.map(d => (
            <button
              key={d.id}
              className={`wheel-dim-chip ${d.id === activeDimId ? 'active' : ''}`}
              onClick={() => setActiveDimId(d.id)}
            >
              <span>{d.icon}</span>
              <span>{d.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* AI Life Coaching Diagnosis */}
      <div className="wheel-coaching-box">
        <div className="wheel-coach-title">
          <span>🧠 Srushti's Balance Insight</span>
        </div>
        <p className="wheel-coach-desc">
          Your <strong>{highest.name}</strong> is leading at <strong>{highest.score}%</strong>, while <strong>{lowest.name}</strong> is trailing at <strong>{lowest.score}%</strong>. Even a 20-minute daily commitment can restore alignment.
        </p>
        <button className="wheel-coach-btn" onClick={handleFixBalance}>
          <span>✨</span> Ask Srushti to Balance My Life
        </button>
      </div>
    </div>
  )
}
