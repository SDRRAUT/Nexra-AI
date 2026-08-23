'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import { format, formatDistanceToNow } from 'date-fns'
import {
  sendNativeNotification,
  requestNotificationPermission,
  getPendingScheduledNotifications,
  syncAllActiveReminders,
} from '@/lib/notifications/native'
import { localDb, type LocalNotification, type LocalTask } from '@/lib/db/localDb'
import { toggleClientTask } from '@/lib/data/clientData'

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
  critical: { icon: '🚨', bg: 'var(--priority-critical-bg, rgba(239,68,68,0.1))', color: 'var(--priority-critical, #EF4444)', label: 'Critical' },
  warning: { icon: '⚠️', bg: 'var(--priority-high-bg, rgba(249,115,22,0.1))', color: 'var(--priority-high, #F97316)', label: 'Warning' },
  accountability: { icon: '🎯', bg: 'var(--priority-medium-bg, rgba(59,130,246,0.1))', color: 'var(--priority-medium, #3B82F6)', label: 'Accountability' },
  reminder: { icon: '🔔', bg: 'rgba(91,107,240,0.12)', color: 'var(--brand-primary, #5B6BF0)', label: 'Reminder' },
  info: { icon: 'ℹ️', bg: 'var(--bg-muted)', color: 'var(--text-secondary)', label: 'Info' },
  approval: { icon: '✅', bg: 'rgba(16,185,129,0.12)', color: 'var(--brand-accent, #10B981)', label: 'Approval' },
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [scheduledTasks, setScheduledTasks] = useState<LocalTask[]>([])
  const [pendingCapacitorNotifs, setPendingCapacitorNotifs] = useState<any[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | 'scheduled'>('all')
  const [loading, setLoading] = useState(true)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  const fetchNotifications = async () => {
    try {
      // 1. Load local IndexedDB notifications
      const localNotifs = await localDb.notifications.orderBy('createdAt').reverse().toArray().catch(() => [])
      setNotifications(localNotifs as any)

      // 2. Load scheduled active tasks
      const now = new Date().toISOString()
      const allTasks = await localDb.tasks.toArray().catch(() => [])
      const upcoming = allTasks.filter(t => t.status !== 'completed' && ((t.scheduledStart && t.scheduledStart > now) || (t.deadline && t.deadline > now)))
      setScheduledTasks(upcoming)

      // 3. Load pending native notifications
      const pending = await getPendingScheduledNotifications()
      setPendingCapacitorNotifs(pending)
    } catch (e) {
      console.error('Error loading notifications:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()

    // Check permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasPermission(Notification.permission === 'granted')
    }

    const handleDataChanged = () => {
      fetchNotifications()
    }
    window.addEventListener('srushti_data_changed', handleDataChanged)
    return () => window.removeEventListener('srushti_data_changed', handleDataChanged)
  }, [])

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission()
    setHasPermission(granted)
    if (granted) {
      await syncAllActiveReminders()
      alert('🔔 Notifications enabled! Your alarms and morning briefings will ring on time.')
    }
  }

  const markRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    await localDb.notifications.update(id, { status: 'read' }).catch(() => {})
    fetchNotifications()
  }

  const markAllRead = async () => {
    const all = await localDb.notifications.toArray().catch(() => [])
    await Promise.all(all.map(n => localDb.notifications.update(n.id, { status: 'read' }))).catch(() => {})
    fetchNotifications()
  }

  const deleteNotification = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    await localDb.notifications.delete(id).catch(() => {})
    fetchNotifications()
  }

  const clearAll = async () => {
    if (confirm('Clear all notification history?')) {
      await localDb.notifications.clear().catch(() => {})
      fetchNotifications()
    }
  }

  const sendTestAlert = async () => {
    const alertTitle = '🔔 Test Notification'
    const alertBody = 'Your Personal Assistant notification engine is active with real-time sound and lockscreen alerts!'

    await localDb.notifications.add({
      id: `notif-test-${Date.now()}`,
      title: alertTitle,
      body: alertBody,
      type: 'reminder',
      status: 'unread',
      createdAt: new Date().toISOString(),
    }).catch(() => {})

    // Trigger native OS lockscreen notification
    await sendNativeNotification({
      title: alertTitle,
      body: alertBody,
    })

    fetchNotifications()
  }

  const handleSyncReminders = async () => {
    await syncAllActiveReminders()
    fetchNotifications()
    alert('✅ Synced all active task reminders, daily habit nudges, and 8:00 AM morning briefings with your phone.')
  }

  const handleCompleteTask = async (taskId: string, notifId?: string) => {
    await toggleClientTask(taskId, true).catch(() => {})
    if (notifId) {
      await localDb.notifications.update(notifId, { status: 'read' }).catch(() => {})
    }
    fetchNotifications()
  }

  const unreadList = notifications.filter(n => n.status === 'unread')

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return n.status === 'unread'
    if (filter === 'scheduled') return false
    return true
  })

  return (
    <div className="app-shell">
      <AppHeader title="Notifications" subtitle="Alerts & Scheduled Reminders" showBrand={false} showBack={false} />

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
                  NOTIFICATION CENTER
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Reminders & Alarms
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {unreadList.length} unread alerts · {scheduledTasks.length} upcoming scheduled
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={sendTestAlert}
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                  title="Test notification on this phone"
                >
                  🔔 Test
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSyncReminders}
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                  title="Sync all active task alarms"
                >
                  🔄 Sync
                </button>
              </div>
            </div>
          </div>

          {/* ── PERMISSION PROMPT BANNER (IF NOT GRANTED) ─── */}
          {hasPermission === false && (
            <div
              className="card fade-in-up"
              style={{
                padding: 'var(--space-3) var(--space-4)',
                background: 'linear-gradient(90deg, rgba(239,68,68,0.12), var(--bg-surface))',
                border: '1px solid var(--status-error, #EF4444)',
                marginBottom: 'var(--space-4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>⚠️</span>
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Enable Push Notifications
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Allow alerts so your phone rings on time for scheduled reminders & morning briefings.
                  </div>
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleRequestPermission}
                style={{ fontSize: '11px', whiteSpace: 'nowrap' }}
              >
                Enable
              </button>
            </div>
          )}

          {/* ── FILTER CHIPS ─────────────────────────── */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', overflowX: 'auto' }}>
            <button
              className={`chip ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                border: 'none',
                background: filter === 'all' ? 'var(--brand-primary)' : 'var(--bg-muted)',
                color: filter === 'all' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              All Alerts ({notifications.length})
            </button>
            <button
              className={`chip ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                border: 'none',
                background: filter === 'unread' ? 'var(--brand-primary)' : 'var(--bg-muted)',
                color: filter === 'unread' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Unread ({unreadList.length})
            </button>
            <button
              className={`chip ${filter === 'scheduled' ? 'active' : ''}`}
              onClick={() => setFilter('scheduled')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                border: 'none',
                background: filter === 'scheduled' ? 'var(--brand-primary)' : 'var(--bg-muted)',
                color: filter === 'scheduled' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              ⏰ Scheduled Queue ({scheduledTasks.length})
            </button>
          </div>

          {/* ── SCHEDULED QUEUE VIEW ─────────────────────────── */}
          {filter === 'scheduled' ? (
            <div>
              {scheduledTasks.length === 0 ? (
                <div className="card fade-in-up" style={{ padding: 'var(--space-8) var(--space-4)', textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 'var(--space-2)' }}>⏰</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                    No Upcoming Scheduled Reminders
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', maxWidth: 280, margin: '6px auto 16px' }}>
                    Tell your Assistant in Chat: &quot;Remind me tomorrow at 9 AM to review notes&quot; to schedule alarms.
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => router.push('/chat')}>
                    Ask AI in Chat
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {scheduledTasks.map(task => {
                    const timeStr = task.scheduledStart || task.deadline
                    const taskDate = timeStr ? new Date(timeStr) : null

                    return (
                      <div
                        key={task.id}
                        className="card fade-in-up"
                        style={{
                          padding: 'var(--space-3) var(--space-4)',
                          borderLeft: '4px solid var(--brand-primary)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                              ⏰ {task.title}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 2 }}>
                              {taskDate ? `Scheduled for ${format(taskDate, 'EEE, MMM d · h:mm a')} (${formatDistanceToNow(taskDate, { addSuffix: true })})` : 'Scheduled'}
                            </div>
                          </div>

                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleCompleteTask(task.id)}
                            style={{ fontSize: '11px' }}
                          >
                            ✓ Mark Done
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ── ALL / UNREAD NOTIFICATIONS LIST ─────────────────────────── */
            <div>
              {filteredNotifications.length === 0 ? (
                <div className="card fade-in-up" style={{ padding: 'var(--space-8) var(--space-4)', textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 'var(--space-2)' }}>✨</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                    You&apos;re all caught up!
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', maxWidth: 280, margin: '6px auto 16px' }}>
                    No unread alerts. Your Assistant will alert you when tasks are due or when focus blocks start.
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={sendTestAlert}>
                    Send Test Alert
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {filteredNotifications.map(n => {
                    const isUnread = n.status === 'unread'
                    const style = typeStyles[n.type] || typeStyles.info

                    return (
                      <div
                        key={n.id}
                        className="card fade-in-up"
                        style={{
                          padding: 'var(--space-3) var(--space-4)',
                          borderLeft: `4px solid ${style.color}`,
                          background: isUnread ? 'linear-gradient(90deg, rgba(91,107,240,0.06), var(--bg-surface))' : 'var(--bg-surface)',
                          cursor: 'pointer',
                        }}
                        onClick={() => markRead(n.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 'var(--radius-md)',
                              background: style.bg,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 18,
                              flexShrink: 0,
                            }}
                          >
                            {style.icon}
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {n.title}
                              </div>
                              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                                {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : ''}
                              </span>
                            </div>

                            {n.body && (
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
                                {n.body}
                              </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    sessionStorage.setItem('srushti_prefill', `Regarding notification: "${n.title}" — let's handle this.`)
                                    router.push('/chat')
                                  }}
                                  style={{ fontSize: '11px', padding: '2px 8px' }}
                                >
                                  Ask Assistant
                                </button>
                              </div>

                              <div style={{ display: 'flex', gap: 6 }}>
                                {isUnread && (
                                  <button
                                    onClick={(e) => markRead(n.id, e)}
                                    style={{ border: 'none', background: 'none', fontSize: '11px', color: 'var(--brand-primary)', cursor: 'pointer', fontWeight: 600 }}
                                  >
                                    Mark Read
                                  </button>
                                )}
                                <button
                                  onClick={(e) => deleteNotification(n.id, e)}
                                  style={{ border: 'none', background: 'none', fontSize: '11px', color: 'var(--text-tertiary)', cursor: 'pointer' }}
                                >
                                  Dismiss
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {notifications.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 'var(--space-4)' }}>
                      {unreadList.length > 0 && (
                        <button className="btn btn-secondary btn-sm" onClick={markAllRead}>
                          Mark All as Read
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={clearAll} style={{ color: 'var(--status-error)' }}>
                        Clear History
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      <BottomNav />
    </div>
  )
}
