import { test, expect } from '@playwright/test'

test.describe('Recipe Manager', () => {
  // Bypass authentication for all tests in this file
  test.use({
    storageState: {
      cookies: [
        {
          name: 'site_auth',
          value: 'true',
          domain: 'localhost',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
        {
          name: 'site_user',
          value: 'TestUser',
          domain: 'localhost',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
      ],
      origins: [],
    },
  })

  test('should allow creating and viewing a recipe', async ({ page }) => {
    // 1. Go to the recipe manager
    await page.goto('/protected/recipes')

    // Check we are not redirected to login
    await expect(page).toHaveURL(/\/protected\/recipes/)
    await expect(page.getByText('CHEFBOARD')).toBeVisible()

    // 2. Add a new recipe
    await page
      .getByRole('button')
      .filter({ has: page.locator('svg.lucide-plus') })
      .click()

    const testTitle = `E2E Test Recipe ${Date.now()}`
    // Use getByLabel for better reliability
    await page.getByLabel('Title').fill(testTitle)
    await page.getByLabel('Ingredients (One per line)').fill('1 cup Flour')
    await page.getByLabel('Instructions (One per line)').fill('Mix well')

    await page.getByText('Save Recipe').click()

    // 3. Verify it appears in the list
    await expect(page.getByText(testTitle)).toBeVisible()

    // 4. Click into it to verify details
    // Click 'Start Cooking' on the SPECIFIC card we just created
    // We filter by the unique title to ensure we don't click an old/empty recipe
    await page
      .locator('div')
      .filter({ hasText: testTitle })
      .getByRole('button', { name: 'Start Cooking' })
      .first()
      .click()

    // Wait for prep mode
    await expect(page.getByText('Steps')).toBeVisible()
    await expect(page.getByText('Prep for ' + testTitle)).toBeVisible()

    // Close prep mode
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.getByText('CHEFBOARD')).toBeVisible()
  })
})
