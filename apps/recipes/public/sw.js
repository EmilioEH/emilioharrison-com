const CACHE_NAME = 'chefboard-v1'
const urlsToCache = [
  '/protected/recipes/',
  '/protected/recipes/manifest.json',
  '/protected/recipes/icon-192.png',
  '/protected/recipes/icon-512.png',
  '/protected/recipes/favicon.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
    }),
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response
      }
      return fetch(event.request)
    }),
  )
})

// Update service worker immediately
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME]
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
})

// Push Notification Handler
self.addEventListener('push', (event) => {
  let data = {}
  if (event.data) {
    try {
      data = event.data.json()
    } catch {
      data = { body: event.data.text() }
    }
  }

  const title = data.title || 'Chefboard Alert'
  const options = {
    body: data.body || 'New update available.',
    icon: '/protected/recipes/icon-192.png',
    badge: '/protected/recipes/icon-192.png',
    data: data.url || '/protected/recipes/',
    vibrate: [100, 50, 100],
    tag: 'chefboard-notification',
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data)
      }
    }),
  )
})
