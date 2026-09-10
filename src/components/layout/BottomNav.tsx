'use client'

import { usePathname, useRouter } from 'next/navigation'

interface NavItem {
  id: string
  label: string
  path: string
  icon: React.ReactNode
}

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9,22 9,12 15,12 15,22" />
  </svg>
)

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const FilesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
)

const MoreIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
  </svg>
)

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

import { useState, useEffect } from 'react'
import { isOnboardingCompleted } from '@/lib/data/clientData'

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [onboarded, setOnboarded] = useState(false)

  useEffect(() => {
    setMounted(true)
    setOnboarded(isOnboardingCompleted())
  }, [])

  const navItems: NavItem[] = [
    { id: 'home', label: 'Home', path: '/', icon: <HomeIcon /> },
    { id: 'calendar', label: 'Calendar', path: '/calendar', icon: <CalendarIcon /> },
    { id: 'files', label: 'Files', path: '/files', icon: <FilesIcon /> },
    { id: 'more', label: 'More', path: '/more', icon: <MoreIcon /> },
  ]

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  if (!mounted || !onboarded) {
    return null
  }

  return (
    <nav className="bottom-nav">
      {navItems.slice(0, 2).map(item => (
        <button
          key={item.id}
          className={`bottom-nav-item ${isActive(item.path) ? 'active' : ''}`}
          onClick={() => router.push(item.path)}
          id={`nav-${item.id}`}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}

      {/* Center FAB — Chat with Nexra */}
      <div className="bottom-nav-center">
        <button
          className="bottom-nav-fab"
          onClick={() => router.push('/chat')}
          id="nav-chat"
        >
          <ChatIcon />
        </button>
        <span style={{ fontSize: '10px', fontWeight: 600, color: pathname === '/chat' ? 'var(--brand-primary)' : 'var(--text-tertiary)' }}>
          Ask
        </span>
      </div>

      {navItems.slice(2).map(item => (
        <button
          key={item.id}
          className={`bottom-nav-item ${isActive(item.path) ? 'active' : ''}`}
          onClick={() => router.push(item.path)}
          id={`nav-${item.id}`}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
