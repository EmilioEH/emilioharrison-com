// Unit tests for public/sw.js (PERFORMANCE-PLAN.md P4 — real service-worker caching).
//
// sw.js runs in a Service Worker global scope, not a module system, so it can't be `import`ed
// directly. We load its source text and execute it inside a `node:vm` sandbox with minimal
// fakes for `self`/`caches`/`clients`/`fetch`, then drive the registered event listeners
// directly. This lets us assert on cache-eviction and routing behavior deterministically,
// without needing a real browser/Service Worker lifecycle (see
// tests/service-worker-caching.spec.ts for the real-browser Playwright coverage of
// end-user-observable behavior).
//
// This file deliberately lives in tests/unit/, not next to sw.js in public/ — anything under
// public/ is copied verbatim into the deployed static output, and we don't want a test file
// shipped alongside the real service worker.
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
// Use node:url's own URL/fileURLToPath explicitly rather than the ambient global `URL` — the
// jsdom test environment (vitest.config.js) replaces the global `URL` with jsdom's own
// implementation, which doesn't resolve `new URL(relative, base)` the same way here.
import { URL as NodeURL, fileURLToPath } from 'node:url'
import vm from 'node:vm'

const swSource = readFileSync(
  fileURLToPath(new NodeURL('../../public/sw.js', import.meta.url)),
  'utf-8',
)

class FakeResponse {
  constructor(body, init = {}) {
    this.body = body
    this.status = init.status ?? 200
    this.ok = this.status >= 200 && this.status < 300
  }
  clone() {
    return new FakeResponse(this.body, { status: this.status })
  }
}

function createFakeCacheStore() {
  const entries = new Map()
  return {
    addAll: vi.fn(async (urls) => {
      for (const url of urls) entries.set(url, new FakeResponse(`precached:${url}`))
    }),
    put: vi.fn(async (request, response) => {
      entries.set(typeof request === 'string' ? request : request.url, response)
    }),
    match: vi.fn(async (request) =>
      entries.get(typeof request === 'string' ? request : request.url),
    ),
    keys: vi.fn(async () => Array.from(entries.keys()).map((url) => ({ url }))),
    entries,
  }
}

/**
 * Loads sw.js into a fresh sandbox. `cacheVersion` stands in for what the astro.config.mjs
 * build hook stamps into `__SW_CACHE_VERSION__`. `preexistingCacheNames` seeds Cache Storage
 * with caches from a "previous deploy" to test eviction on activate.
 */
function loadSw({ cacheVersion = 'test-v1', preexistingCacheNames = [] } = {}) {
  const listeners = {}
  const cacheStores = new Map(preexistingCacheNames.map((name) => [name, createFakeCacheStore()]))
  let fetchImpl = vi.fn(async () => new FakeResponse('network-response'))

  const fakeCaches = {
    open: vi.fn(async (name) => {
      if (!cacheStores.has(name)) cacheStores.set(name, createFakeCacheStore())
      return cacheStores.get(name)
    }),
    keys: vi.fn(async () => Array.from(cacheStores.keys())),
    delete: vi.fn(async (name) => cacheStores.delete(name)),
    match: vi.fn(async (request) => {
      const url = typeof request === 'string' ? request : request.url
      for (const store of cacheStores.values()) {
        if (store.entries.has(url)) return store.entries.get(url)
      }
      return undefined
    }),
  }

  const fakeClients = { claim: vi.fn(async () => {}) }
  const fakeSelf = {
    addEventListener: (type, handler) => {
      listeners[type] = listeners[type] || []
      listeners[type].push(handler)
    },
    skipWaiting: vi.fn(),
    clients: fakeClients,
    registration: { showNotification: vi.fn(async () => {}) },
  }

  const context = {
    self: fakeSelf,
    caches: fakeCaches,
    clients: fakeClients,
    fetch: (...args) => fetchImpl(...args),
    Response: FakeResponse,
    URL,
    console,
  }
  vm.createContext(context)
  vm.runInContext(swSource.replaceAll('__SW_CACHE_VERSION__', cacheVersion), context)

  return {
    listeners,
    fakeCaches,
    fakeSelf,
    fakeClients,
    cacheStores,
    setFetchImpl: (impl) => {
      fetchImpl = impl
    },
  }
}

/** Runs every handler registered for `type` and awaits everything passed to event.waitUntil. */
async function fire(sw, type, eventOverrides = {}) {
  const waited = []
  const event = { waitUntil: (p) => waited.push(p), ...eventOverrides }
  for (const handler of sw.listeners[type] || []) {
    handler(event)
  }
  await Promise.all(waited)
  return event
}

const BASE = '/protected/recipes'

describe('sw.js — cache versioning', () => {
  it('evicts every cache from a previous deploy version on activate, keeping only the current version', async () => {
    const sw = loadSw({
      cacheVersion: 'v2',
      preexistingCacheNames: ['chefboard-shell-v1', 'chefboard-assets-v1', 'some-unrelated-cache'],
    })
    // Current-version caches get created lazily; open them so they exist before activate runs,
    // mirroring a SW that already has them from its own install.
    await sw.fakeCaches.open('chefboard-shell-v2')
    await sw.fakeCaches.open('chefboard-assets-v2')

    await fire(sw, 'activate')

    expect(sw.fakeClients.claim).toHaveBeenCalled()
    expect(sw.fakeCaches.delete).toHaveBeenCalledWith('chefboard-shell-v1')
    expect(sw.fakeCaches.delete).toHaveBeenCalledWith('chefboard-assets-v1')
    expect(sw.fakeCaches.delete).toHaveBeenCalledWith('some-unrelated-cache')
    expect(sw.fakeCaches.delete).not.toHaveBeenCalledWith('chefboard-shell-v2')
    expect(sw.fakeCaches.delete).not.toHaveBeenCalledWith('chefboard-assets-v2')
    expect(sw.cacheStores.has('chefboard-shell-v2')).toBe(true)
    expect(sw.cacheStores.has('chefboard-assets-v2')).toBe(true)
    expect(sw.cacheStores.has('chefboard-shell-v1')).toBe(false)
  })

  it('precaches the manifest and icons into the shell cache on install', async () => {
    const sw = loadSw({ cacheVersion: 'v1' })
    await fire(sw, 'install')

    expect(sw.fakeSelf.skipWaiting).toHaveBeenCalled()
    const shellStore = sw.cacheStores.get('chefboard-shell-v1')
    expect(shellStore.addAll).toHaveBeenCalledWith([
      `${BASE}/manifest.json`,
      `${BASE}/icon-192.png`,
      `${BASE}/icon-512.png`,
    ])
  })
})

describe('sw.js — fetch handler routing', () => {
  it('never intercepts /api/* requests (hard requirement: no caching of dynamic, user-specific responses)', async () => {
    const sw = loadSw({ cacheVersion: 'v1' })
    const respondWith = vi.fn()
    await fire(sw, 'fetch', {
      request: { method: 'GET', url: `https://example.com${BASE}/api/recipes`, mode: 'cors' },
      respondWith,
    })

    expect(respondWith).not.toHaveBeenCalled()
    // Confirm nothing containing "/api/" ever lands in either cache.
    for (const store of sw.cacheStores.values()) {
      expect(store.put).not.toHaveBeenCalled()
    }
  })

  it('never intercepts non-GET requests (uploads/mutations pass straight through)', async () => {
    const sw = loadSw({ cacheVersion: 'v1' })
    const respondWith = vi.fn()
    await fire(sw, 'fetch', {
      request: { method: 'POST', url: `https://example.com${BASE}/api/recipes`, mode: 'cors' },
      respondWith,
    })
    expect(respondWith).not.toHaveBeenCalled()
  })

  it('serves hashed /_astro/ assets cache-first, fetching over the network only on the first request', async () => {
    const sw = loadSw({ cacheVersion: 'v1' })
    const assetUrl = `https://example.com${BASE}/_astro/RecipeManager.abc123.js`
    let networkCalls = 0
    sw.setFetchImpl(async () => {
      networkCalls += 1
      return new FakeResponse('js-bundle')
    })

    // First request: cache miss, must hit the network, then populate the asset cache.
    let capturedPromise
    await fire(sw, 'fetch', {
      request: { method: 'GET', url: assetUrl, mode: 'no-cors', destination: 'script' },
      respondWith: (p) => {
        capturedPromise = p
      },
    })
    await capturedPromise
    expect(networkCalls).toBe(1)
    const assetStore = sw.cacheStores.get('chefboard-assets-v1')
    expect(assetStore.put).toHaveBeenCalled()

    // Second request for the same URL: must be served from cache, zero additional network hits.
    await fire(sw, 'fetch', {
      request: { method: 'GET', url: assetUrl, mode: 'no-cors', destination: 'script' },
      respondWith: (p) => {
        capturedPromise = p
      },
    })
    await capturedPromise
    expect(networkCalls).toBe(1)
  })

  it('uses network-first for navigation requests and falls back to the cached shell when offline', async () => {
    const sw = loadSw({ cacheVersion: 'v1' })
    const docUrl = `https://example.com${BASE}/`
    sw.setFetchImpl(async () => new FakeResponse('<html>fresh</html>'))

    // Online: network wins and populates the shell cache.
    let capturedPromise
    await fire(sw, 'fetch', {
      request: { method: 'GET', url: docUrl, mode: 'navigate', destination: 'document' },
      respondWith: (p) => {
        capturedPromise = p
      },
    })
    const onlineResponse = await capturedPromise
    expect(onlineResponse.body).toBe('<html>fresh</html>')

    // Offline: network fails, must fall back to the cached shell response.
    sw.setFetchImpl(async () => {
      throw new Error('offline')
    })
    await fire(sw, 'fetch', {
      request: { method: 'GET', url: docUrl, mode: 'navigate', destination: 'document' },
      respondWith: (p) => {
        capturedPromise = p
      },
    })
    const offlineResponse = await capturedPromise
    expect(offlineResponse.body).toBe('<html>fresh</html>')
  })
})

describe('sw.js — message handler', () => {
  it('CLEAR_SHELL_CACHE deletes only the shell cache, leaving the asset cache intact', async () => {
    const sw = loadSw({ cacheVersion: 'v1' })
    await sw.fakeCaches.open('chefboard-shell-v1')
    await sw.fakeCaches.open('chefboard-assets-v1')

    await fire(sw, 'message', { data: { type: 'CLEAR_SHELL_CACHE' } })

    expect(sw.fakeCaches.delete).toHaveBeenCalledWith('chefboard-shell-v1')
    expect(sw.fakeCaches.delete).not.toHaveBeenCalledWith('chefboard-assets-v1')
  })
})
