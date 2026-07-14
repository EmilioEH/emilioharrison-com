import { test, expect, TEST_RECIPES } from './msw-setup'

test.describe('Boot performance (P6+P7)', () => {
  test('app boot fires /api/bootstrap exactly once and never the old individual boot-time endpoints', async ({
    page,
  }) => {
    // Note: `/api/auth/firebase-token` (useFirebaseAuthSync.ts) is a separate, un-touched
    // round trip that this refactor intentionally keeps — see PERFORMANCE-PLAN.md P6+P7. It
    // can't be exercised in this sandbox because `useFirebaseAuthSync` no-ops when the Firebase
    // client SDK has no `PUBLIC_FIREBASE_API_KEY` configured (see firebase-client.ts's
    // `isConfigValid` check), and this environment has no real Firebase credentials — that's a
    // pre-existing sandbox limitation (no other spec in this suite asserts on firebase-token
    // either), not something this change affects. This test instead asserts the two things that
    // *are* actually verifiable here: `/api/bootstrap` fires exactly once, and none of the three
    // endpoints it replaced at boot time (`/api/recipes`, `/api/week/planned`,
    // `/api/families/current`) are called during initial load.
    //
    // The shared `/api/bootstrap` mock in msw-setup.ts composes its response by internally
    // fetching `/api/recipes`/`/api/week/planned`/`/api/families/current` from *within the page*
    // (so those endpoints' own test-specific overrides still apply — see that file's comment).
    // Those nested fetches are indistinguishable, at the network level, from real page-initiated
    // requests, which would make this specific test self-defeating. So this test overrides
    // `/api/bootstrap` with a self-contained response (no nested fetches) instead, to measure
    // only what the real app actually calls.
    await page.route('**/api/bootstrap', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: { displayName: 'Emilio', isAdmin: true, hasOnboarded: true },
          recipes: TEST_RECIPES,
          planned: [],
          family: {
            family: null,
            members: [],
            currentUserId: 'TestUser',
            incomingInvites: [],
            outgoingInvites: [],
          },
        }),
      })
    })

    const apiRequests: string[] = []
    page.on('request', (req) => {
      const url = req.url()
      if (url.includes('/api/')) {
        apiRequests.push(url.replace(/^.*\/api\//, '/api/').split('?')[0])
      }
    })

    await page.goto('/protected/recipes')
    await expect(page.getByText('E2E Test Recipe')).toBeVisible({ timeout: 10000 })
    // Give any straggling requests a moment to fire so we don't undercount.
    await page.waitForTimeout(1000)

    const bootstrapCalls = apiRequests.filter((u) => u === '/api/bootstrap')
    expect(bootstrapCalls.length).toBe(1)
    expect(apiRequests).not.toContain('/api/recipes')
    expect(apiRequests).not.toContain('/api/week/planned')
    expect(apiRequests).not.toContain('/api/families/current')
  })

  test('library is interactive after bootstrap resolves', async ({ page }) => {
    await page.goto('/protected/recipes')
    await expect(page.getByText('E2E Test Recipe')).toBeVisible({ timeout: 10000 })
  })
})
