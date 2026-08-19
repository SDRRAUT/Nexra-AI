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
