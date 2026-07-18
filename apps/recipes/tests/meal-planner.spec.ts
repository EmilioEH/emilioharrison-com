import { test, expect } from './msw-setup'

test.describe('Meal Planner Feature', () => {
  test.beforeEach(async ({ page, context }) => {
    // Mock Auth
    await context.addCookies([
      { name: 'site_auth', value: 'true', domain: 'localhost', path: '/' },
      { name: 'site_user', value: 'testuser', domain: 'localhost', path: '/' },
      { name: 'site_email', value: 'emilioeh1991@gmail.com', domain: 'localhost', path: '/' },
      { name: 'site_auth', value: 'true', domain: '127.0.0.1', path: '/' },
      { name: 'site_user', value: 'testuser', domain: '127.0.0.1', path: '/' },
      { name: 'site_email', value: 'emilioeh1991@gmail.com', domain: '127.0.0.1', path: '/' },
    ])

    // Mock Recipes Data
    const mockRecipes = [
      {
        id: '1',
        title: 'Chicken Curry',
        protein: 'Chicken',
        thisWeek: false,
        prepTime: 10,
        cookTime: 20,
        servings: 4,
        ingredients: [{ name: 'Chicken', amount: '1lb' }],
        steps: [],
      },
      {
        id: '101',
        title: 'Beef Stew',
        protein: 'Beef',
        thisWeek: false,
        prepTime: 10,
        cookTime: 20,
        servings: 4,
        ingredients: [],
        steps: [],
      },
    ]

    // Block SW
    await page.route(/sw.js/, (route) => route.abort())

    // Broaden matching for api/recipes
    await page.route(/api\/recipes/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: { recipes: mockRecipes } })
      } else {
        // Passthrough for POST/PUT if needed or mock success
        await route.fulfill({ json: { success: true } })
      }
    })

    // Mock the week-plan toggle endpoint: POST plans it, DELETE unplans it, both echo the
    // recipe's family-scoped record so weekStore's optimistic update has data to apply.
    // Tracked in `weekPlans` so the /family-data GET below (which removeRecipeFromWeek
    // re-fetches after a DELETE) reflects the same state, instead of the broad
    // `/api/recipes` mock below serving it the recipe list by mistake.
    const weekPlans: Record<string, { isPlanned: boolean; assignedDate?: string }> = {}
    await page.route(/api\/recipes\/[^/]+\/week-plan/, async (route) => {
      const method = route.request().method()
      const recipeId = route
        .request()
        .url()
        .match(/recipes\/([^/]+)\/week-plan/)?.[1] as string
      if (method === 'POST') {
        const body = route.request().postDataJSON()
        weekPlans[recipeId] = { isPlanned: true, assignedDate: body.assignedDate }
        await route.fulfill({
          json: {
            success: true,
            data: { id: recipeId, weekPlan: weekPlans[recipeId] },
          },
        })
      } else {
        weekPlans[recipeId] = { isPlanned: false }
        await route.fulfill({ json: { success: true } })
      }
    })

    await page.route(/api\/recipes\/[^/]+\/family-data/, async (route) => {
      const recipeId = route
        .request()
        .url()
        .match(/recipes\/([^/]+)\/family-data/)?.[1] as string
      await route.fulfill({
        json: {
          success: true,
          data: { id: recipeId, weekPlan: weekPlans[recipeId] || { isPlanned: false } },
        },
      })
    })

    // Mock local storage (start fresh)
    await page.addInitScript(() => {
      localStorage.clear()
    })

    await page.goto('/protected/recipes')
    await expect(page.getByTestId('loading-indicator')).toBeHidden()
  })

  test('tapping Add to Week plans the recipe for the active week (no day picker)', async ({
    page,
  }) => {
    const card = page.locator('[data-testid="recipe-card-1"]')
    await expect(card).toBeVisible()

    // One tap — no dialog, no day selection.
    await card.getByLabel('Add to Week').click()

    // A "This week" badge appears directly on the card.
    await expect(card.getByText('This week')).toBeVisible()
    await expect(page.locator('[role="dialog"]')).toBeHidden()
  })

  test('tapping Add to Week again removes it from the week', async ({ page }) => {
    const card = page.locator('[data-testid="recipe-card-1"]')

    await card.getByLabel('Add to Week').click()
    await expect(card.getByText('This week')).toBeVisible()

    await card.getByLabel('Add to Week').click()
    await expect(card.getByText('This week')).toBeHidden()
  })

  test('week view shows a flat list of planned recipes, newest first, no day grouping', async ({
    page,
  }) => {
    // Plan both recipes for the active week.
    await page.locator('[data-testid="recipe-card-1"]').getByLabel('Add to Week').click()
    await expect(page.locator('[data-testid="recipe-card-1"]').getByText('This week')).toBeVisible()

    await page.locator('[data-testid="recipe-card-101"]').getByLabel('Add to Week').click()
    await expect(
      page.locator('[data-testid="recipe-card-101"]').getByText('This week'),
    ).toBeVisible()

    // Go to the This Week tab.
    await page.getByRole('button', { name: 'This Week', exact: true }).click()

    // Flat list: both recipes visible, no day-of-week section headers.
    await expect(page.getByText('Chicken Curry')).toBeVisible()
    await expect(page.getByText('Beef Stew')).toBeVisible()
    await expect(page.getByRole('button', { name: /^Monday$/i })).toHaveCount(0)
  })

  test('can switch to next week via the calendar and the week selector', async ({ page }) => {
    // Open the week selector from the This Week tab.
    await page.getByRole('button', { name: 'This Week', exact: true }).click()

    await page.getByLabel('Select Week').click()
    const calModal = page.locator('[role="dialog"]')
    await expect(calModal).toBeVisible()
    await expect(calModal).toContainText('Select Week')
    await calModal.getByLabel('Close modal').click()
    await expect(calModal).toBeHidden()

    // Use the This/Next toggle in the workspace header — scoped to exclude the bottom tab
    // bar's identically aria-labeled "This Week" tab, which stays mounted underneath.
    const nextToggle = page.locator('button[aria-label="Next Week"]:not([aria-current])')
    const thisToggle = page.locator('button[aria-label="This Week"]:not([aria-current])')

    await nextToggle.click()
    await expect(nextToggle).toBeVisible()

    await thisToggle.click()
    await expect(thisToggle).toBeVisible()
  })
})
