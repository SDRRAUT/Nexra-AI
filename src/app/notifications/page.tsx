'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import { format, formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  title: string
  body?: string
  type: string
  status: string
  actionType?: string
  actionData?: string
  createdAt: string
  relatedTaskId?: string
}

const typeStyles: Record<string, { icon: string; bg: string; color: string; label: string }> = {
  critical: { icon: '🚨', bg: 'var(--priority-critical-bg)', color: 'var(--priority-critical)', label: 'Critical' },
  warning: { icon: '⚠️', bg: 'var(--priority-high-bg)', color: 'var(--priority-high)', label: 'Warning' },
  accountability: { icon: '🎯', bg: 'var(--priority-medium-bg)', color: 'var(--priority-medium)', label: 'Accountability' },
  reminder: { icon: '🔔', bg: 'var(--bg-subtle)', color: 'var(--brand-primary)', label: 'Reminder' },
  info: { icon: 'ℹ️', bg: 'var(--bg-muted)', color: 'var(--text-secondary)', label: 'Info' },
  approval: { icon: '✅', bg: '#F0FDF4', color: 'var(--brand-accent)', label: 'Approval' },
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | 'alerts'>('all')
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      setNotifications(Array.isArray(data) ? data : [])
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const markRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'read' }),
    })
    fetchNotifications()
  }

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'all', status: 'read' }),
    })
    fetchNotifications()
  }

  const deleteNotification = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    await fetch(`/api/notifications?id=${id}`, {
      method: 'DELETE',
    })
    fetchNotifications()
  }

  const clearAll = async () => {
    if (confirm('Clear all notifications?')) {
      await fetch('/api/notifications?id=all', {
        method: 'DELETE',
      })
      fetchNotifications()
    }
  }

  const sendTestAlert = async () => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '🌱 Srushti Accountability Check',
        body: 'You planned "Review Lecture Notes" for today. Are you ready to begin your focus block?',
        type: 'accountability',
        actionType: 'start_now,reschedule',
      }),
    })
    fetchNotifications()
  }

  const unreadList = notifications.filter(n => n.status === 'unread')

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return n.status === 'unread'
    if (filter === 'alerts') return ['critical', 'warning', 'accountability'].includes(n.type)
    return true
  })

  return (
    <div className="app-shell">
      <AppHeader />

      <div className="page-content">
        <div className="page-section" style={{ marginTop: 'var(--space-4)' }}>

          {/* ── NOTIFICATIONS HERO ─────────────────────────── */}
          <div
            className="card fade-in-up"
            style={{
              padding: 'var(--space-5)',
              background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-subtle))',
              border: '1px solid var(--border-default)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  INBOX & ALERTS
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Notifications
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {unreadList.length} unread updates waiting
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {unreadList.length > 0 && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={markAllRead}
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                  >
                    Mark All Read
                  </button>
                )}
                <button
                  className="btn btn-primary btn-sm"
                  onClick={sendTestAlert}
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                  title="Simulate AI alert"
                >
                  + Test Alert
                </button>
              </div>
            </div>
          </div>

          {/* ── FILTER PILLS ─────────────────────────── */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', background: 'var(--bg-muted)', borderRadius: 'var(--radius-full)', padding: '3px', marginBottom: 'var(--space-4)' }}>
            {(['all', 'unread', 'alerts'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  transition: 'all var(--transition-fast)',
                  background: filter === f ? 'var(--bg-surface)' : 'transparent',
                  color: filter === f ? 'var(--brand-primary)' : 'var(--text-tertiary)',
                  boxShadow: filter === f ? 'var(--shadow-sm)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {f === 'unread' ? `Unread (${unreadList.length})` : f}
              </button>
            ))}
          </div>

          {/* ── NOTIFICATIONS FEED ─────────────────────────── */}
          {loading && (
            <>
              <div className="skeleton" style={{ height: 90, borderRadius: 16, marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 90, borderRadius: 16 }} />
            </>
          )}

          {!loading && filteredNotifications.length === 0 && (
            <div className="card fade-in-up">
              <div className="empty-state" style={{ padding: 'var(--space-8) var(--space-4)' }}>
                <div className="empty-icon">🔔</div>
                <div className="empty-title">You're all caught up!</div>
                <div className="empty-sub">
                  No notifications match this filter. Srushti will proactively alert you about schedule conflicts or upcoming deadlines.
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={sendTestAlert}
                  style={{ marginTop: 'var(--space-4)' }}
                >
                  Send Sample AI Check-in
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
            {filteredNotifications.map(notif => {
              const style = typeStyles[notif.type] || typeStyles.info
              const isUnread = notif.status === 'unread'

              return (
                <div
                  key={notif.id}
                  className="card fade-in-up"
                  onClick={() => isUnread && markRead(notif.id)}
                  style={{
                    border: isUnread ? `1.5px solid ${style.color}40` : '1px solid var(--border-subtle)',
                    background: isUnread ? 'var(--bg-surface)' : 'var(--bg-subtle)',
                    position: 'relative',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{ padding: 'var(--space-4) var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 'var(--radius-md)',
                          background: style.bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20,
                          flexShrink: 0,
                          border: `1px solid ${style.color}30`,
                        }}
                      >
                        {style.icon}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>
                            {notif.title}
                          </div>
                          {isUnread && (
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: 'var(--brand-primary)',
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </div>

                        {notif.body && (
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
                            {notif.body}
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: style.color,
                                background: style.bg,
                                padding: '1px 6px',
                                borderRadius: 'var(--radius-full)',
                              }}
                            >
                              {style.label}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                              {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            {isUnread && (
                              <button
                                onClick={(e) => markRead(notif.id, e)}
                                style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brand-primary)' }}
                              >
                                Read
                              </button>
                            )}
                            <button
                              onClick={(e) => deleteNotification(notif.id, e)}
                              style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}
                              title="Delete"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>

                        {/* Action buttons */}
                        {notif.actionType && (
                          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border-subtle)' }}>
                            {notif.actionType.split(',').map(action => (
                              <button
                                key={action}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '11px', padding: '4px 10px', textTransform: 'capitalize' }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  sessionStorage.setItem('srushti_prefill', `Regarding notification: ${notif.title} — let's handle this action: ${action}`)
                                  router.push('/chat')
                                }}
                              >
                                {action.replace('_', ' ')} →
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Clear all footer */}
          {notifications.length > 0 && (
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
              <button
                onClick={clearAll}
                style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 600, textDecoration: 'underline' }}
              >
                Clear all notifications
              </button>
            </div>
          )}

        </div>
      </div>

      <BottomNav />
    </div>
  )
}
