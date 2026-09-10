'use client'

import { useRouter } from 'next/navigation'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import WheelOfLifeRadar from '@/components/life/WheelOfLifeRadar'

export default function LifePage() {
  const router = useRouter()

  const PROMPTS = [
    { text: "How is my life going?", icon: "🌍" },
    { text: "What are my biggest risks right now?", icon: "⚠️" },
    { text: "What's going well and what's not?", icon: "📊" },
    { text: "Why am I falling behind?", icon: "🔍" },
    { text: "What should I focus on this week?", icon: "🎯" },
    { text: "Am I making progress on my goals?", icon: "📈" },
    { text: "What's my biggest opportunity right now?", icon: "💡" },
    { text: "Review my last 30 days", icon: "📅" },
  ]

  const handlePrompt = (text: string) => {
    // Store prompt in sessionStorage and redirect to chat
    sessionStorage.setItem('srushti_prefill', text)
    router.push('/chat')
  }

  return (
    <div className="app-shell">
      <AppHeader title="Life Analysis" subtitle="Your big picture view" showBrand={false} showBack />

      <div className="page-content" style={{ paddingBottom: '95px' }}>
        <div className="page-section" style={{ marginTop: 'var(--space-4)' }}>

          {/* Wheel of Life Interactive Radar */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <WheelOfLifeRadar />
          </div>

          {/* Prompt cards */}
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 'var(--space-3)' }}>
            Ask Srushti
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {PROMPTS.map((prompt, i) => (
              <div
                key={i}
                className="card fade-in-up"
                style={{ cursor: 'pointer' }}
                onClick={() => handlePrompt(prompt.text)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4) var(--space-5)' }}>
                  <span style={{ fontSize: 24 }}>{prompt.icon}</span>
                  <span style={{ flex: 1, fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {prompt.text}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth={2.5} strokeLinecap="round">
                    <polyline points="9,18 15,12 9,6" />
                  </svg>
                </div>
              </div>
            ))}
          </div>

          {/* Links to detailed sections */}
          <div style={{ marginTop: 'var(--space-6)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 'var(--space-3)' }}>
              Detailed views
            </div>
            <div className="settings-group fade-in-up">
              {[
                { icon: '📊', label: 'Productivity Analytics', path: '/productivity', color: '#F59E0B18' },
                { icon: '🎯', label: 'Goals Progress', path: '/goals', color: '#6366F118' },
                { icon: '🔁', label: 'Habit Consistency', path: '/habits', color: '#10B98118' },
                { icon: '🧠', label: 'Memory & Context', path: '/memory', color: '#EC489918' },
              ].map(item => (
                <div key={item.path} className="settings-item" onClick={() => router.push(item.path)}>
                  <div className="settings-icon" style={{ background: item.color }}><span style={{ fontSize: 18 }}>{item.icon}</span></div>
                  <span className="settings-label">{item.label}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth={2.5} strokeLinecap="round">
                    <polyline points="9,18 15,12 9,6" />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
