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

    // 3. Verify it appears in the list (inside Uncategorized folder since no protein set)
    // Wait for "Uncategorized" folder to appear and click it
    await page.getByRole('button', { name: 'Uncategorized' }).click()
    await expect(page.getByText(testTitle)).toBeVisible()

    // 4. Click into it to verify details
    await page.getByText(testTitle).click()

    // Wait for Detail View
    await expect(page.getByText('Ingredients')).toBeVisible()
    await expect(page.getByText(testTitle)).toBeVisible()

    // Check interaction (check an ingredient)
    await page.getByText('1 cup Flour').click()
    
    // Close detail view (Arrow Left)
    await page.locator('button:has(svg.lucide-arrow-left)').first().click()
    
    // Verify we are back in the folder
    await expect(page.getByText('Uncategorized')).toBeVisible()
    await expect(page.getByText('Browse by Protein')).not.toBeVisible() // We are inside folder
    
    // Go back to root
    await page.locator('button:has(svg.lucide-arrow-left)').click()
    await expect(page.getByText('Browse by Protein')).toBeVisible()
  })
})
