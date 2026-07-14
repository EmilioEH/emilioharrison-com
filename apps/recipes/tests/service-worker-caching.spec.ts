import { test, expect, TEST_RECIPES } from './msw-setup'

/**
 * E2E coverage for PERFORMANCE-PLAN.md P4 — real service-worker caching.
 *
 * Notes on Service Worker lifecycle timing that shape these tests:
 *
 * - `public/sw.js` registers from a `window.addEventListener('load', ...)` handler in
 *   RecipeLayout.astro, which by definition fires only *after* every resource referenced by
 *   the initial HTML (script tags, stylesheets, etc.) has already finished loading. That means
 *   the very first-ever page load's own asset requests can never be intercepted/cached by the
 *   SW being installed during that same load — there's no SW controlling the page yet when
 *   those requests go out. This is an inherent characteristic of "lazy/runtime caching" (as
 *   opposed to a build-time precache manifest), not a bug.
 * - So these tests do an initial `goto` + one warm `reload` (during which the SW *is* already
 *   active and does intercept/cache everything) before asserting cache-hit / offline behavior,
 *   matching the realistic "closed and reopened the installed PWA" pattern described in the
 *   task brief, rather than a literal single cold load.
 * - These tests navigate to `/protected/recipes/` (trailing slash), not `/protected/recipes`.
 *   The SW registers from `/protected/recipes/sw.js` with no explicit `scope` option, so its
 *   default scope is its containing directory, `/protected/recipes/`. Per the SW spec, scope
 *   matching is a literal string prefix check, so a document at `/protected/recipes` (no
 *   trailing slash) is NOT in scope and can never be controlled — this bit us during
 *   development (a real, pre-existing gap this work incidentally surfaced) and is why
 *   `public/manifest.json`'s `start_url`/`scope` were also fixed to include the trailing slash,
 *   since that's the exact URL Android Chrome opens when launching the installed PWA.
 */

test.describe('Service worker caching (P4)', () => {
  test('registers the service worker and precaches the manifest + icons', async ({ page }) => {
    await page.goto('/protected/recipes/')
    await expect(page.getByTestId(`recipe-card-${TEST_RECIPES[0].id}`)).toBeVisible()

    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))

    const precached = await page.evaluate(async () => {
      const cacheNames = await caches.keys()
      const shellCacheName = cacheNames.find((name) => name.startsWith('chefboard-shell-'))
      if (!shellCacheName) return null
      const cache = await caches.open(shellCacheName)
      const keys = await cache.keys()
      return keys.map((req) => new URL(req.url).pathname)
    })

    expect(precached).not.toBeNull()
    expect(precached).toEqual(
      expect.arrayContaining([
        '/protected/recipes/manifest.json',
        '/protected/recipes/icon-192.png',
        '/protected/recipes/icon-512.png',
      ]),
    )
  })

  test('serves hashed /_astro/ assets from the SW cache with zero network hits after a warm visit', async ({
    page,
  }) => {
    await page.goto('/protected/recipes/')
    await expect(page.getByTestId(`recipe-card-${TEST_RECIPES[0].id}`)).toBeVisible()
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))

    // Warm reload: the SW is now active from the start of this navigation, so it intercepts
    // and populates its asset cache for every /_astro/ request made during this load.
    await page.reload()
    await expect(page.getByTestId(`recipe-card-${TEST_RECIPES[0].id}`)).toBeVisible()

    // Disable the ordinary HTTP disk cache via CDP so a "no network hit" result can only be
    // explained by the Service Worker's own Cache Storage, not the browser's regular HTTP
    // cache (which could otherwise mask a SW that was never actually caching anything).
    const client = await page.context().newCDPSession(page)
    await client.send('Network.setCacheDisabled', { cacheDisabled: true })

    await page.reload()
    await expect(page.getByTestId(`recipe-card-${TEST_RECIPES[0].id}`)).toBeVisible()

    const hashedAssetTransfers = await page.evaluate(() =>
      (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
        .filter((entry) => entry.name.includes('/_astro/'))
        .map((entry) => ({ name: entry.name, transferSize: entry.transferSize })),
    )

    expect(hashedAssetTransfers.length).toBeGreaterThan(0)
    for (const entry of hashedAssetTransfers) {
      // transferSize === 0 means the resource was served without going out over the network
      // (Resource Timing API semantics) — with HTTP caching disabled, that can only be the SW.
      expect(entry.transferSize).toBe(0)
    }
  })

  test('never stores /api/* requests in any SW cache', async ({ page }) => {
    await page.goto('/protected/recipes/')
    await expect(page.getByTestId(`recipe-card-${TEST_RECIPES[0].id}`)).toBeVisible()
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))

    // Exercise a couple more API-backed flows so there's real traffic to /api/* beyond boot
    // (note: deliberately reloading from the detail view here, not navigating back to the
    // library first via a fresh page.goto() — that "view detail, then full re-goto to
    // library" sequence trips an unrelated, pre-existing app bug (reproduces identically with
    // the service worker fully unregistered), which is out of scope for this SW-caching work).
    await page.getByTestId(`recipe-card-${TEST_RECIPES[0].id}`).click()
    await expect(page.getByRole('heading', { name: TEST_RECIPES[0].title })).toBeVisible()

    // Reload so the SW has had a chance to intercept everything it's going to, including
    // whatever API calls the detail view made.
    await page.reload()
    await expect(page.getByRole('heading', { name: TEST_RECIPES[0].title })).toBeVisible()

    const apiEntriesInAnyCache = await page.evaluate(async () => {
      const cacheNames = await caches.keys()
      const hits: string[] = []
      for (const name of cacheNames) {
        const cache = await caches.open(name)
        const keys = await cache.keys()
        for (const req of keys) {
          if (new URL(req.url).pathname.includes('/api/')) hits.push(req.url)
        }
      }
      return hits
    })

    expect(apiEntriesInAnyCache).toEqual([])
  })

  test('a SW update while viewing a recipe detail never navigates the user away', async ({
    page,
  }) => {
    await page.goto('/protected/recipes/')
    await expect(page.getByTestId(`recipe-card-${TEST_RECIPES[0].id}`)).toBeVisible()
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))

    await page.getByTestId(`recipe-card-${TEST_RECIPES[0].id}`).click()
    await expect(page.getByRole('heading', { name: TEST_RECIPES[0].title })).toBeVisible()
    const urlBeforeUpdate = page.url()

    let navigated = false
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) navigated = true
    })

    // Simulate a new SW taking control while the user is mid-recipe — this used to force
    // `window.location.reload()` (see RecipeLayout.astro's removed controllerchange handler).
    await page.evaluate(() => {
      navigator.serviceWorker.dispatchEvent(new Event('controllerchange'))
    })

    // Give any (incorrect) reload/navigation a moment to happen if it were going to.
    await page.waitForTimeout(1000)

    expect(navigated).toBe(false)
    expect(page.url()).toBe(urlBeforeUpdate)
    await expect(page.getByRole('heading', { name: TEST_RECIPES[0].title })).toBeVisible()
  })

  test('app shell renders from cache when offline after a prior warm visit', async ({
    page,
    context,
  }) => {
    await page.goto('/protected/recipes/')
    await expect(page.getByTestId(`recipe-card-${TEST_RECIPES[0].id}`)).toBeVisible()
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))

    // Warm reload while online: SW is active from the start, caches the shell + assets, and
    // P2's persisted recipe cache (recipeStore.ts) is populated in localStorage.
    await page.reload()
    await expect(page.getByTestId(`recipe-card-${TEST_RECIPES[0].id}`)).toBeVisible()

    await context.setOffline(true)
    await page.reload()

    // Renders from the SW-cached shell/assets + the P2 localStorage recipe cache, with no
    // network available at all.
    await expect(page.getByTestId(`recipe-card-${TEST_RECIPES[0].id}`)).toBeVisible({
      timeout: 10000,
    })

    await context.setOffline(false)
  })
})
