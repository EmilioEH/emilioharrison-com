import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { Stack, Inline } from '@/components/ui/layout'

// The VAPID Public Key you generated
// In a real app, this should be an env var (PUBLIC_VAPID_KEY)
const PUBLIC_VAPID_KEY = import.meta.env.PUBLIC_VAPID_KEY

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushNotificationManager() {
  const [_permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
      checkSubscription()
    }
  }, [])

  const checkSubscription = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    }
  }

  const subscribe = async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (!PUBLIC_VAPID_KEY) {
        throw new Error('Missing VAPID Configuration on Client')
      }

      const registration = await navigator.serviceWorker.ready

      // Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
      })

      // Send to Backend
      const response = await fetch('/protected/recipes/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      })

      if (!response.ok) {
        throw new Error('Failed to save subscription on server')
      }

      setIsSubscribed(true)
      setPermission('granted')

      // Test Notification
      new Notification('Notifications Enabled', {
        body: 'You will now receive alerts for new feedback.',
        icon: '/protected/recipes/icon-192.png',
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('Subscription failed:', message)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const unsubscribe = async () => {
    setIsLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
      }
      setIsSubscribed(false)
    } catch (err) {
      console.error('Unsubscribe failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null
  }

  // Gracefully handle missing configuration
  if (!PUBLIC_VAPID_KEY) {
    return (
      <Stack
        spacing="md"
        className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/50 dark:bg-yellow-900/20"
      >
        <Inline align="center" justify="between">
          <Stack spacing="xs">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-500">
              Push Notifications Unavailable
            </h3>
            <p className="text-xs text-yellow-700 dark:text-yellow-600">
              System configuration is incomplete (Missing VAPID Key).
            </p>
          </Stack>
          <Badge
            variant="outline"
            className="border-yellow-200 text-yellow-700 dark:border-yellow-800 dark:text-yellow-600"
          >
            System Error
          </Badge>
        </Inline>
      </Stack>
    )
  }

  return (
    <Stack spacing="md" className="rounded-lg border bg-white/50 p-4 dark:bg-black/20">
      <Inline align="center" justify="between">
        <Stack spacing="xs">
          <h3 className="text-sm font-medium">Push Notifications</h3>
          <p className="text-xs text-muted-foreground">Receive alerts instantly on this device.</p>
        </Stack>
        {isSubscribed ? (
          <Badge variant="default" className="bg-green-600">
            Active
          </Badge>
        ) : (
          <Badge variant="outline">Disabled</Badge>
        )}
      </Inline>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <Inline>
        {!isSubscribed ? (
          <Button size="sm" onClick={subscribe} disabled={isLoading} className="w-full gap-2">
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />}
            Enable Notifications
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={unsubscribe}
            disabled={isLoading}
            className="w-full gap-2 text-red-500 hover:bg-red-50 hover:text-red-600"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <BellOff className="size-4" />
            )}
            Disable
          </Button>
        )}
      </Inline>

      <p className="text-[10px] text-muted-foreground">
        Note: iOS requires "Add to Home Screen" for this to work.
      </p>
    </Stack>
  )
}
