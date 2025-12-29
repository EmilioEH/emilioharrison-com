import { test, expect } from '@playwright/test'

test.describe('Global Menu Visibility', () => {
  test('should be visible and clickable on recipe detail page', async ({ page, context }) => {
    // 0. Set Auth Cookies to bypass middleware
    await context.addCookies([
      { name: 'site_auth', value: 'true', domain: '127.0.0.1', path: '/' },
      { name: 'site_user', value: 'TestUser', domain: '127.0.0.1', path: '/' },
      { name: 'site_email', value: 'emilioeh1991@gmail.com', domain: '127.0.0.1', path: '/' },
    ])

    // 0. Mock Recipes API
    await page.route('**/api/recipes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recipes: [
            {
              id: 'test-recipe-1',
              title: 'Test Recipe',
              description: 'A test recipe',
              ingredients: [],
              steps: ['Step 1'],
              prepTime: 10,
              cookTime: 20,
              servings: 4,
              thisWeek: false,
              isFavorite: false,
            },
          ],
        }),
      })
    })

    // 1. Visit the recipes page
    await page.goto('/protected/recipes')

    // Wait for recipes to load
    await expect(page.locator('[data-testid^="recipe-card-"]')).toHaveCount(1)

    // Get the first recipe card
    const firstRecipe = page.locator('[data-testid^="recipe-card-"]').first()
    await expect(firstRecipe).toBeVisible()

    // 2. Click to open details
    await firstRecipe.click()

    // Verify detail view is open (check for Back button)
    const backButton = page.getByRole('button', { name: 'Back to Library' })
    await expect(backButton).toBeVisible()

    // 3. Verify Global Menu Button is visible
    // The button has aria-label="Open Menu"
    const menuButton = page.getByRole('button', { name: 'Open Menu' })

    // Check if it's visible. In Playwright, if z-index is lower than an overlay, it might not be accidentally clickable,
    // but toBeVisible() mainly checks display properties.
    // To check if it's NOT covered, we can try to click it or check stacking context,
    // but clicking is the ultimate user test.
    await expect(menuButton).toBeVisible()

    // 4. Click the menu button
    await menuButton.click()

    // 5. Verify Menu Drawer is open
    const menuDrawer = page.getByRole('menu')
    await expect(menuDrawer).toBeVisible()

    // Verify a link inside, e.g., "Settings" or "Send Feedback"
    await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeVisible()
  })
})
