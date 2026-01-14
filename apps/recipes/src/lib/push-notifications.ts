import webpush from 'web-push'

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

interface VapidKeys {
  publicKey: string
  privateKey: string
  subject: string
}

function getVapidKeys(env: App.Locals['runtime']['env']): VapidKeys {
  // Robust check for keys
  if (!env.PUBLIC_VAPID_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    throw new Error('Missing VAPID Configuration')
  }
  return {
    publicKey: env.PUBLIC_VAPID_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT,
  }
}

export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: string | object,
  env: App.Locals['runtime']['env'],
) {
  try {
    const keys = getVapidKeys(env)

    // Configure Web Push
    webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey)

    const dataToSend = typeof payload === 'string' ? payload : JSON.stringify(payload)

    // Send
    await webpush.sendNotification(subscription, dataToSend)
    return { success: true }
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string }
    // Check for "Gone" (410) - Subscription is dead
    if (err.statusCode === 410) {
      return { success: false, status: 'gone' }
    }

    console.error('Push Notification Failed:', err)
    return { success: false, error: err.message || 'Unknown Error' }
  }
}

import { db } from './firebase-server'

export async function sendFamilyPush(
  familyId: string,
  excludeUserId: string,
  payload: { title: string; body: string; url?: string; type: 'mealPlan' | 'cooking' | 'invites' },
  env: App.Locals['runtime']['env'],
) {
  try {
    // 1. Get family members
    const familyDoc = await db.getDocument('families', familyId)
    if (!familyDoc || !familyDoc.members) return

    const members: string[] = familyDoc.members

    // 2. Iterate and send (parallel for speed)
    await Promise.all(
      members
        .filter((mid) => mid !== excludeUserId)
        .map(async (memberId) => {
          try {
            // Check User Preferences FIRST
            const memberDoc = await db.getDocument('users', memberId)
            const prefs = memberDoc?.notificationPreferences

            // Default to TRUE if no prefs set (Opt-out model)
            // But if prefs exist, check the specific flag
            if (prefs) {
              if (prefs.types && prefs.types[payload.type] === false) {
                return // User opted out (New)
              }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              if ((prefs as any)[payload.type] === false) {
                return // User opted out (Legacy)
              }
            }

            // Get subscriptions for this user from subcollection
            const subscriptions = await db.getCollection(`users/${memberId}/push_subscriptions`)

            if (!subscriptions || subscriptions.length === 0) return

            // Send to all user's devices
            await Promise.all(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              subscriptions.map((sub: any) =>
                sendPushNotification(
                  sub,
                  {
                    title: payload.title,
                    body: payload.body,
                    url: payload.url,
                  },
                  env,
                ),
              ),
            )
          } catch (e) {
            console.error(`Failed to notify member ${memberId}:`, e)
            // Continue to next member
          }
        }),
    )
  } catch (e) {
    console.error('sendFamilyPush failed:', e)
  }
}
