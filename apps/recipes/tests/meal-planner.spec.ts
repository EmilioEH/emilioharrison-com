import { test, expect } from '@playwright/test'

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

    // Debug console
    page.on('console', (msg) => console.log(`BROWSER LOG: ${msg.text()}`))
    page.on('pageerror', (err) => console.log(`BROWSER ERROR: ${err.message}`))
    page.on('requestfailed', (req) =>
      console.log(`REQUEST FAILED: ${req.url()} ${req.failure()?.errorText}`),
    )
    page.on('request', (req) => console.log(`REQ: ${req.url()}`))

    // Block SW
    await page.route(/sw.js/, (route) => route.abort())

    // Broaden matching for api/recipes
    await page.route(/api\/recipes/, async (route) => {
      console.log(`MOCKING REQUEST: ${route.request().url()}`)
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: { recipes: mockRecipes } })
      } else {
        // Passthrough for POST/PUT if needed or mock success
        await route.fulfill({ json: { success: true } })
      }
    })

    // Mock local storage (start fresh)
    await page.addInitScript(() => {
      localStorage.clear()
    })

    await page.goto('/protected/recipes')

    // Debug: Check if loading
    const loading = await page.getByTestId('loading-indicator').isVisible()
    console.log(`IS LOADING: ${loading}`)

    // Log always
    console.log('BODY CONTENT:', await page.locator('body').innerText())

    // Verify Route Interception
    console.log('Testing manual fetch...')
    await page.evaluate(async () => {
      try {
        await fetch('/protected/recipes/api/recipes')
      } catch (e) {
        console.error('Manual fetch failed', e)
      }
    })
  })

  test('can plan a recipe for a specific day', async ({ page }) => {
    // 1. Locate Recipe Card and Click "Add to Week"
    const card = page.locator('[data-testid="recipe-card-1"]')
    await expect(card).toBeVisible()

    // The button text is "Add to Week"
    await card.getByText('Add to Week').click()

    // 2. Verify DayPicker Modal Opens
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()
    await expect(modal).toContainText('Plan for Week of')

    // 3. Select "Tuesday"
    // Find the Tuesday button. It usually contains "Tue" and the date.
    // We can rely on text "Tue" and clicks.
    const tuesdayBtn = modal.locator('button', { hasText: 'Tue' })
    await tuesdayBtn.click()

    // 4. Verify Modal Closes (auto-close on add)
    await expect(modal).toBeHidden()

    // 5. Verify Tag appears on Card
    await expect(card.locator('span', { hasText: 'Tue' })).toBeVisible()
  })

  test('can switch weeks and verify persistence', async ({ page }) => {
    const card = page.locator('[data-testid="recipe-card-1"]')

    // 1. Add to Monday of THIS week
    await card.getByText('Add to Week').click()
    await page.locator('[role="dialog"] button', { hasText: 'Mon' }).click()
    await expect(card.locator('span', { hasText: 'Mon' })).toBeVisible()

    // 2. Open Calendar (WeekMiniBar calendar icon)
    // The WeekMiniBar is visually in the RecipeHeader
    // It has a Calendar icon button.
    const calButton = page.locator('button:has(.lucide-calendar)') // Simple selector for icon
    await calButton.first().click()

    // 3. Verify Calendar Modal
    const calModal = page.locator('[role="dialog"]')
    await expect(calModal).toBeVisible()
    await expect(calModal).toContainText('Select Week')

    // 4. Select "Next Week" (Assuming it's listed)
    // The list uses "Week of MMM dd"
    // We can just click the second item in the list (index 1), as index 0 is likely current week or past.
    // Our store logic adds ThisWeek and NextWeek.
    // Let's click the one that says "Week of" and is NOT the active one (which has checkmark?)
    // Actually, distinctWeeks returns dates. The UI shows formatted dates.
    // Let's just find a button that is NOT the current week.
    // Or easier: Use the MiniBar "Next" button if available (WeekMiniBar has [This] [Next])

    // Close modal to use MiniBar toggle for simplicity?
    // Wait, test requirement said "Context Switcher".
    // Let's close modal first.
    await page.keyboard.press('Escape')

    // Use [Next] button in MiniBar
    await page.getByRole('button', { name: 'Next', exact: true }).click()

    // 5. Verify Tag is GONE (different week context)
    await expect(card.locator('span', { hasText: 'Mon' })).toBeHidden()

    // 6. Add to Wednesday of NEXT week
    await card.getByText('Add to Week').click()
    await page.locator('[role="dialog"] button', { hasText: 'Wed' }).click()
    await expect(card.locator('span', { hasText: 'Wed' })).toBeVisible()

    // 7. Switch back to THIS week
    await page.getByRole('button', { name: 'This', exact: true }).click()

    // 8. Verify Mon is back, Wed is gone
    await expect(card.locator('span', { hasText: 'Mon' })).toBeVisible()
    await expect(card.locator('span', { hasText: 'Wed' })).toBeHidden()
  })

  test('week view groups recipes by day', async ({ page }) => {
    // 1. Add recipe to Monday
    await page.locator('[data-testid="recipe-card-1"] span', { hasText: 'Add to Week' }).click()
    await page.locator('button', { hasText: 'Mon' }).click()

    // 2. Go to Week Tab
    await page.getByRole('tab', { name: 'Plan' }).click()

    // 3. Verify Grouping
    // Should see "Monday" header
    await expect(page.getByRole('button', { name: /Monday/i })).toBeVisible()

    // Should see Recipe in the list
    await expect(page.locator('[data-testid="recipe-card-1"]')).toBeVisible()

    // Should NOT see other recipes (filtered)
    await expect(page.locator('[data-testid="recipe-card-101"]')).toBeHidden()
  })
})
