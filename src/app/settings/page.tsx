'use client'

import { useEffect, useState, useRef } from 'react'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import { useRouter } from 'next/navigation'
import { localDb } from '@/lib/db/localDb'

interface Settings {
  name: string
  assistantName: string
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [settings, setSettings] = useState<Settings>({
    name: 'Sanket',
    assistantName: 'Srushti',
    timezone: 'Asia/Kolkata',
    aiAutonomy: 'autonomous',
    notifications: true,
    morningBriefing: true,
    accountabilityCheck: true,
    tone: 'supportive',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // API Key State
  const [apiKeyStatus, setApiKeyStatus] = useState<{ hasKey: boolean; maskedKey: string }>({
    hasKey: false,
    maskedKey: '',
  })
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isSavingKey, setIsSavingKey] = useState(false)
  const [isTestingKey, setIsTestingKey] = useState(false)
  const [showEditKey, setShowEditKey] = useState(false)
  const [keyFeedback, setKeyFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  // Backup / Import Export State
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge')
  const [backupFeedback, setBackupFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  const fetchApiKeyStatus = async () => {
    let key = ''
    try {
      const pref = await localDb.preferences.get('gemini_api_key')
      key = pref?.value || ''
    } catch {}
    if (!key && typeof localStorage !== 'undefined') {
      key = localStorage.getItem('srushti_gemini_api_key') || ''
    }
    setApiKeyStatus({
      hasKey: Boolean(key),
      maskedKey: key ? `${key.slice(0, 6)}...${key.slice(-4)}` : '',
    })
  }

  useEffect(() => {
    // Load local user settings
    localDb.user.toArray().then(async (users: any[]) => {
      let savedName = ''
      let savedTz = ''
      if (users && users.length > 0) {
        const u = users[0]
        savedName = u.name
        savedTz = u.timezone
      }
      if (!savedName && typeof localStorage !== 'undefined') {
        savedName = localStorage.getItem('srushti_user_name') || ''
      }
      if (!savedTz && typeof localStorage !== 'undefined') {
        savedTz = localStorage.getItem('srushti_user_timezone') || ''
      }

      let savedAssistantName = typeof localStorage !== 'undefined' ? localStorage.getItem('srushti_assistant_name') : ''
      if (!savedAssistantName) {
        const pref = await localDb.preferences.get('assistant_name').catch(() => null)
        savedAssistantName = pref?.value || 'Srushti'
      }

      setSettings(prev => ({
        ...prev,
        name: savedName || 'Sanket',
        assistantName: savedAssistantName || 'Srushti',
        timezone: savedTz || 'Asia/Kolkata',
      }))
    }).catch(() => {})

    fetchApiKeyStatus()
  }, [])

  const saveSettings = async () => {
    setSaving(true)
    try {
      await localDb.user.put({
        id: 'default-user',
        name: settings.name || 'Sanket',
        timezone: settings.timezone || 'Asia/Kolkata',
        aiAutonomy: settings.aiAutonomy,
        notifications: settings.notifications,
        morningBriefing: settings.morningBriefing,
        accountabilityCheck: settings.accountabilityCheck,
      }).catch(() => {})

      await localDb.preferences.put({ key: 'assistant_name', value: settings.assistantName || 'Srushti' }).catch(() => {})

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('srushti_user_name', settings.name || 'Sanket')
        localStorage.setItem('srushti_assistant_name', settings.assistantName || 'Srushti')
        localStorage.setItem('srushti_user_timezone', settings.timezone || 'Asia/Kolkata')
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('srushti_data_changed'))
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
    } finally {
      setSaving(false)
    }
  }

  const testGeminiKey = async (key: string) => {
    const candidateModels = ['gemini-3.6-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']
    let lastError = ''
    for (const model of candidateModels) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'ping' }] }]
          })
        })
        if (res.ok) {
          return { success: true, model }
        } else {
          const errData = await res.json().catch(() => null)
          lastError = errData?.error?.message || `HTTP ${res.status}`
        }
      } catch (e: any) {
        lastError = e.message || 'Network error'
      }
    }
    return { success: false, error: lastError }
  }

  const handleSaveApiKey = async () => {
    const key = apiKeyInput.trim()
    if (!key) {
      setKeyFeedback({ type: 'error', message: 'Please enter a valid Gemini API key.' })
      return
    }

    setIsSavingKey(true)
    setKeyFeedback({ type: 'info', message: 'Validating key with Google Gemini 3.6 Flash...' })

    try {
      const result = await testGeminiKey(key)

      if (result.success) {
        await localDb.preferences.put({ key: 'gemini_api_key', value: key }).catch(() => {})
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('srushti_gemini_api_key', key)
        }
        setKeyFeedback({ type: 'success', message: '✅ API key verified & saved locally on your phone!' })
        setApiKeyInput('')
        setShowEditKey(false)
        await fetchApiKeyStatus()
        setTimeout(() => setKeyFeedback(null), 4000)
      } else {
        setKeyFeedback({ type: 'error', message: `Validation failed: ${result.error}` })
      }
    } catch (err: any) {
      setKeyFeedback({ type: 'error', message: err.message || 'Error communicating with Gemini.' })
    } finally {
      setIsSavingKey(false)
    }
  }

  const handleTestApiKey = async () => {
    setIsTestingKey(true)
    setKeyFeedback({ type: 'info', message: 'Testing connection to Gemini 3.6 Flash...' })

    try {
      let key = apiKeyInput.trim()
      if (!key) {
        const pref = await localDb.preferences.get('gemini_api_key')
        key = pref?.value || (typeof localStorage !== 'undefined' ? localStorage.getItem('srushti_gemini_api_key') || '' : '')
      }
      if (!key) {
        setKeyFeedback({ type: 'error', message: 'No API key configured.' })
        return
      }

      const result = await testGeminiKey(key)

      if (result.success) {
        setKeyFeedback({ type: 'success', message: `⚡ Connection successful! ${result.model} is active.` })
      } else {
        setKeyFeedback({ type: 'error', message: `Connection test failed: ${result.error}` })
      }
    } catch (err: any) {
      setKeyFeedback({ type: 'error', message: err.message || 'Test failed.' })
    } finally {
      setIsTestingKey(false)
    }
  }

  const handleRemoveApiKey = async () => {
    if (confirm('Are you sure you want to remove your local Gemini API key?')) {
      await localDb.preferences.delete('gemini_api_key').catch(() => {})
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('srushti_gemini_api_key')
      }
      setKeyFeedback({ type: 'info', message: 'API key removed.' })
      await fetchApiKeyStatus()
      setShowEditKey(false)
      setTimeout(() => setKeyFeedback(null), 3000)
    }
  }

  // ── EXPORT DATA (100% LOCAL OFFLINE JSON) ───────────────────
  const handleExportData = async () => {
    setIsExporting(true)
    setBackupFeedback({ type: 'info', message: 'Generating offline backup snapshot...' })
    try {
      const [tasks, goals, habits, habitLogs, memories, conversations, messages, preferences, user] = await Promise.all([
        localDb.tasks.toArray(),
        localDb.goals.toArray(),
        localDb.habits.toArray(),
        localDb.habitLogs.toArray(),
        localDb.memories.toArray(),
        localDb.conversations.toArray(),
        localDb.messages.toArray(),
        localDb.preferences.toArray(),
        localDb.user.toArray(),
      ])

      const backupData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        user,
        tasks,
        goals,
        habits,
        habitLogs,
        memories,
        conversations,
        messages,
        preferences,
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `srushti-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setBackupFeedback({ type: 'success', message: '✅ Complete offline backup exported & downloaded!' })
      setTimeout(() => setBackupFeedback(null), 4000)
    } catch (e: any) {
      setBackupFeedback({ type: 'error', message: e.message || 'Export failed' })
    } finally {
      setIsExporting(false)
    }
  }

  // ── IMPORT DATA (100% LOCAL OFFLINE JSON) ───────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        const parsed = JSON.parse(text)

        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid JSON file format')
        }

        const confirmMsg =
          importMode === 'overwrite'
            ? '⚠️ OVERWRITE MODE: This will replace your current data with the backup file. Proceed?'
            : 'Merge backup data with your existing records? Proceed?'

        if (!confirm(confirmMsg)) return

        setIsImporting(true)
        setBackupFeedback({ type: 'info', message: 'Restoring data into phone database...' })

        if (importMode === 'overwrite') {
          await Promise.all([
            localDb.tasks.clear(),
            localDb.goals.clear(),
            localDb.habits.clear(),
            localDb.habitLogs.clear(),
            localDb.memories.clear(),
            localDb.conversations.clear(),
            localDb.messages.clear(),
          ])
        }

        // Restore tables
        if (Array.isArray(parsed.tasks)) await localDb.tasks.bulkPut(parsed.tasks).catch(() => {})
        if (Array.isArray(parsed.goals)) await localDb.goals.bulkPut(parsed.goals).catch(() => {})
        if (Array.isArray(parsed.habits)) await localDb.habits.bulkPut(parsed.habits).catch(() => {})
        if (Array.isArray(parsed.habitLogs)) await localDb.habitLogs.bulkPut(parsed.habitLogs).catch(() => {})
        if (Array.isArray(parsed.memories)) await localDb.memories.bulkPut(parsed.memories).catch(() => {})
        if (Array.isArray(parsed.conversations)) await localDb.conversations.bulkPut(parsed.conversations).catch(() => {})
        if (Array.isArray(parsed.messages)) await localDb.messages.bulkPut(parsed.messages).catch(() => {})
        if (Array.isArray(parsed.preferences)) await localDb.preferences.bulkPut(parsed.preferences).catch(() => {})
        if (Array.isArray(parsed.user) && parsed.user.length > 0) await localDb.user.bulkPut(parsed.user).catch(() => {})

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('srushti_data_changed'))
        }

        setBackupFeedback({
          type: 'success',
          message: `✅ Restored ${(parsed.tasks || []).length} tasks, ${(parsed.goals || []).length} goals, ${(parsed.habits || []).length} habits, ${(parsed.memories || []).length} memories!`,
        })
        if (fileInputRef.current) fileInputRef.current.value = ''
        setTimeout(() => setBackupFeedback(null), 5000)
      } catch (err: any) {
        setBackupFeedback({ type: 'error', message: err.message || 'Failed to parse JSON file' })
      } finally {
        setIsImporting(false)
      }
    }
    reader.readAsText(file)
  }

  // ── FACTORY RESET ─────────────────────────────────────────
  const handleFactoryReset = async () => {
    const check1 = confirm('⚠️ DANGER ZONE: This will permanently wipe all tasks, goals, habits, memories, and chat history. Are you sure?')
    if (!check1) return

    const check2 = prompt('Type "RESET" to confirm complete wipe:')
    if (check2 !== 'RESET') {
      alert('Reset cancelled.')
      return
    }

    try {
      await Promise.all([
        localDb.tasks.clear(),
        localDb.habits.clear(),
        localDb.habitLogs.clear(),
        localDb.goals.clear(),
        localDb.events.clear(),
        localDb.memories.clear(),
        localDb.messages.clear(),
        localDb.conversations.clear(),
        localDb.notifications.clear(),
        localDb.user.clear(),
        localDb.preferences.clear(),
      ]).catch(() => {})

      if (typeof localStorage !== 'undefined') {
        localStorage.clear()
        localStorage.setItem('srushti_onboarding_done', 'false')
      }

      await fetch('/api/settings/backup', { method: 'DELETE' }).catch(() => {})
      alert('✨ All user data wiped. Starting fresh onboarding setup.')
      window.location.href = '/'
    } catch {
      alert('Failed to reset.')
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

  // ── RENDER API KEY CARD ───────────────────────────────────
  const renderApiKeySection = (isDimmedAtBottom: boolean) => (
    <div
      style={{
        marginBottom: 'var(--space-6)',
        opacity: isDimmedAtBottom ? 0.65 : 1,
        transition: 'opacity 0.25s ease',
      }}
      onMouseEnter={e => { if (isDimmedAtBottom) (e.currentTarget as HTMLElement).style.opacity = '1' }}
      onMouseLeave={e => { if (isDimmedAtBottom) (e.currentTarget as HTMLElement).style.opacity = '0.65' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          🔑 AI Engine & API Key
        </div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            background: apiKeyStatus.hasKey ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            color: apiKeyStatus.hasKey ? 'var(--status-success)' : 'var(--status-error)',
          }}
        >
          {apiKeyStatus.hasKey ? '✅ Active & Connected' : '⚠️ Key Missing'}
        </span>
      </div>

      <div className="card fade-in-up" style={{ padding: 'var(--space-4) var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Your Google Gemini API key is stored locally in your SQLite database. It is never exposed publicly.
        </div>

        {apiKeyStatus.hasKey && (
          <div
            style={{
              padding: '8px 12px',
              background: 'var(--bg-muted)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 'var(--text-xs)',
            }}
          >
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>Current Key: </span>
              <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{apiKeyStatus.maskedKey}</strong>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleTestApiKey}
                disabled={isTestingKey}
                style={{ fontSize: '11px', padding: '3px 8px' }}
              >
                {isTestingKey ? 'Testing...' : '⚡ Test'}
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowEditKey(!showEditKey)}
                style={{ fontSize: '11px', padding: '3px 8px' }}
              >
                {showEditKey ? 'Cancel' : 'Edit'}
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleRemoveApiKey}
                style={{ fontSize: '11px', padding: '3px 8px' }}
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {(!apiKeyStatus.hasKey || showEditKey) && (
          <div className="input-group" style={{ marginTop: 'var(--space-2)' }}>
            <label className="input-label">
              {apiKeyStatus.hasKey ? 'Replace Gemini API Key' : 'Enter Gemini API Key'}
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  id="settings-api-key-input"
                  type={showApiKey ? 'text' : 'password'}
                  className="input"
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {showApiKey ? '🙈' : '👁️'}
                </button>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleSaveApiKey}
                disabled={isSavingKey || !apiKeyInput.trim()}
                id="save-api-key-btn"
              >
                {isSavingKey ? 'Saving...' : 'Save Key'}
              </button>
            </div>
          </div>
        )}

        {keyFeedback && (
          <div
            className="fade-in-up"
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              background:
                keyFeedback.type === 'success'
                  ? 'rgba(16, 185, 129, 0.15)'
                  : keyFeedback.type === 'error'
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(91, 107, 240, 0.15)',
              color:
                keyFeedback.type === 'success'
                  ? 'var(--status-success)'
                  : keyFeedback.type === 'error'
                  ? 'var(--status-error)'
                  : 'var(--brand-primary)',
            }}
          >
            {keyFeedback.message}
          </div>
        )}
      </div>
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

          {/* ── IF API KEY MISSING, SHOW PROMINENTLY AT TOP ─── */}
          {!apiKeyStatus.hasKey && renderApiKeySection(false)}

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
                <label className="input-label">AI Assistant Name (Custom Name)</label>
                <input
                  id="settings-assistant-name-input"
                  className="input"
                  value={settings.assistantName}
                  onChange={e => setSettings(p => ({ ...p, assistantName: e.target.value }))}
                  placeholder="e.g. Srushti, Jarvis, Friday..."
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

          {/* ── AI AUTONOMY LEVEL ────────────────────────── */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 'var(--space-3)' }}>
              AI Autonomy & Authority
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {AUTONOMY_LEVELS.map(lvl => {
                const isSelected = settings.aiAutonomy === lvl.id
                return (
                  <div
                    key={lvl.id}
                    onClick={() => setSettings(p => ({ ...p, aiAutonomy: lvl.id }))}
                    className="card fade-in-up"
                    style={{
                      padding: 'var(--space-4)',
                      cursor: 'pointer',
                      border: isSelected ? '1.5px solid var(--brand-primary)' : '1px solid var(--border-default)',
                      background: isSelected ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: isSelected ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
                          {lvl.title}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
                          {lvl.desc}
                        </div>
                      </div>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          border: isSelected ? '5px solid var(--brand-primary)' : '2px solid var(--border-strong)',
                          background: isSelected ? 'white' : 'transparent',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── ASSISTANT ROUTINES ────────────────────────── */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 'var(--space-3)' }}>
              Daily Assistant Routines
            </div>
            <div className="card fade-in-up" style={{ padding: 'var(--space-4) var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>
                    Morning Briefing
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                    Proactive 8:00 AM daily plan & priority agenda
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.morningBriefing}
                  onChange={v => setSettings(p => ({ ...p, morningBriefing: v }))}
                />
              </div>

              <div style={{ height: 1, background: 'var(--border-subtle)' }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>
                    Accountability Check-ins
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                    Direct follow-ups when tasks are postponed 3+ times
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.accountabilityCheck}
                  onChange={v => setSettings(p => ({ ...p, accountabilityCheck: v }))}
                />
              </div>
            </div>
          </div>

          {/* ── BACKUP, EXPORT & IMPORT DATA ────────────── */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 'var(--space-3)' }}>
              📦 Data Backup & Portability
            </div>

            <div className="card fade-in-up" style={{ padding: 'var(--space-4) var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Export your full SQLite database snapshot (tasks, goals, habits, memories, calendar, expenses) as a JSON file or restore from a backup.
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {/* Export Button */}
                <button
                  className="btn btn-secondary"
                  onClick={handleExportData}
                  disabled={isExporting}
                  id="export-data-btn"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 'var(--text-sm)' }}
                >
                  <span>⬇️</span>
                  <span>{isExporting ? 'Exporting...' : 'Export (JSON)'}</span>
                </button>

                {/* Import File Picker Trigger */}
                <button
                  className="btn btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  id="import-data-btn"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 'var(--text-sm)' }}
                >
                  <span>⬆️</span>
                  <span>{isImporting ? 'Importing...' : 'Import (JSON)'}</span>
                </button>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Import Mode Selector */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Import Mode:</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setImportMode('merge')}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      background: importMode === 'merge' ? 'var(--brand-primary)' : 'transparent',
                      color: importMode === 'merge' ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    Merge
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode('overwrite')}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      background: importMode === 'overwrite' ? 'var(--status-error)' : 'transparent',
                      color: importMode === 'overwrite' ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    Overwrite
                  </button>
                </div>
              </div>

              {/* Feedback Alert */}
              {backupFeedback && (
                <div
                  className="fade-in-up"
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    background:
                      backupFeedback.type === 'success'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : backupFeedback.type === 'error'
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(91, 107, 240, 0.15)',
                    color:
                      backupFeedback.type === 'success'
                        ? 'var(--status-success)'
                        : backupFeedback.type === 'error'
                        ? 'var(--status-error)'
                        : 'var(--brand-primary)',
                  }}
                >
                  {backupFeedback.message}
                </div>
              )}
            </div>
          </div>

          {/* ── SAVE ACTION ─────────────────────────── */}
          <button
            id="settings-save-btn"
            className="btn btn-primary btn-full"
            onClick={saveSettings}
            disabled={saving}
            style={{ marginBottom: 'var(--space-6)' }}
          >
            {saving ? 'Saving...' : saved ? '✓ Saved Successfully' : 'Save Settings'}
          </button>

          {/* ── ONCE ADDED, API KEY OPTION IS AT THE BOTTOM WITH REDUCED OPACITY ── */}
          {apiKeyStatus.hasKey && renderApiKeySection(true)}

          {/* ── DANGER ZONE (RESET DATA) ────────────── */}
          <div style={{ marginTop: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
            <div className="card" style={{ padding: 'var(--space-4) var(--space-5)', border: '1px solid var(--priority-critical-border)', background: 'var(--priority-critical-bg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--priority-critical)' }}>
                    Danger Zone
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--priority-critical)', opacity: 0.85 }}>
                    Wipe all local tasks, memories, and chat threads
                  </div>
                </div>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleFactoryReset}
                  id="factory-reset-btn"
                >
                  Factory Reset
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <BottomNav />
    </div>
  )
}
