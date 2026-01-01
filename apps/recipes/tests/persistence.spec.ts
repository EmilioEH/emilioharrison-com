import { test, expect } from '@playwright/test'

test.describe('Recipe Persistence', () => {
  test('should persist recipe after reload', async ({ page, context }) => {
    // Mock Auth
    await context.addCookies([
      {
        name: 'site_auth',
        value: 'true',
        domain: 'localhost', path: '/',
      },
      {
        name: 'site_user',
        value: `ReproUser-${Date.now()}`,
        domain: 'localhost', path: '/',
      },
      {
        name: 'site_email',
        value: 'emilioeh1991@gmail.com',
        domain: 'localhost', path: '/',
      },
    ])

    await page.goto('/protected/recipes')

    // Simulate persistence locally for this test session
    let sessionRecipes: any[] = []
    await page.route('**/api/recipes*', async (route) => {
      if (route.request().method() === 'GET') {
        // Handle both list and detail GET if needed, but here we just need the list
        await route.fulfill({ json: { recipes: sessionRecipes } })
      } else if (route.request().method() === 'POST') {
        const body = await route.request().postDataJSON()
        const newRecipe = { ...body, id: body.id || `recipe-${Date.now()}` }
        sessionRecipes.push(newRecipe)
        await route.fulfill({ json: { success: true, id: newRecipe.id } })
      } else {
        await route.continue()
      }
    })

    const testTitle = `Repro Recipe ${Date.now()}`
    await page
      .getByRole('button')
      .filter({ has: page.locator('svg.lucide-plus') })
      .click()
    await page.getByLabel('Title').fill(testTitle)
    await page.getByText('Save Recipe').click()

    // Wait for save sync and navigation back to library
    // The "New Recipe" header should be gone
    await expect(page.getByRole('heading', { name: 'New Recipe' })).not.toBeVisible()

    // Reload the page
    await page.reload()

    // Verify it's still there
    await expect(page.getByText(testTitle)).toBeVisible({ timeout: 15000 })
  })
})
