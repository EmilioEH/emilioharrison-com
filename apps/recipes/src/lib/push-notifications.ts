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
