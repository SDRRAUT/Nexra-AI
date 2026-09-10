'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

interface AppHeaderProps {
  title?: string
  subtitle?: string
  showBack?: boolean
  showBrand?: boolean
  rightContent?: React.ReactNode
}

const THEMES = [
  { id: 'indigo', name: 'Indigo Bloom', color: '#5B6BF0', secondary: '#8B5CF6' },
  { id: 'emerald', name: 'Emerald Mint', color: '#059669', secondary: '#10B981' },
  { id: 'sunset', name: 'Sunset Coral', color: '#E11D48', secondary: '#F59E0B' },
  { id: 'amethyst', name: 'Royal Amethyst', color: '#7C3AED', secondary: '#C084FC' },
  { id: 'ocean', name: 'Ocean Blue', color: '#0284C7', secondary: '#06B6D4' },
  { id: 'citrus', name: 'Citrus Gold', color: '#D97706', secondary: '#F59E0B' },
]

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
)

const PaletteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r=".7" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r=".7" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".7" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".7" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
  </svg>
)

const SparkleIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20 }}>
    <path d="M12 2L14.4 8.6L21 11L14.4 13.4L12 20L9.6 13.4L3 11L9.6 8.6L12 2Z" />
  </svg>
)

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export default function AppHeader({ title, subtitle, showBack, showBrand = true, rightContent }: AppHeaderProps) {
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const [showThemes, setShowThemes] = useState(false)
  const [activeTheme, setActiveTheme] = useState('indigo')
  const [assistantName, setAssistantName] = useState('Srushti')
  const [userName, setUserName] = useState('You')
  const themeMenuRef = useRef<HTMLDivElement>(null)

  // Initialize theme, assistant name, and user name from storage
  useEffect(() => {
    const savedTheme = localStorage.getItem('srushti_theme') || 'indigo'
    setActiveTheme(savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme)
    document.body.setAttribute('data-theme', savedTheme)

    const loadProfileData = () => {
      const name = localStorage.getItem('srushti_assistant_name') || 'Srushti'
      setAssistantName(name)
      const user = localStorage.getItem('srushti_user_name') || 'You'
      setUserName(user)
    }
    loadProfileData()

    window.addEventListener('srushti_data_changed', loadProfileData)
    return () => window.removeEventListener('srushti_data_changed', loadProfileData)
  }, [])

  const selectTheme = (themeId: string) => {
    setActiveTheme(themeId)
    localStorage.setItem('srushti_theme', themeId)
    document.documentElement.setAttribute('data-theme', themeId)
    document.body.setAttribute('data-theme', themeId)
    setShowThemes(false)
  }

  // Click outside to close theme popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setShowThemes(false)
      }
    }
    if (showThemes) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showThemes])

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications')
        const data = await res.json()
        const unread = data.filter((n: any) => n.status === 'unread').length
        setUnreadCount(unread)
      } catch {}
    }
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const userInitial = (userName.trim()[0] || 'Y').toUpperCase()

  return (
    <header className="app-header">
      <div className="flex items-center gap-2.5">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="header-back-btn"
            id="header-back-btn"
            aria-label="Go back"
          >
            <BackIcon />
          </button>
        )}

        {showBrand && !showBack && (
          <div
            className="app-header-brand"
            onClick={() => router.push('/')}
            title="Home"
          >
            <div className="header-avatar-orb">
              <SparkleIcon />
            </div>
            <div className="header-brand-info">
              <div className="header-title-row">
                <span className="app-header-name">{assistantName}</span>
                <span className="header-status-pill">AI</span>
              </div>
              <div className="app-header-team-pill">
                <span className="team-pill-dot" />
                <span>BY TEAM SDR</span>
              </div>
            </div>
          </div>
        )}

        {(title || subtitle) && (
          <div style={{ marginLeft: showBack ? 2 : 0 }}>
            {title && (
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
                lineHeight: 1.2
              }}>
                {title}
              </div>
            )}
            {subtitle && (
              <div style={{
                fontSize: '11.5px',
                fontWeight: 500,
                color: 'var(--text-tertiary)',
                marginTop: '1px'
              }}>
                {subtitle}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="app-header-actions" ref={themeMenuRef}>
        {rightContent ? (
          rightContent
        ) : (
          <>
            {/* Theme switcher */}
            <button
              className={`header-action-btn ${showThemes ? 'active' : ''}`}
              onClick={() => setShowThemes(!showThemes)}
              title="Change Theme"
              id="header-theme-btn"
              aria-label="Theme settings"
            >
              <PaletteIcon />
            </button>

            {/* Notifications */}
            <button
              className="header-action-btn"
              onClick={() => router.push('/notifications')}
              title="Notifications"
              id="header-notif-btn"
              aria-label="Notifications"
            >
              <BellIcon />
              {unreadCount > 0 && <span className="header-badge-dot" />}
            </button>

            {/* User Profile Avatar */}
            <button
              className="header-user-avatar"
              onClick={() => router.push('/settings')}
              title={`Settings (${userName})`}
              id="header-profile-btn"
              aria-label="User profile settings"
            >
              {userInitial}
            </button>
          </>
        )}

        {/* Floating Theme Dropdown */}
        {showThemes && (
          <div className="theme-dropdown">
            <div className="theme-dropdown-header">Color Theme</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {THEMES.map(theme => (
                <button
                  key={theme.id}
                  className={`theme-dropdown-item ${activeTheme === theme.id ? 'active' : ''}`}
                  onClick={() => selectTheme(theme.id)}
                >
                  <div className="theme-item-left">
                    <span
                      className="theme-color-dot"
                      style={{ background: `linear-gradient(135deg, ${theme.color}, ${theme.secondary})` }}
                    />
                    <span className="theme-item-name">{theme.name}</span>
                  </div>
                  {activeTheme === theme.id && (
                    <span style={{ color: 'var(--brand-primary)' }}>
                      <CheckIcon />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
