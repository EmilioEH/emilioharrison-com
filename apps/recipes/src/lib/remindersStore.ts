import { map } from 'nanostores'

export interface Reminder {
  type: 'weekly_plan' | 'grocery_list' | 'daily_cooking'
  title: string
  body: string
  scheduledFor: string // ISO Date
}

export interface RemindersState {
  missedReminders: Reminder[]
  upcomingReminders: Reminder[]
  lastChecked: string | null
}

export const $reminders = map<RemindersState>({
  missedReminders: [],
  upcomingReminders: [],
  lastChecked: null,
})

const getBaseUrl = () => {
  return import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
}

export const checkReminders = async () => {
  try {
    const res = await fetch(`${getBaseUrl()}api/reminders`)
    if (!res.ok) return

    const data = await res.json()
    const reminders: Reminder[] = data.reminders || []

    const now = new Date()
    const missed: Reminder[] = []
    const upcoming: Reminder[] = []

    reminders.forEach((r) => {
      const scheduledTime = new Date(r.scheduledFor)
      // If scheduled time is in the past (by more than 5 mins?) or just past
      // Let's say if it's within last 24 hours and we missed it?
      // For simplicity: If past, it's missed. If future, it's upcoming.
      if (scheduledTime < now) {
        // Only consider "missed" if it was relatively recent (e.g. last 24h)
        // so we don't show old reminders forever.
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        if (scheduledTime > oneDayAgo) {
          missed.push(r)
        }
      } else {
        upcoming.push(r)
      }
    })

    $reminders.set({
      missedReminders: missed,
      upcomingReminders: upcoming,
      lastChecked: now.toISOString(),
    })

    // Schedule timeouts for upcoming reminders (if within next hour?)
    // Or schedule all if we trust the browser to keep running (it won't).
    // Let's schedule those within next 6 hours?
    upcoming.forEach((r) => {
      const scheduledTime = new Date(r.scheduledFor)
      const diff = scheduledTime.getTime() - now.getTime()

      // If within 6 hours
      if (diff > 0 && diff < 6 * 60 * 60 * 1000) {
        setTimeout(() => {
          triggerNotification(r)
        }, diff)
      }
    })
  } catch (e) {
    console.error('Failed to check reminders', e)
  }
}

const triggerNotification = async (reminder: Reminder) => {
  // Check permission
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  try {
    const registration = await navigator.serviceWorker.ready

    if (registration) {
      // Use the standard API which works on both Mobile and Desktop
      await registration.showNotification(reminder.title, {
        body: reminder.body,
        icon: `${getBaseUrl()}icon-192.png`,
        data: {
          url: `${getBaseUrl()}`, // Used by SW click handler
        },
      })
    }
  } catch (e) {
    console.error('Failed to trigger notification:', e)
  }
}
