import { test, expect } from '@playwright/test'

test.describe('Recipe Input Flow', () => {
  test.beforeEach(async ({ page, context }) => {
    // Mock Auth
    await context.addCookies([
      {
        name: 'site_auth',
        value: 'true',
        domain: '127.0.0.1',
        path: '/',
      },
      {
        name: 'site_user',
        value: 'testuser',
        domain: '127.0.0.1',
        path: '/',
      },
    ])

    // Mock Parse Recipe API
    await page.route('/api/parse-recipe', async (route) => {
      await route.fulfill({
        json: {
          title: `Mocked Pancake ${Date.now()}`,
          servings: 4,
          prepTime: 10,
          cookTime: 20,
          ingredients: [
            { name: 'Flour', amount: '2 cups' },
            { name: 'Milk', amount: '1 cup' },
          ],
          steps: ['Mix everything', 'Cook on pan'],
          difficulty: 'Easy',
          protein: 'Chicken', // Mock it as Chicken so we can find it in Chicken folder
        },
      })
    })
  })

  test('should allow adding a recipe via AI flow', async ({ page }) => {
    // 1. Go to dashboard
    await page.goto('/protected/recipes')

    // Confirm we are on the recipe page (not redirected to login)
    await expect(page).toHaveURL(/\/protected\/recipes/)

    // 2. Click "AI Add" (Sparkles icon)
    await expect(page.getByText('CHEFBOARD')).toBeVisible({ timeout: 10000 })
    await page.getByTitle('AI Add').click()

    // 3. Verify we are in the "New Recipe from AI" view
    await expect(page.getByText('New Recipe from AI')).toBeVisible()

    // Select URL tab
    await page.getByText('URL', { exact: true }).click()

    // Fill URL
    await page.getByLabel('Paste Recipe Link').fill('https://example.com/pancakes')

    // Process
    await page.getByRole('button', { name: 'Process Recipe' }).click()

    // Expect Review Mode to appear
    await expect(page.getByRole('heading', { name: 'Review & Edit' })).toBeVisible()

    // Check if data is populated and capture the dynamic title
    const titleInput = page.getByLabel('Title')
    await expect(titleInput).toHaveValue(/Mocked Pancake \d+/)
    const recipeTitle = await titleInput.inputValue()

    // Save
    await page.getByRole('button', { name: 'Save Recipe' }).click()

    // Expect to be back on the dashboard (List View / Library)
    // "Review & Edit" should be gone
    await expect(page.getByRole('heading', { name: 'Review & Edit' })).not.toBeVisible()

    // The new recipe should be in the Chicken folder
    await page.getByRole('button', { name: 'Chicken' }).first().click()
    await expect(page.getByText(recipeTitle)).toBeVisible()
  })

  test('should display backend error message when parsing fails', async ({ page }) => {
    // Override the mock for this specific test
    await page.route('/api/parse-recipe', async (route) => {
      await route.fulfill({
        status: 400,
        json: { error: 'Invalid URL provided' },
      })
    })

    await page.goto('/protected/recipes')
    await page.getByTitle('AI Add').click()
    await page.getByText('URL', { exact: true }).click()
    await page.getByLabel('Paste Recipe Link').fill('https://example.com/bad')
    await page.getByRole('button', { name: 'Process Recipe' }).click()

    await expect(page.getByText('Error: Invalid URL provided')).toBeVisible()
  })
})
