// Service Worker caching strategy (PERFORMANCE-PLAN.md P4).
//
// - `/_astro/*` (JS/CSS): content-hashed and therefore immutable — cache-first, populated
//   lazily the first time each asset is actually requested (there's no pre-build manifest of
//   every hashed filename to precache, and that list changes every deploy anyway).
// - Navigation/HTML requests (the app shell): NOT content-hashed and can embed per-request
//   user data (see [...path].astro — displayName/isAdmin are serialized into the
//   page), so they're network-first with a cache fallback for offline use only. The shell
//   cache is explicitly cleared on logout (see CLEAR_SHELL_CACHE below) so a fresh login on
//   the same device can't see a previous user's cached shell while offline.
// - `/api/*`: NEVER cached, under any strategy — dynamic, user/session-specific responses.
//   Caching these would risk serving one user's data to another after a logout/login on the
//   same device. These requests are passed through untouched (fetch handler returns early
//   without calling event.respondWith).
//
// Cache versioning: CACHE_VERSION is stamped at build time (see the `swCacheVersioning`
// integration in astro.config.mjs) with the Cloudflare Pages commit SHA, so each deploy gets
// its own cache namespace and `activate` evicts every prior deploy's entries. In dev
// (`astro dev` serves this file unprocessed from public/) the placeholder stays literal,
// which is harmless — dev doesn't need per-deploy invalidation.
const CACHE_VERSION = '__SW_CACHE_VERSION__'
const SHELL_CACHE = `chefboard-shell-${CACHE_VERSION}`
const ASSET_CACHE = `chefboard-assets-${CACHE_VERSION}`
const CURRENT_CACHES = [SHELL_CACHE, ASSET_CACHE]

const BASE = '/protected/recipes'
const PRECACHE_URLS = [`${BASE}/manifest.json`, `${BASE}/icon-192.png`, `${BASE}/icon-512.png`]

self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately (don't wait for old SW to be evicted)
  self.skipWaiting()
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Take control of all pages immediately
      self.clients.claim(),
      // Clean up every cache from a previous deploy's CACHE_VERSION
      caches
        .keys()
        .then((cacheNames) =>
          Promise.all(
            cacheNames
              .filter((name) => !CURRENT_CACHES.includes(name))
              .map((name) => caches.delete(name)),
          ),
        ),
    ]),
  )
})

function isHashedAsset(url) {
  return url.pathname.startsWith(`${BASE}/_astro/`)
}

function isApiRequest(url) {
  return url.pathname.startsWith(`${BASE}/api/`)
}

// Cache-first: serve from cache immediately if present, otherwise fetch, cache, and return.
// Safe here specifically because hashed filenames never change content once deployed.
async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response && response.ok) {
    const cache = await caches.open(ASSET_CACHE)
    cache.put(request, response.clone())
  }
  return response
}

// Network-first: always try the network so the shell reflects the latest deploy when online;
// fall back to whatever was last cached when offline (or the network otherwise fails).
async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response && response.ok) {
      const cache = await caches.open(SHELL_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch (err) {
    const cached = await caches.match(request)
    if (cached) return cached
    throw err
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  // Only GET is cacheable/idempotent; let POST/PUT/DELETE etc. (uploads, mutations) pass
  // through untouched.
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Hard requirement: never cache API responses under any strategy.
  if (isApiRequest(url)) return

  if (isHashedAsset(url)) {
    event.respondWith(cacheFirst(request))
    return
  }

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirst(request))
    return
  }

  // Everything else in scope (manifest.json, icons, etc.): cache-first with a network
  // fallback, same as the old precache-only behavior, now extended to any miss.
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)))
})

// Client Communication Handler (Client -> SW)
self.addEventListener('message', (event) => {
  // Sent on logout (see GlobalBurgerMenu.tsx) so a different user logging in on the same
  // device never sees the previous user's cached app shell while offline — the shell embeds
  // per-user data (displayName/isAdmin) server-rendered into the HTML.
  if (event.data && event.data.type === 'CLEAR_SHELL_CACHE') {
    event.waitUntil(caches.delete(SHELL_CACHE))
  }
})
