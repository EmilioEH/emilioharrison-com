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

/**
 * Wraps a promise with a timeout to prevent infinite waiting.
 * This is critical for navigator.serviceWorker.ready which can hang
 * indefinitely if the Service Worker fails to install/activate.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeoutMs)),
  ])
}

export function PushNotificationManager() {
  const [_permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Robustly waits for the Service Worker to be active.
   */
  const ensureServiceWorkerReady = async (): Promise<ServiceWorkerRegistration> => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported')
    }

    // 1. naive check with slightly longer timeout (5s) for mobile
    const readyRegistration = await withTimeout(
      navigator.serviceWorker.ready,
      5000,
      'SW_READY_TIMEOUT',
    ).catch(() => null)

    if (readyRegistration && readyRegistration.active) {
      return readyRegistration
    }

    // 2. Manual check if ready promise timed out
    let registration = await navigator.serviceWorker.getRegistration()

    // 3. FALLBACK: Self-Healing Registration
    // If no registration exists, we shouldn't just fail. We should try to register it.
    if (!registration) {
      console.log('No SW found, attempting self-registration...')
      try {
        registration = await navigator.serviceWorker.register('/protected/recipes/sw.js')
        console.log('Self-registration successful:', registration)
      } catch (regError) {
        console.error('Self-registration failed:', regError)
        throw new Error('Could not register Service Worker')
      }
    }

    // If active, we are good
    if (registration.active) {
      return registration
    }

    // If waiting or installing, we must wait
    return new Promise((resolve, reject) => {
      const serviceWorker = registration.installing || registration.waiting
      if (!serviceWorker) {
        // Theoretically possible if it became active *just now* or failed.
        // Let's do one final check.
        if (registration.active) {
          resolve(registration)
          return
        }
        reject(new Error('Service Worker stuck in unknown state'))
        return
      }

      const timeout = setTimeout(() => {
        reject(new Error('Service Worker activation timed out'))
      }, 5000)

      serviceWorker.addEventListener('statechange', (e) => {
        const target = e.target as ServiceWorker
        if (target.state === 'activated') {
          clearTimeout(timeout)
          resolve(registration)
        }
      })
    })
  }

  useEffect(() => {
    const checkSubscription = async () => {
      setIsInitializing(true)
      try {
        if ('serviceWorker' in navigator) {
          // Use getRegistration() for a lightweight check.
          // Explicitly check our expected scope to avoid ambiguity
          let registration = await navigator.serviceWorker.getRegistration('/protected/recipes/')

          if (!registration) {
            // Fallback to default (current page) lookup
            registration = await navigator.serviceWorker.getRegistration()
          }

          if (registration) {
            const subscription = await registration.pushManager.getSubscription()
            setIsSubscribed(!!subscription)
          }
        }
      } catch (e) {
        console.warn('SW check failed during init:', e)
      } finally {
        setIsInitializing(false)
      }
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
      checkSubscription()
    } else {
      setIsInitializing(false)
    }
  }, [])

  const subscribe = async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (!PUBLIC_VAPID_KEY) {
        throw new Error('Missing VAPID Configuration on Client')
      }

      const registration = await ensureServiceWorkerReady()

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
      registration.showNotification('Notifications Enabled', {
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

  const sendTestNotification = async () => {
    setIsLoading(true)
    try {
      const registration = await ensureServiceWorkerReady()
      await registration.showNotification('Test Notification', {
        body: 'This is what your alerts will look like.',
        icon: '/protected/recipes/icon-192.png',
      })
    } catch (err) {
      console.error('Test notification failed:', err)
      setError('Failed to send test notification')
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
          <Button
            size="sm"
            onClick={subscribe}
            disabled={isLoading || isInitializing}
            className="w-full gap-2"
          >
            {isLoading || isInitializing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Bell className="size-4" />
            )}
            {isInitializing ? 'Initializing...' : 'Enable Notifications'}
          </Button>
        ) : (
          <div className="flex w-full flex-col gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={unsubscribe}
              disabled={isLoading}
              className="w-full gap-2 text-red-500 hover:bg-red-50 hover:text-red-600"
            >
              <BellOff className="size-4" />
              Disable
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={sendTestNotification}
              disabled={isLoading}
              className="w-full gap-2 border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            >
              <Bell className="size-4" />
              Test Notification
            </Button>
          </div>
        )}
      </Inline>

      <p className="text-[10px] text-muted-foreground">
        Note: iOS requires "Add to Home Screen" for this to work.
      </p>
    </Stack>
  )
}
