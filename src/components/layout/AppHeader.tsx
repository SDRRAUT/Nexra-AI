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
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15,18 9,12 15,6" />
  </svg>
)

const PaletteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
  </svg>
)

export default function AppHeader({ title, subtitle, showBack, showBrand = true, rightContent }: AppHeaderProps) {
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const [showThemes, setShowThemes] = useState(false)
  const [activeTheme, setActiveTheme] = useState('indigo')
  const themeMenuRef = useRef<HTMLDivElement>(null)

  // Initialize theme from storage
  useEffect(() => {
    const saved = localStorage.getItem('srushti_theme') || 'indigo'
    setActiveTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
    document.body.setAttribute('data-theme', saved)
  }, [])

  const selectTheme = (themeId: string) => {
    setActiveTheme(themeId)
    localStorage.setItem('srushti_theme', themeId)
    document.documentElement.setAttribute('data-theme', themeId)
    document.body.setAttribute('data-theme', themeId)
    setShowThemes(false)
  }

  // Click outside to close
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

  return (
    <header className="app-header">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="btn-icon btn btn-secondary"
            id="header-back-btn"
          >
            <BackIcon />
          </button>
        )}
        {showBrand && !showBack && (
          <div className="app-header-brand" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
            <span className="app-header-name">Srushti</span>
            <span className="app-header-sub">~ By Team SDR</span>
          </div>
        )}
        {(title || subtitle) && (
          <div>
            {title && <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>}
            {subtitle && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{subtitle}</div>}
          </div>
        )}
      </div>

      <div className="app-header-actions" style={{ position: 'relative' }}>
        {rightContent}

        {/* Colorful Theme Palette Button */}
        <button
          className="notif-btn"
          onClick={() => setShowThemes(!showThemes)}
          title="Change Color Theme"
          id="header-theme-btn"
        >
          <PaletteIcon />
        </button>

        {/* Notification Bell */}
        <button
          className="notif-btn"
          onClick={() => router.push('/notifications')}
          id="header-notifications-btn"
        >
          <BellIcon />
          {unreadCount > 0 && <span className="notif-badge" />}
        </button>

        {/* Colorful Theme Selector Popup */}
        {showThemes && (
          <div
            ref={themeMenuRef}
            className="card fade-in-up"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: 220,
              zIndex: 100,
              padding: '12px',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-xl)',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-surface)',
            }}
          >
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, padding: '0 4px' }}>
              Color Themes
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => selectTheme(theme.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: activeTheme === theme.id ? 'var(--bg-subtle)' : 'transparent',
                    border: activeTheme === theme.id ? '1px solid var(--border-default)' : '1px solid transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${theme.color}, ${theme.secondary})`,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: activeTheme === theme.id ? 700 : 500,
                    color: activeTheme === theme.id ? 'var(--brand-primary)' : 'var(--text-primary)',
                    flex: 1,
                  }}>
                    {theme.name}
                  </span>
                  {activeTheme === theme.id && (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--brand-primary)', fontWeight: 700 }}>✓</span>
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
