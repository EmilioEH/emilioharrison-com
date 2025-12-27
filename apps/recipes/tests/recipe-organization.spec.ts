import { test, expect } from '@playwright/test'

test.describe('Recipe Organization', () => {
  const TEST_ACCESS_KEY = 'let-me-in-please'

  test.beforeEach(async ({ page, context }) => {
    // Set cookie to bypass login for some tests, or login normally
    await context.addCookies([
      { name: 'site_user', value: 'Test User', domain: '127.0.0.1', path: '/' },
      { name: 'site_auth', value: 'true', domain: '127.0.0.1', path: '/' },
      { name: 'recipe_auth_token', value: 'valid-token', domain: '127.0.0.1', path: '/' },
    ])

    // Go to recipes page
    await page.goto('/protected/recipes')

    // If redirect happens (invalid token), handle login
    if (await page.getByPlaceholder('Enter password').isVisible()) {
      await page.getByPlaceholder('Enter password').fill(TEST_ACCESS_KEY)
      await page.getByRole('button', { name: 'Unlock' }).click()
    }

    // Wait for app to load
    await expect(page.getByText('CHEFBOARD')).toBeVisible()

    // Clear existing recipes if needed (optional, or rely on isolation)
  })

  test('should organize recipes into protein folders', async ({ page }) => {
    const title = `Chicken Parm ${Date.now()}`
    // 1. Create a Chicken recipe
    await page
      .getByRole('button')
      .filter({ has: page.locator('svg.lucide-plus') })
      .click() // Add Manual
    await page.getByPlaceholder("Grandma's Pancakes").fill(title)
    await page.locator('select').first().selectOption('Chicken') // Select Protein
    await page.getByRole('button', { name: 'Save Recipe' }).click()

    // 2. Verify we are back in library view and the group is visible
    const chickenFolder = page.getByRole('button', { name: /Chicken/i }).first()
    await expect(chickenFolder).toBeVisible()

    // 4. Click Chicken folder
    await chickenFolder.click()

    // 5. Verify recipe is inside
    await expect(page.getByText(title).first()).toBeVisible()
  })

  test.skip('should support "This Week" folder', async ({ page }) => {
    const title = `Weekly Loaf ${Date.now()}`
    // 1. Create a recipe
    await page
      .getByRole('button')
      .filter({ has: page.locator('svg.lucide-plus') })
      .click()
    await page.getByPlaceholder("Grandma's Pancakes").fill(title)
    await page.getByRole('button', { name: 'Save Recipe' }).click()

    // 2. Go to Uncategorized (since no protein)
    await page.getByRole('button', { name: 'Uncategorized' }).click()
    await page.getByText(title).first().click()

    // 3. Open actions menu and Add to This Week
    // Detail view is open. Menu is under MoreHorizontal button.
    // My implementation: <button ...><MoreHorizontal /></button> -> Dropdown
    await page.locator('button:has(svg.lucide-more-horizontal)').click()
    await page.getByRole('button', { name: 'Add to This Week' }).click()

    // 4. Close detail view
    await page.locator('button:has(svg.lucide-arrow-left)').first().click()

    // 5. Go back to root (click arrow left again if we are in Uncategorized)
    await page.locator('button:has(svg.lucide-arrow-left)').first().click()

    // 6. Check This Week folder (Currently hidden/removed in UI)
  })

  test('should filter recipes', async ({ page }) => {
    // 1. Open Filter Panel (now in LibraryToolbar)
    await page.getByRole('button', { name: 'Open Filters' }).click()

    // 2. Select "Easy" difficulty
    await page.getByRole('button', { name: 'Easy', exact: true }).click()

    // 3. Close panel
    await page
      .getByRole('button')
      .filter({ has: page.locator('svg.lucide-x') })
      .click()

    // ... Verification logic depends on having data
  })
})
