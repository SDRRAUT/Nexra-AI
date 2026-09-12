import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'
import { localDb } from '@/lib/db/localDb'

export const SrushtiNotificationChannels = {
  REMINDERS: 'srushti_reminders_channel',
  ACCOUNTABILITY: 'srushti_accountability_channel',
}

/**
 * Initialize high-priority notification channels for Android Lockscreen & Heads-up alerts
 */
export async function initializeNotificationChannels() {
  if (!Capacitor.isNativePlatform()) return

  try {
    // Create high importance channel for reminders on lockscreen
    await LocalNotifications.createChannel({
      id: SrushtiNotificationChannels.REMINDERS,
      name: 'Personal Assistant Reminders & Alarms',
      description: 'Important alarms, task reminders, and schedule updates',
      importance: 5, // Max importance (Heads-up banner + Sound + Lockscreen)
      visibility: 1, // Visible on secure lockscreen
      sound: 'res_default_notification',
      vibration: true,
      lights: true,
      lightColor: '#5B6BF0',
    })

    // Create high importance channel for accountability nudges
    await LocalNotifications.createChannel({
      id: SrushtiNotificationChannels.ACCOUNTABILITY,
      name: 'Personal Assistant Accountability Nudges',
      description: 'Accountability follow-ups for postponed tasks and deadlines',
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#FF6B6B',
    })
  } catch (err) {
    console.warn('Failed to create notification channels:', err)
  }
}

/**
 * Request Notification Permissions from OS
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.requestPermissions()
      return status.display === 'granted'
    } catch (e) {
      console.warn('Capacitor permission request failed', e)
      return false
    }
  } else if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const perm = await Notification.requestPermission()
      return perm === 'granted'
    } catch {
      return false
    }
  }
  return false
}
const scheduledWebTimers = new Map<number, any>()
const notifiedIds = new Set<string>()

/**
 * Play a gentle high-priority notification chime using Web Audio API
 */
export function playNotificationChime() {
  if (typeof window === 'undefined') return
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15) // A5
    gain.gain.setValueAtTime(0.35, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
  } catch {}
}

/**
 * Schedule a native OS notification (displays on lockscreen even when device is locked)
 */
export async function sendNativeNotification(options: {
  id?: number
  title: string
  body: string
  scheduleAt?: Date
  actionType?: string
  data?: Record<string, any>
}) {
  const notifId = options.id || Math.floor(Math.random() * 1000000)

  // 1. Native Capacitor (Android)
  if (Capacitor.isNativePlatform()) {
    try {
      await initializeNotificationChannels()

      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: options.title,
            body: options.body,
            channelId: SrushtiNotificationChannels.REMINDERS,
            schedule: options.scheduleAt ? { at: options.scheduleAt, allowWhileIdle: true } : undefined,
            sound: 'res_default_notification',
            smallIcon: 'ic_stat_notification',
            iconColor: '#5B6BF0',
            extra: options.data,
          },
        ],
      })
      return true
    } catch (err) {
      console.error('Failed to schedule Capacitor notification:', err)
    }
  }

  // 2. Web / Desktop Browser Notification Support
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission !== 'granted') {
      try {
        await Notification.requestPermission()
      } catch {}
    }

    if (Notification.permission === 'granted') {
      const now = Date.now()
      const scheduleTime = options.scheduleAt ? options.scheduleAt.getTime() : now

      if (scheduleTime <= now + 1000) {
        // Immediate notification
        try {
          new Notification(options.title, {
            body: options.body,
            icon: '/icon-192.png',
          })
          playNotificationChime()
        } catch {}
        return true
      } else {
        // Future scheduled notification
        const delay = Math.max(0, scheduleTime - now)
        if (delay <= 24 * 3600 * 1000) {
          if (scheduledWebTimers.has(notifId)) {
            clearTimeout(scheduledWebTimers.get(notifId))
          }
          const timer = setTimeout(() => {
            try {
              new Notification(options.title, {
                body: options.body,
                icon: '/icon-192.png',
              })
              playNotificationChime()
            } catch {}
            scheduledWebTimers.delete(notifId)
          }, delay)
          scheduledWebTimers.set(notifId, timer)
          return true
        }
      }
    }
  }

  return false
}

/**
 * Schedule Custom Reminder from AI or User UI
 */
export async function scheduleCustomReminder(options: {
  title: string
  body?: string
  scheduleAt: Date
  actionType?: string
  taskId?: string
}) {
  const numericId = Math.floor(Math.random() * 900000) + 100000
  const rawAssistantName = typeof localStorage !== 'undefined' ? localStorage.getItem('srushti_assistant_name') : 'Nexra'
  const assistantName = (!rawAssistantName || rawAssistantName === 'Srushti' || rawAssistantName === 'Spark' || rawAssistantName === 'Personal Assistant') ? 'Nexra' : rawAssistantName
  const body = options.body || `${assistantName} reminder: ${options.title}`

  // 1. Save to local IndexedDB notifications
  await localDb.notifications.add({
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: options.title,
    body,
    type: 'reminder',
    status: 'unread',
    actionType: options.actionType || 'task',
    createdAt: options.scheduleAt.toISOString(),
  }).catch(() => {})

  // 2. Schedule native alarm on Android & Web
  await sendNativeNotification({
    id: numericId,
    title: `🔔 ${options.title}`,
    body,
    scheduleAt: options.scheduleAt,
    actionType: options.actionType || 'task',
    data: { taskId: options.taskId },
  })

  // 3. Notify app components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('srushti_data_changed'))
  }

  return numericId
}

/**
 * Schedules a daily recurring 8:00 AM Morning Briefing alarm
 */
export async function scheduleDailyMorningBriefing(hour = 8, minute = 0) {
  if (!Capacitor.isNativePlatform()) return

  try {
    await initializeNotificationChannels()

    const scheduledDate = new Date()
    scheduledDate.setHours(hour, minute, 0, 0)
    if (scheduledDate <= new Date()) {
      scheduledDate.setDate(scheduledDate.getDate() + 1)
    }

    const rawAssistantName = typeof localStorage !== 'undefined' ? localStorage.getItem('srushti_assistant_name') : 'Nexra'
    const assistantName = (!rawAssistantName || rawAssistantName === 'Srushti' || rawAssistantName === 'Spark' || rawAssistantName === 'Personal Assistant') ? 'Nexra' : rawAssistantName
    const userName = (typeof localStorage !== 'undefined' ? localStorage.getItem('srushti_user_name') : 'You') || 'You'

    await LocalNotifications.schedule({
      notifications: [
        {
          id: 888001,
          title: `☀️ Good Morning, ${userName}!`,
          body: `${assistantName} has planned your focus blocks and priorities for today. Tap to view your briefing!`,
          channelId: SrushtiNotificationChannels.REMINDERS,
          schedule: {
            at: scheduledDate,
            repeats: true,
            every: 'day',
            allowWhileIdle: true,
          },
          sound: 'res_default_notification',
          smallIcon: 'ic_stat_notification',
          iconColor: '#5B6BF0',
        },
      ],
    })
  } catch (e) {
    console.warn('Failed to schedule daily briefing notification:', e)
  }
}

/**
 * Schedules a pre-alarm and focus reminder for ANY task (with scheduled time, deadline, or general today plan)
 */
export async function scheduleTaskReminder(task: {
  id: string
  title: string
  priority?: string
  scheduledStart?: string
  deadline?: string
  status?: string
}) {
  if (task.status === 'completed' || task.status === 'cancelled') return

  try {
    const numericId = Math.abs(task.id.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)) % 1000000

    let effectiveTime: Date | null = null
    let alertBody = `Time to focus on: ${task.title}`

    if (task.scheduledStart) {
      const targetDate = new Date(task.scheduledStart)
      if (!isNaN(targetDate.getTime()) && targetDate > new Date()) {
        // Trigger 10 minutes prior
        const alertTime = new Date(targetDate.getTime() - 10 * 60000)
        effectiveTime = alertTime > new Date() ? alertTime : targetDate
        alertBody = `Scheduled for ${targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Priority: ${task.priority || 'medium'}.`
      }
    } else if (task.deadline) {
      const deadlineDate = new Date(task.deadline)
      if (!isNaN(deadlineDate.getTime()) && deadlineDate > new Date()) {
        const alertTime = new Date(deadlineDate.getTime() - 30 * 60000)
        effectiveTime = alertTime > new Date() ? alertTime : deadlineDate
        alertBody = `Deadline approaching at ${deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}!`
      }
    } else {
      // General task planned for today: schedule a reminder in upcoming focus block
      const now = new Date()
      const reminderDate = new Date()
      if (now.getHours() < 12) {
        reminderDate.setHours(12, 0, 0, 0)
      } else if (now.getHours() < 16) {
        reminderDate.setHours(16, 30, 0, 0)
      } else if (now.getHours() < 20) {
        reminderDate.setHours(20, 0, 0, 0)
      } else {
        reminderDate.setDate(reminderDate.getDate() + 1)
        reminderDate.setHours(10, 0, 0, 0)
      }
      effectiveTime = reminderDate
      alertBody = `Priority: ${task.priority || 'medium'}. Remember to tackle this today!`
    }

    if (effectiveTime && effectiveTime > new Date()) {
      await sendNativeNotification({
        id: numericId,
        title: `⚡ Task Reminder: ${task.title}`,
        body: alertBody,
        scheduleAt: effectiveTime,
        actionType: 'task',
        data: { taskId: task.id },
      })
    }
  } catch (e) {
    console.warn('Failed to schedule task reminder:', e)
  }
}

/**
 * Schedules daily habit reminder
 */
export async function scheduleHabitReminder(habit: { id: string; title: string; scheduledTime?: string }) {
  if (!habit.scheduledTime) return

  try {
    const [h, m] = habit.scheduledTime.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return

    const target = new Date()
    target.setHours(h, m, 0, 0)
    if (target <= new Date()) {
      target.setDate(target.getDate() + 1)
    }

    const numericId = Math.abs(habit.id.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)) % 1000000

    if (Capacitor.isNativePlatform()) {
      await initializeNotificationChannels()
      await LocalNotifications.schedule({
        notifications: [
          {
            id: numericId,
            title: `🌱 Habit Reminder: ${habit.title}`,
            body: `Time for your daily ${habit.title}! Keep your streak alive.`,
            channelId: SrushtiNotificationChannels.ACCOUNTABILITY,
            schedule: { at: target, repeats: true, every: 'day', allowWhileIdle: true },
            sound: 'res_default_notification',
            smallIcon: 'ic_stat_notification',
            iconColor: '#10B981',
          },
        ],
      })
    }
  } catch (e) {
    console.warn('Failed to schedule habit reminder:', e)
  }
}

/**
 * Get all pending native scheduled notifications
 */
export async function getPendingScheduledNotifications() {
  if (Capacitor.isNativePlatform()) {
    try {
      const pending = await LocalNotifications.getPending()
      return pending.notifications || []
    } catch {
      return []
    }
  }
  return []
}

/**
 * Sync all active tasks and habits into native alarms
 */
export async function syncAllActiveReminders() {
  try {
    const [tasks, habits] = await Promise.all([
      localDb.tasks.toArray(),
      localDb.habits.toArray(),
    ])

    // Schedule task reminders
    for (const t of tasks) {
      if (t.status !== 'completed' && (t.scheduledStart || t.deadline)) {
        await scheduleTaskReminder(t)
      }
    }

    // Schedule habit reminders
    for (const h of habits) {
      if (h.scheduledTime) {
        await scheduleHabitReminder(h)
      }
    }

    // Schedule morning briefing
    await scheduleDailyMorningBriefing(8, 0)
  } catch (e) {
    console.warn('Error syncing reminders:', e)
  }
}
