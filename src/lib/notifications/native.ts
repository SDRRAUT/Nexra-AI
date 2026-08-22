import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'

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
      name: 'Srushti Schedule & Task Reminders',
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
      name: 'Srushti Accountability Nudges',
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
    const perm = await Notification.requestPermission()
    return perm === 'granted'
  }
  return false
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
  } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    if (!options.scheduleAt || options.scheduleAt <= new Date()) {
      new Notification(options.title, {
        body: options.body,
        icon: '/icon-192.png',
      })
      return true
    }
  }

  return false
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

    const assistantName = (typeof localStorage !== 'undefined' ? localStorage.getItem('srushti_assistant_name') : 'Srushti') || 'Srushti'
    const userName = (typeof localStorage !== 'undefined' ? localStorage.getItem('srushti_user_name') : 'Sanket') || 'Sanket'

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
 * Schedules a pre-alarm 15 minutes before a task is scheduled to start
 */
export async function scheduleTaskReminder(task: { id: string; title: string; scheduledTime?: string; dueDate?: string }) {
  if (!Capacitor.isNativePlatform() || !task.scheduledTime) return

  try {
    const [h, m] = task.scheduledTime.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return

    const target = new Date()
    target.setHours(h, m, 0, 0)
    // 15 minutes before
    target.setMinutes(target.getMinutes() - 15)

    if (target <= new Date()) return // In the past

    // Generate a unique integer ID from task.id
    const numericId = Math.abs(task.id.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)) % 1000000

    await LocalNotifications.schedule({
      notifications: [
        {
          id: numericId,
          title: `⚡ Upcoming Task: ${task.title}`,
          body: `Starting in 15 minutes (${task.scheduledTime}). Get ready to focus!`,
          channelId: SrushtiNotificationChannels.REMINDERS,
          schedule: { at: target, allowWhileIdle: true },
          sound: 'res_default_notification',
          smallIcon: 'ic_stat_notification',
          iconColor: '#5B6BF0',
        },
      ],
    })
  } catch (e) {
    console.warn('Failed to schedule task reminder:', e)
  }
}

/**
 * Schedules daily habit reminder
 */
export async function scheduleHabitReminder(habit: { id: string; title: string; scheduledTime?: string }) {
  if (!Capacitor.isNativePlatform() || !habit.scheduledTime) return

  try {
    const [h, m] = habit.scheduledTime.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return

    const target = new Date()
    target.setHours(h, m, 0, 0)
    if (target <= new Date()) {
      target.setDate(target.getDate() + 1)
    }

    const numericId = Math.abs(habit.id.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)) % 1000000

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
  } catch (e) {
    console.warn('Failed to schedule habit reminder:', e)
  }
}
