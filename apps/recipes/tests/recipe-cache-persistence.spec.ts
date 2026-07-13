import { test, expect, TEST_RECIPES } from './msw-setup'

/**
 * E2E coverage for PERFORMANCE-PLAN.md P2 — Persist the recipe store (stale-while-revalidate).
 *
 * These tests intercept `/api/recipes` directly (registered after the shared `mockApi` fixture's
 * catch-all route, so it takes priority — see tests/persistence.spec.ts for the same pattern) to
 * control exactly what the "server" returns and when, so we can prove the client renders from the
 * localStorage cache before the network resolves.
 */

const CACHE_KEY = 'chefboard:recipesCache:TestUser'

test.describe('Recipe cache — stale-while-revalidate (P2)', () => {
  test('cold launch: no cache shows the loading spinner, then renders data (baseline unchanged)', async ({
    page,
  }) => {
    let releaseResponse: () => void
    const gate = new Promise<void>((resolve) => {
      releaseResponse = resolve
    })

    await page.route('**/api/recipes', async (route) => {
      if (route.request().method() !== 'GET') return route.continue()
      await gate
      await route.fulfill({ json: { recipes: TEST_RECIPES } })
    })

    await page.goto('/protected/recipes')

    // No cache exists yet for this fresh browser context — the spinner should show while the
    // (deliberately delayed) network request is in flight.
    await expect(page.getByTestId('loading-indicator')).toBeVisible()

    releaseResponse!()

    await expect(page.getByTestId('loading-indicator')).not.toBeVisible()
    await expect(page.getByTestId(`recipe-card-${TEST_RECIPES[0].id}`)).toBeVisible()
  })

  test('warm launch: renders cached recipes before the network response resolves, with no spinner', async ({
    page,
  }) => {
    // First visit — populate the cache via a normal, fast response.
    await page.route('**/api/recipes', async (route) => {
      if (route.request().method() !== 'GET') return route.continue()
      await route.fulfill({ json: { recipes: TEST_RECIPES } })
    })
    await page.goto('/protected/recipes')
    await expect(page.getByTestId(`recipe-card-${TEST_RECIPES[0].id}`)).toBeVisible()

    // Sanity check: the cache actually got written for this user.
    const cached = await page.evaluate((key) => localStorage.getItem(key), CACHE_KEY)
    expect(cached).not.toBeNull()

    // Now delay the network response on reload, so a warm launch that skips the spinner can only
    // be explained by rendering from the persisted cache, not a fast/lucky network round trip.
    let releaseResponse: () => void
    const gate = new Promise<void>((resolve) => {
      releaseResponse = resolve
    })
    await page.unroute('**/api/recipes')
    await page.route('**/api/recipes', async (route) => {
      if (route.request().method() !== 'GET') return route.continue()
      await gate
      await route.fulfill({ json: { recipes: TEST_RECIPES } })
    })

    await page.reload()

    // The cached card must already be visible even though /api/recipes is still pending —
    // proving this came from the cache, not the network.
    await expect(page.getByTestId(`recipe-card-${TEST_RECIPES[0].id}`)).toBeVisible({
      timeout: 3000,
    })
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible()

    releaseResponse!()
  })

  test('background refresh updates the UI when the server payload differs from the cache', async ({
    page,
  }) => {
    let currentTitle = 'Stale Cached Title'

    await page.route('**/api/recipes', async (route) => {
      if (route.request().method() !== 'GET') return route.continue()
      await route.fulfill({
        json: { recipes: [{ ...TEST_RECIPES[0], title: currentTitle }] },
      })
    })

    // First visit — cache the "stale" title.
    await page.goto('/protected/recipes')
    await expect(page.getByText('Stale Cached Title')).toBeVisible()

    // Server now has a different title; reload without user interaction.
    currentTitle = 'Fresh Server Title'
    await page.reload()

    // Cached (stale) title paints immediately from local cache...
    await expect(page.getByText('Stale Cached Title')).toBeVisible()
    // ...then the silent background refresh reconciles it with the server's title.
    await expect(page.getByText('Fresh Server Title')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible()
  })

  test('logout clears the persisted recipe cache', async ({ page }) => {
    await page.route('**/api/recipes', async (route) => {
      if (route.request().method() !== 'GET') return route.continue()
      await route.fulfill({ json: { recipes: TEST_RECIPES } })
    })

    await page.goto('/protected/recipes')
    await expect(page.getByTestId(`recipe-card-${TEST_RECIPES[0].id}`)).toBeVisible()

    const cachedBefore = await page.evaluate((key) => localStorage.getItem(key), CACHE_KEY)
    expect(cachedBefore).not.toBeNull()

    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('menuitem', { name: 'Log Out' }).click()

    await page.waitForURL('**/login')

    const cachedAfter = await page.evaluate((key) => localStorage.getItem(key), CACHE_KEY)
    expect(cachedAfter).toBeNull()
  })

  test("a different user logging in after logout never sees the previous user's cached recipes", async ({
    page,
    context,
  }) => {
    await page.route('**/api/recipes', async (route) => {
      if (route.request().method() !== 'GET') return route.continue()
      await route.fulfill({ json: { recipes: TEST_RECIPES } })
    })

    await page.goto('/protected/recipes')
    await expect(page.getByTestId(`recipe-card-${TEST_RECIPES[0].id}`)).toBeVisible()

    // Log out (clears TestUser's cache — see the dedicated logout test above).
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('menuitem', { name: 'Log Out' }).click()
    await page.waitForURL('**/login')

    // A different user now logs in. Swap the session cookie the way the real login endpoint
    // would (site_user is intentionally non-httpOnly — see recipeStore.ts / login.ts), then serve
    // that user's own (empty) recipe list.
    await context.addCookies([
      { name: 'site_auth', value: 'true', domain: '127.0.0.1', path: '/' },
      { name: 'site_user', value: 'OtherUser', domain: '127.0.0.1', path: '/' },
      { name: 'site_email', value: 'other@example.com', domain: '127.0.0.1', path: '/' },
    ])
    await page.unroute('**/api/recipes')
    await page.route('**/api/recipes', async (route) => {
      if (route.request().method() !== 'GET') return route.continue()
      await route.fulfill({ json: { recipes: [] } })
    })

    await page.goto('/protected/recipes')

    // The previous user's recipe must never appear for the new user, cached or otherwise.
    await expect(page.getByText(TEST_RECIPES[0].title)).not.toBeVisible()

    const previousUserCache = await page.evaluate((key) => localStorage.getItem(key), CACHE_KEY)
    expect(previousUserCache).toBeNull()
  })
})
