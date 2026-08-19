'use client'

import { useEffect, useState } from 'react'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import { useRouter } from 'next/navigation'

interface Settings {
  name: string
  timezone: string
  aiAutonomy: string
  notifications: boolean
  morningBriefing: boolean
  accountabilityCheck: boolean
  tone: string
}

const TIMEZONES = [
  'Asia/Kolkata', 'America/New_York', 'America/Los_Angeles', 'Europe/London',
  'Asia/Dubai', 'Asia/Singapore', 'Australia/Sydney', 'UTC',
]

const AUTONOMY_LEVELS = [
  { id: 'autonomous', title: 'Autonomous PA', desc: 'Proactively adjusts schedule & manages daily flow' },
  { id: 'balanced', title: 'Balanced Co-Pilot', desc: 'Suggests changes & prompts for confirmation' },
  { id: 'conservative', title: 'Manual Only', desc: 'Only acts when explicitly commanded' },
]

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<Settings>({
    name: 'User',
    timezone: 'Asia/Kolkata',
    aiAutonomy: 'autonomous',
    notifications: true,
    morningBriefing: true,
    accountabilityCheck: true,
    tone: 'supportive',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(data => {
        if (data) {
          setSettings(prev => ({
            ...prev,
            name: data.name || 'User',
            timezone: data.timezone || 'Asia/Kolkata',
          }))
        }
      })
      .catch(() => {})
  }, [])

  const saveSettings = async () => {
    setSaving(true)
    try {
      await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: settings.name,
          timezone: settings.timezone,
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
    } finally {
      setSaving(false)
    }
  }

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (c: boolean) => void }) => (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: checked ? 'var(--brand-primary)' : 'var(--border-strong)',
        padding: 2,
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
          transition: 'all var(--transition-fast)',
        }}
      />
    </div>
  )

  return (
    <div className="app-shell">
      <AppHeader />

      <div className="page-content">
        <div className="page-section" style={{ marginTop: 'var(--space-4)' }}>

          {/* ── SETTINGS HERO ─────────────────────────── */}
          <div
            className="card fade-in-up"
            style={{
              padding: 'var(--space-5)',
              background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-subtle))',
              border: '1px solid var(--border-default)',
              marginBottom: 'var(--space-5)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              CONFIGURATION
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)' }}>
              Settings & Preferences
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
              Personalize your identity, AI assistant behaviors & system rules
            </div>
          </div>

          {/* ── PROFILE SECTION ─────────────────────────── */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 'var(--space-3)' }}>
              User Identity
            </div>
            <div className="card fade-in-up" style={{ padding: 'var(--space-4) var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="input-group">
                <label className="input-label">Your Name / Preferred Call Name</label>
                <input
                  id="settings-name-input"
                  className="input"
                  value={settings.name}
                  onChange={e => setSettings(p => ({ ...p, name: e.target.value }))}
                  placeholder="Enter your name"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Home Timezone</label>
                <select
                  id="settings-timezone-select"
                  className="input"
                  value={settings.timezone}
                  onChange={e => setSettings(p => ({ ...p, timezone: e.target.value }))}
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── AI AUTONOMY LEVEL ─────────────────────────── */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 'var(--space-3)' }}>
              AI Autonomy & Intelligence
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {AUTONOMY_LEVELS.map(level => (
                <div
                  key={level.id}
                  className="card fade-in-up"
                  onClick={() => setSettings(p => ({ ...p, aiAutonomy: level.id }))}
                  style={{
                    padding: 'var(--space-3) var(--space-4)',
                    cursor: 'pointer',
                    border: settings.aiAutonomy === level.id ? '1.5px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                    background: settings.aiAutonomy === level.id ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {level.title}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                        {level.desc}
                      </div>
                    </div>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: `2px solid ${settings.aiAutonomy === level.id ? 'var(--brand-primary)' : 'var(--border-strong)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {settings.aiAutonomy === level.id && (
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--brand-primary)' }} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── NOTIFICATIONS & PROACTIVE CHECKS ─────────────────────────── */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 'var(--space-3)' }}>
              Proactive Assistant Rules
            </div>

            <div className="card fade-in-up" style={{ padding: '0 var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                    In-App Notification Alerts
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                    Show badge counter and priority warnings
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.notifications}
                  onChange={v => setSettings(p => ({ ...p, notifications: v }))}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                    Daily Morning Briefing
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                    Generate proactive daily plan every morning
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.morningBriefing}
                  onChange={v => setSettings(p => ({ ...p, morningBriefing: v }))}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4) 0' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                    Accountability Follow-ups
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                    Notice overdue items & ask what happened
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.accountabilityCheck}
                  onChange={v => setSettings(p => ({ ...p, accountabilityCheck: v }))}
                />
              </div>
            </div>
          </div>

          {/* ── SYSTEM DIAGNOSTICS ─────────────────────────── */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 'var(--space-3)' }}>
              System Health & Diagnostics
            </div>

            <div className="card fade-in-up" style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>AI Engine Provider:</span>
                  <span style={{ fontWeight: 700, color: 'var(--brand-accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand-accent)' }} />
                    Google Gemini (Online)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Local Database:</span>
                  <span style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>
                    SQLite + Prisma ORM
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Autonomous Agents:</span>
                  <span style={{ fontWeight: 700, color: 'var(--brand-purple)' }}>
                    14 Active Sub-agent Tools
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Platform Build:</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>
                    v1.2.0 · Team SDR
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── SAVE BUTTON ─────────────────────────── */}
          <button
            className="btn btn-primary btn-full"
            onClick={saveSettings}
            disabled={saving}
            style={{ marginBottom: 'var(--space-8)' }}
          >
            {saving ? 'Saving Changes...' : saved ? '✅ Settings Saved!' : 'Save All Preferences'}
          </button>

        </div>
      </div>

      <BottomNav />
    </div>
  )
}
