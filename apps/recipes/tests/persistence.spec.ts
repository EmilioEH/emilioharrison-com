import { test, expect } from '@playwright/test'

test.describe('Recipe Persistence', () => {
  test('should persist recipe after reload', async ({ page, context }) => {
    // Mock Auth
    await context.addCookies([
      {
        name: 'site_auth',
        value: 'true',
        url: 'http://127.0.0.1:8788',
      },
      {
        name: 'site_user',
        value: `ReproUser-${Date.now()}`,
        url: 'http://127.0.0.1:8788',
      },
    ])

    await page.goto('/protected/recipes')

    // Simulate persistence locally for this test session
    let sessionRecipes: any[] = []
    await page.route('**/api/user-data', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: { recipes: sessionRecipes } })
      } else {
        const body = await route.request().postDataJSON()
        sessionRecipes = body.recipes
        await route.fulfill({ json: { success: true } })
      }
    })

    const testTitle = `Repro Recipe ${Date.now()}`
    await page
      .getByRole('button')
      .filter({ has: page.locator('svg.lucide-plus') })
      .click()
    await page.getByLabel('Title').fill(testTitle)
    await page.getByText('Save Recipe').click()

    // Wait for save sync (UI shows Check icon)
    await expect(page.locator('svg.lucide-check')).toBeVisible()

    // Reload the page
    await page.reload()

    // Verify it's still there
    // Verify it's still there
    await expect(page.getByText(testTitle)).toBeVisible({ timeout: 15000 })
  })
})
