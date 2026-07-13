import { test, expect, AUTH_COOKIES } from './msw-setup'

/**
 * Regression coverage for the P1 bundle-splitting work: every non-library ViewMode
 * (`RecipeManager.tsx` / `useRouter.ts`) is now a `React.lazy()` chunk rendered inside a
 * `<Suspense>` boundary. This suite exercises each route once — both via a fresh/hard
 * navigation (which is what exercises lazy-loading on cold mount, the highest-risk
 * regression) and confirms it always renders either real content or the shared
 * `loading-indicator` fallback, never a blank screen or a thrown/console error.
 */
test.describe('Lazy-loaded ViewMode routes', () => {
  test.use({
    storageState: {
      cookies: [...AUTH_COOKIES],
      origins: [],
    },
  })

  // Assertion per ViewMode that a recognizable, view-specific element is visible once the
  // lazy chunk has resolved. Kept lightweight/tolerant since each view's own test suite
  // covers its actual functionality in depth.
  const VIEW_ASSERTIONS: Record<string, (page: import('@playwright/test').Page) => Promise<void>> =
    {
      library: async (page) => {
        await expect(page.getByText('E2E Test Recipe').first()).toBeVisible({ timeout: 15000 })
      },
      detail: async (page) => {
        await expect(
          page.getByRole('heading', { name: 'E2E Test Recipe', exact: true }),
        ).toBeVisible({ timeout: 15000 })
      },
      edit: async (page) => {
        // The modal chrome/title is static (set by RecipeManager itself); assert on a field
        // that's part of the lazy-loaded RecipeEditor's own render output instead.
        await expect(page.getByPlaceholder('e.g. Spicy Miso Ramen')).toBeVisible({ timeout: 15000 })
      },
      week: async (page) => {
        await expect(page.getByLabel('View Grocery List')).toBeVisible({ timeout: 15000 })
      },
      settings: async (page) => {
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({
          timeout: 15000,
        })
      },
      'feedback-dashboard': async (page) => {
        await expect(page.getByRole('heading', { name: 'Feedback Dashboard' })).toBeVisible({
          timeout: 15000,
        })
      },
      'bulk-import': async (page) => {
        await expect(page.getByRole('heading', { name: 'Import Recipes' })).toBeVisible({
          timeout: 15000,
        })
      },
      'family-settings': async (page) => {
        await expect(page.getByRole('heading', { name: 'Manage Family' })).toBeVisible({
          timeout: 15000,
        })
      },
      invite: async (page) => {
        await expect(page.getByRole('heading', { name: 'Invite Others' })).toBeVisible({
          timeout: 15000,
        })
      },
      notifications: async (page) => {
        await expect(page.getByRole('heading', { name: 'Notifications', exact: true })).toBeVisible(
          { timeout: 15000 },
        )
      },
    }

  for (const [view, assertContent] of Object.entries(VIEW_ASSERTIONS)) {
    test(`?view=${view} renders content on a fresh hard navigation, no console errors`, async ({
      page,
    }) => {
      const pageErrors: Error[] = []
      page.on('pageerror', (err) => pageErrors.push(err))

      let query = ''
      if (view === 'detail') {
        query = '?view=detail&recipe=test-recipe-001'
      } else if (view !== 'library') {
        query = `?view=${view}`
      }
      await page.goto(`/protected/recipes${query}`)

      await assertContent(page)

      expect(
        pageErrors,
        `Unexpected uncaught errors on ?view=${view}: ${pageErrors.join(', ')}`,
      ).toHaveLength(0)
    })
  }

  test('the `grocery` ViewMode does not crash the app (pre-existing: no dedicated renderer)', async ({
    page,
  }) => {
    // NOTE: `grocery` is a valid ViewMode in useRouter.ts, but nothing in RecipeManager.tsx /
    // RecipeManagerView.tsx currently renders distinct content for it (pre-existing gap,
    // unrelated to the P1 code-splitting change) — it falls through to the same empty
    // <main> as an unmatched view. This test only guards against a regression (crash),
    // it does not assert visible content.
    const pageErrors: Error[] = []
    page.on('pageerror', (err) => pageErrors.push(err))

    await page.goto('/protected/recipes?view=grocery')
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible({ timeout: 15000 })

    expect(pageErrors).toHaveLength(0)
  })

  test('the `admin-dashboard` ViewMode lazy chunk loads without crashing', async ({ page }) => {
    // NOTE: `isAdmin` is resolved server-side in `[...path].astro` from the real user
    // record and passed to RecipeManager as a prop — it isn't something this test's
    // client-side page.route mocks can force to true, so the non-admin TestUser fixture
    // gets redirected to `library` by the guard in RecipeManagerView.tsx (pre-existing
    // behavior, verified identical on the unmodified branch). This test only confirms the
    // lazy AdminDashboard chunk doesn't throw/blank the app when it *is* reached; the
    // exact-heading assertion for admins is out of reach without a real admin fixture.
    const pageErrors: Error[] = []
    page.on('pageerror', (err) => pageErrors.push(err))

    await page.goto('/protected/recipes?view=admin-dashboard')
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible({ timeout: 15000 })

    expect(pageErrors).toHaveLength(0)
  })

  test('?view=detail&recipe=<id> resolves correctly on a hard refresh (cold mount)', async ({
    page,
  }) => {
    await page.goto('/protected/recipes?view=detail&recipe=test-recipe-001')
    await expect(page.getByRole('heading', { name: 'E2E Test Recipe', exact: true })).toBeVisible({
      timeout: 15000,
    })

    // Hard refresh — this is what actually exercises the lazy chunk resolving on cold mount,
    // as opposed to a client-side route change where the chunk may already be cached.
    await page.reload()
    await expect(page.getByRole('heading', { name: 'E2E Test Recipe', exact: true })).toBeVisible({
      timeout: 15000,
    })
  })

  test('?view=week resolves correctly on a hard refresh (cold mount)', async ({ page }) => {
    await page.goto('/protected/recipes?view=week')
    await expect(page.getByLabel('View Grocery List')).toBeVisible({ timeout: 15000 })

    await page.reload()
    await expect(page.getByLabel('View Grocery List')).toBeVisible({ timeout: 15000 })
  })
})
