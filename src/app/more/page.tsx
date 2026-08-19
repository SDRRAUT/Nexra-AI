'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'

interface UserSummary {
  name: string
  timezone: string
  activeGoalsCount: number
  habitsCount: number
  memoriesCount: number
}

const SECTIONS = [
  {
    title: 'Daily Life & Routines',
    items: [
      {
        icon: '🔁',
        title: 'Habits & Streaks',
        desc: 'Daily routines and consistency tracking',
        path: '/habits',
        gradient: 'linear-gradient(135deg, #10B981, #059669)',
        badge: 'Routine',
      },
      {
        icon: '📊',
        title: 'Productivity Score',
        desc: 'Velocity analytics and weekly breakdowns',
        path: '/productivity',
        gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
        badge: 'Analytics',
      },
      {
        icon: '🌍',
        title: 'Life OS Analysis',
        desc: 'Strategic overview & risk detection',
        path: '/life',
        gradient: 'linear-gradient(135deg, #6366F1, #4F46E5)',
        badge: 'Macro',
      },
    ]
  },
  {
    title: 'AI Intelligence & Engine',
    items: [
      {
        icon: '🧠',
        title: 'Memory Vault',
        desc: 'What Srushti remembers & learned about you',
        path: '/memory',
        gradient: 'linear-gradient(135deg, #EC4899, #DB2777)',
        badge: 'Brain',
      },
      {
        icon: '🤖',
        title: 'Agent Activity Stream',
        desc: 'Live audit log of autonomous actions',
        path: '/agents',
        gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
        badge: 'Sub-agents',
      },
    ]
  },
  {
    title: 'System & Preferences',
    items: [
      {
        icon: '🔔',
        title: 'Notifications & Alerts',
        desc: 'Reminders, approvals & follow-ups',
        path: '/notifications',
        gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)',
        badge: 'Feed',
      },
      {
        icon: '⚙️',
        title: 'Preferences & Settings',
        desc: 'AI autonomy level, timezone & profile',
        path: '/settings',
        gradient: 'linear-gradient(135deg, #64748B, #475569)',
        badge: 'Config',
      },
    ]
  }
]

export default function MorePage() {
  const router = useRouter()
  const [userData, setUserData] = useState<UserSummary>({
    name: 'User',
    timezone: 'Asia/Kolkata',
    activeGoalsCount: 0,
    habitsCount: 0,
    memoriesCount: 0,
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/user').then(r => r.json()),
      fetch('/api/goals').then(r => r.json()),
      fetch('/api/habits').then(r => r.json()),
      fetch('/api/memory').then(r => r.json()),
    ]).then(([u, g, h, m]) => {
      setUserData({
        name: u?.name || 'User',
        timezone: u?.timezone || 'Asia/Kolkata',
        activeGoalsCount: Array.isArray(g) ? g.filter((item: any) => item.status === 'active').length : 0,
        habitsCount: Array.isArray(h) ? h.length : 0,
        memoriesCount: Array.isArray(m) ? m.length : 0,
      })
    }).catch(() => {})
  }, [])

  return (
    <div className="app-shell">
      <AppHeader />

      <div className="page-content">
        <div className="page-section" style={{ marginTop: 'var(--space-4)' }}>

          {/* ── USER PROFILE HERO CARD ─────────────────────────── */}
          <div
            className="card fade-in-up"
            style={{
              background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-subtle))',
              border: '1px solid var(--border-default)',
              padding: 'var(--space-5)',
              position: 'relative',
              overflow: 'hidden',
              marginBottom: 'var(--space-5)',
            }}
          >
            {/* Subtle decorative glow */}
            <div
              style={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-purple))',
                opacity: 0.1,
                filter: 'blur(30px)',
                pointerEvents: 'none',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', position: 'relative' }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 'var(--radius-full)',
                  background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-purple))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  color: 'white',
                  fontWeight: 800,
                  boxShadow: '0 4px 14px rgba(91, 107, 240, 0.3)',
                  flexShrink: 0,
                  border: '2px solid white',
                }}
              >
                {userData.name.charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {userData.name}
                  </div>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'var(--brand-accent)',
                      display: 'inline-block',
                    }}
                    title="Active"
                  />
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                  Srushti Life Engine · {userData.timezone}
                </div>
              </div>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => router.push('/settings')}
                style={{ fontSize: 'var(--text-xs)', padding: '6px 12px' }}
              >
                Edit
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 'var(--space-2)',
                marginTop: 'var(--space-4)',
                paddingTop: 'var(--space-3)',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ textAlign: 'center' }} onClick={() => router.push('/goals')}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--brand-primary)' }}>
                  {userData.activeGoalsCount}
                </div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                  Goals
                </div>
              </div>

              <div style={{ textAlign: 'center' }} onClick={() => router.push('/habits')}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--brand-accent)' }}>
                  {userData.habitsCount}
                </div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                  Habits
                </div>
              </div>

              <div style={{ textAlign: 'center' }} onClick={() => router.push('/memory')}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--brand-purple)' }}>
                  {userData.memoriesCount}
                </div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                  Memories
                </div>
              </div>
            </div>
          </div>

          {/* ── INTERACTIVE CHAT BANNER ─────────────────────────── */}
          <div
            className="greeting-card fade-in-up"
            style={{
              cursor: 'pointer',
              marginBottom: 'var(--space-6)',
              position: 'relative',
              overflow: 'hidden',
            }}
            onClick={() => router.push('/chat')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.9, marginBottom: 2 }}>
                  AI Personal Assistant
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800 }}>
                  Talk with Srushti
                </div>
                <div style={{ fontSize: 'var(--text-xs)', opacity: 0.85, marginTop: 4 }}>
                  Ask questions, adapt schedules & get deep life advice
                </div>
              </div>
              <div style={{ fontSize: 36 }}>🌱</div>
            </div>
          </div>

          {/* ── BENTO FEATURE SECTIONS ─────────────────────────── */}
          {SECTIONS.map(section => (
            <div key={section.title} style={{ marginBottom: 'var(--space-6)' }}>
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  marginBottom: 'var(--space-3)',
                  paddingLeft: 2,
                }}
              >
                {section.title}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {section.items.map(item => (
                  <div
                    key={item.path}
                    className="card fade-in-up"
                    onClick={() => router.push(item.path)}
                    style={{
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4) var(--space-4)' }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 'var(--radius-lg)',
                          background: item.gradient,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20,
                          color: 'white',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          flexShrink: 0,
                        }}
                      >
                        {item.icon}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {item.title}
                          </div>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: 'var(--text-tertiary)',
                              background: 'var(--bg-subtle)',
                              padding: '1px 6px',
                              borderRadius: 'var(--radius-full)',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            {item.badge}
                          </span>
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2, lineHeight: 1.4 }}>
                          {item.desc}
                        </div>
                      </div>

                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--text-tertiary)"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                      >
                        <polyline points="9,18 15,12 9,6" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* ── FOOTER BRANDING ─────────────────────────── */}
          <div style={{ textAlign: 'center', padding: 'var(--space-6) 0 var(--space-8)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--brand-primary)' }}>
              Srushti
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
              Engineered with precision by Team SDR
            </div>
          </div>

        </div>
      </div>

      <BottomNav />
    </div>
  )
}
