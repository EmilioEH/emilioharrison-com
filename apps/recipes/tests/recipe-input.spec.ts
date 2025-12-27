import { test, expect } from '@playwright/test'

test.describe('Recipe Input Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Auth
    // Mock Login POST to bypass server logic
    await page.route('**/login', async (route) => {
      if (route.request().method() === 'POST') {
        await page.context().addCookies([
          { name: 'site_auth', value: 'true', url: 'http://127.0.0.1:8788/' },
          { name: 'site_user', value: 'TestUser', url: 'http://127.0.0.1:8788/' },
        ])
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: '<html><body>Login Success<script>window.location.href="/protected/recipes"</script></body></html>',
        })
      } else {
        await route.continue()
      }
    })

    // Perform UI Login
    await page.goto('/protected/recipes')
    // Expect login page
    await expect(page).toHaveURL(/.*\/login/)

    await page.fill('#name', 'TestUser')
    await page.fill('#password', 'password123')
    await page.getByRole('button', { name: 'Enter Kitchen' }).click()

    // Wait for redirect back
    await expect(page).toHaveURL(/\/protected\/recipes\/?$/)

    // Mock Parse Recipe API
    await page.route('**/api/parse-recipe', async (route) => {
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
    await page.getByTitle('AI Chef').click()

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
    await page.route('**/api/parse-recipe', async (route) => {
      await route.fulfill({
        status: 400,
        json: { error: 'Invalid URL provided' },
      })
    })

    await page.goto('/protected/recipes')
    await page.getByTitle('AI Chef').click()
    await page.getByText('URL', { exact: true }).click()
    await page.getByLabel('Paste Recipe Link').fill('https://example.com/bad')
    await page.getByRole('button', { name: 'Process Recipe' }).click()

    await expect(page.getByText('Error: Invalid URL provided')).toBeVisible()
  })

  test('should display camera and gallery options', async ({ page }) => {
    await page.goto('/protected/recipes')
    await page.getByTitle('AI Chef').click()

    // Verify default view (Photo tab)
    await expect(page.getByText('Add a photo of your dish')).toBeVisible()

    // Verify Gallery Option
    const galleryBtn = page.getByRole('button', { name: 'Gallery' })
    await expect(galleryBtn).toBeVisible()
    const galleryInput = page.locator('input[type="file"]').first()
    await expect(galleryInput).not.toHaveAttribute('capture')

    // Verify Camera Option
    const cameraBtn = page.getByRole('button', { name: 'Camera' })
    await expect(cameraBtn).toBeVisible()
    const cameraInput = page.locator('input[type="file"]').nth(1)
    await expect(cameraInput).toHaveAttribute('capture', 'environment')
  })
})
