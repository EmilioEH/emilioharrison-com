import { test, expect } from './msw-setup'

test.describe('Global Menu Visibility', () => {
  test('should be visible and clickable on the library page', async ({ page, context }) => {
    // 0. Set Auth Cookies to bypass middleware
    await context.addCookies([
      { name: 'site_auth', value: 'true', domain: 'localhost', path: '/' },
      { name: 'site_user', value: 'TestUser', domain: 'localhost', path: '/' },
      { name: 'site_email', value: 'emilioeh1991@gmail.com', domain: 'localhost', path: '/' },
    ])

    // 0. Mock Recipes API. Note: the library's initial recipe list now comes from
    // `GET /api/bootstrap`, not a standalone `GET /api/recipes` call (see PERFORMANCE-PLAN.md
    // P6+P7) — but msw-setup.ts's shared `/api/bootstrap` mock composes its response by calling
    // back into this same page's routes (`/api/recipes`, `/api/week/planned`,
    // `/api/families/current`), so mocking `/api/recipes` here is still sufficient.
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
            },
          ],
        }),
      })
    })

    // 1. Visit the recipes page
    await page.goto('/protected/recipes')

    // Wait for recipes to load
    await expect(page.locator('[data-testid^="recipe-card-"]')).toHaveCount(1)

    // 2. Verify Global Menu Button is visible on the library header. The burger-menu trigger
    // (aria-label="Menu") lives only in RecipeHeader.tsx — it's not reachable from within the
    // recipe detail view, which has its own header (Back/Share/More Options).
    const menuButton = page.getByRole('button', { name: 'Menu' })
    await expect(menuButton).toBeVisible()

    // 3. Click the menu button
    await menuButton.click()

    // 4. Verify Menu Drawer is open
    const menuDrawer = page.getByRole('menu')
    await expect(menuDrawer).toBeVisible()

    // Verify a link inside, e.g., "Manage Family"
    await expect(page.getByRole('menuitem', { name: 'Manage Family' })).toBeVisible()
  })
})
