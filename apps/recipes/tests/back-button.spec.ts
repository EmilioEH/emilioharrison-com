import { test, expect } from '@playwright/test'

test.describe('Back Button Navigation', () => {
  // Bypass authentication
  test.use({
    storageState: {
      cookies: [
        {
          name: 'site_auth',
          value: 'true',
          domain: '127.0.0.1',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
        {
          name: 'site_user',
          value: 'TestUser',
          domain: '127.0.0.1',
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

  test.beforeEach(async ({ page }) => {
    // Debug console
    page.on('console', (msg) => console.log(`[Browser Console] ${msg.text()}`))

    // Mock generic API routes to return valid but empty data or test data
    await page.route('**/api/recipes*', async (route) => {
      // Handle both /api/recipes and /api/recipes/xyz
      await route.fulfill({
        json: {
          recipes: [
            {
              id: '1',
              title: 'Test Recipe',
              ingredients: [{ name: 'Test Ingredient', amount: '1', prep: '' }],
              steps: ['Test Step'],
              notes: '',
              protein: 'Chicken',
              difficulty: 'Easy',
              rating: 0,
              isFavorite: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        },
      })
    })

    // Clean state
  })

  test('should navigate back to library from grocery view instead of logging out', async ({
    page,
  }) => {
    await page.goto('/protected/recipes')

    // Wait for the recipe list to load
    await expect(page.getByText('CHEFBOARD')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Test Recipe')).toBeVisible()

    // Switch to "Grocery List" view
    await page.getByRole('button', { name: 'Grocery List' }).click()
    await expect(page.getByText('Grocery List', { exact: true })).toBeVisible()

    // Now press back
    await page.goBack()

    // Expect to be back at Library
    await expect(page).toHaveURL(/protected\/recipes/)
    await expect(page.url()).not.toContain('/login')
    await expect(page.getByText('CHEFBOARD')).toBeVisible()
    await expect(page.getByText('Grocery List', { exact: true })).not.toBeVisible()
  })
})
