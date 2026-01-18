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

    // The button text is "Add to Week" (inside a Badge component)
    await card.getByText('Add to Week').click()

    // 2. Verify DayPicker Modal Opens
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()
    // Modal title contains "Add" and body contains "Planning for"
    await expect(modal).toContainText('Add')

    // 3. Select "Tuesday"
    // Find the Tuesday button. It usually contains "Tue" and the date.
    const tuesdayBtn = modal.locator('button', { hasText: 'Tue' })
    await tuesdayBtn.click()

    // 4. Verify Modal Closes (auto-close on add)
    await expect(modal).toBeHidden()

    // 5. Verify Tag appears on Card (Badge component, text is "Tue")
    await expect(card.getByText('Tue', { exact: true })).toBeVisible()
  })

  test('can switch weeks and verify persistence', async ({ page }) => {
    const card = page.locator('[data-testid="recipe-card-1"]')

    // 1. Add to Monday of THIS week
    await card.getByText('Add to Week').click()
    await page.locator('[role="dialog"] button', { hasText: 'Mon' }).click()
    await expect(card.getByText('Mon', { exact: true })).toBeVisible()

    // 2. Open Calendar (WeekContextBar calendar icon at bottom)
    const calButton = page.locator('button:has(.lucide-calendar)')
    await calButton.first().click()

    // 3. Verify Calendar Modal
    const calModal = page.locator('[role="dialog"]')
    await expect(calModal).toBeVisible()
    await expect(calModal).toContainText('Select Week')

    // 4. Close modal to use bottom bar toggle
    await page.keyboard.press('Escape')

    // 5. Use [Next] button in bottom WeekContextBar (aria-label is 'Next Week')
    await page.getByLabel('Next Week').click()

    // 6. Verify Tag format changes to "N: Mon" (Next week prefix)
    await expect(card.getByText('N: Mon')).toBeVisible()

    // 7. Add to Wednesday of NEXT week
    await card.getByText('Add to Week').click()
    await page.locator('[role="dialog"] button', { hasText: 'Wed' }).click()
    await expect(card.getByText('Wed', { exact: true })).toBeVisible()

    // 8. Switch back to THIS week (aria-label is 'This Week')
    await page.getByLabel('This Week').click()

    // 9. Verify Mon is back (plain format), Wed shows N: prefix
    await expect(card.getByText('Mon', { exact: true })).toBeVisible()
    await expect(card.getByText('N: Wed')).toBeVisible()
  })

  test('week view groups recipes by day', async ({ page }) => {
    // 1. Add recipe to Monday
    await page.locator('[data-testid="recipe-card-1"]').getByText('Add to Week').click()
    await page.locator('button', { hasText: 'Mon' }).click()

    // 2. Go to Week Tab (via View link in bottom bar)
    await page.getByText('View', { exact: true }).click()

    // 3. Verify Grouping
    // Should see "Monday" header
    await expect(page.getByRole('button', { name: /Monday/i })).toBeVisible()

    // Should see Recipe in the list
    await expect(page.locator('[data-testid="recipe-card-1"]')).toBeVisible()

    // Should NOT see other recipes (filtered)
    await expect(page.locator('[data-testid="recipe-card-101"]')).toBeHidden()
  })
})
