import { test, expect } from '@playwright/test'

test.describe('Recipe Persistence', () => {
  test('should persist recipe after reload', async ({ page, context }) => {
    // Mock Auth
    await context.addCookies([
      {
        name: 'site_auth',
        value: 'true',
        domain: 'localhost',
        path: '/',
      },
      {
        name: 'site_user',
        value: `ReproUser-${Date.now()}`,
        domain: 'localhost',
        path: '/',
      },
    ])

    // Mock the user-data API to simulate KV storage
    // This needs to persist across page reloads
    let savedRecipes: unknown[] = []
    
    // Set up route handler that persists across navigations
    await context.route('/api/user-data', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: { recipes: savedRecipes } })
      } else if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON()
        savedRecipes = body.recipes || []
        await route.fulfill({ json: { success: true } })
      } else {
        await route.continue()
      }
    })

    await page.goto('/protected/recipes')

    const testTitle = `Repro Recipe ${Date.now()}`
    await page
      .getByRole('button')
      .filter({ has: page.locator('svg.lucide-plus') })
      .click()
    await page.getByLabel('Title').fill(testTitle)
    await page.getByText('Save Recipe').click()

    // Wait for save sync (UI shows "Saved")
    await expect(page.getByText('Saved')).toBeVisible()

    // Reload the page
    await page.reload()

    // Verify it's still there
    // It defaults to Uncategorized folder
    await page.getByRole('button', { name: 'Uncategorized' }).click()
    await expect(page.getByText(testTitle)).toBeVisible()
  })
})
