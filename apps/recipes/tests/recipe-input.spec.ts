import { test, expect } from '@playwright/test'

test.describe('Recipe Input Flow', () => {
  test.beforeEach(async ({ page, context }) => {
    // Mock Auth
    await context.addCookies([
      {
        name: 'site_user',
        value: 'testuser',
        domain: 'localhost',
        path: '/',
      },
    ])

    // Mock User Data (Initial state)
    await page.route('/api/user-data', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: { recipes: [] } })
      } else if (route.request().method() === 'POST') {
        // const body = route.request().postDataJSON();
        // Verify payload here if needed
        await route.fulfill({ json: { success: true } })
      } else {
        await route.continue()
      }
    })

    // Mock Parse Recipe API
    await page.route('/api/parse-recipe', async (route) => {
      await route.fulfill({
        json: {
          title: 'Mocked Pancake',
          servings: 4,
          prepTime: 10,
          cookTime: 20,
          ingredients: [
            { name: 'Flour', amount: '2 cups' },
            { name: 'Milk', amount: '1 cup' },
          ],
          steps: ['Mix everything', 'Cook on pan'],
          metadata: { difficulty: 'Easy' },
        },
      })
    })
  })

  test('should allow adding a recipe via URL input', async ({ page }) => {
    await page.goto('/add-recipe')

    // Verify URL
    await expect(page).toHaveURL(/\/add-recipe/)
    await page.waitForLoadState('networkidle')

    // Select URL tab
    await page.getByText('URL', { exact: true }).click()

    // Fill URL
    await page.getByLabel('Paste Recipe Link').fill('https://example.com/pancakes')

    // Process
    await page.getByRole('button', { name: 'Process Recipe' }).click()

    // Expect Review Mode to appear
    await expect(page.getByRole('heading', { name: 'Review & Edit' })).toBeVisible()

    // Check if data is populated
    await expect(page.getByLabel('Title')).toHaveValue('Mocked Pancake')

    // Save
    await page.getByRole('button', { name: 'Save Recipe' }).click()

    // Expect Success Message
    await expect(page.getByRole('heading', { name: 'Recipe Saved!' })).toBeVisible()

    // Verify "Add Another" returns to initial state
    await page.getByRole('button', { name: 'Add Another' }).click()
    await expect(page.getByRole('button', { name: 'Process Recipe' })).toBeVisible()
  })
})
