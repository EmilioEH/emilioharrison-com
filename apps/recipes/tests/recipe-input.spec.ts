import { test, expect } from '@playwright/test'

test.describe('Recipe Add Flow (Unified)', () => {
  test.beforeEach(async ({ context, page }) => {
    // Set auth cookies directly (simulates authenticated state)
    await context.addCookies([
      { name: 'site_auth', value: 'true', domain: '127.0.0.1', path: '/' },
      { name: 'site_user', value: 'TestUser', domain: '127.0.0.1', path: '/' },
    ])

    // Mock Parse Recipe API
    await page.route('**/api/parse-recipe', async (route) => {
      await route.fulfill({
        json: {
          title: `AI Parsed Recipe ${Date.now()}`,
          servings: 4,
          prepTime: 10,
          cookTime: 20,
          ingredients: [
            { name: 'Flour', amount: '2 cups' },
            { name: 'Milk', amount: '1 cup' },
          ],
          steps: ['Mix everything', 'Cook on pan'],
          difficulty: 'Easy',
          protein: 'Chicken',
        },
      })
    })

    // Mock Recipe Save API
    await page.route('**/api/recipes', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          json: { id: `mock-id-${Date.now()}` },
        })
      } else {
        await route.continue()
      }
    })
  })

  test('FAB opens unified recipe editor with AI importer', async ({ page }) => {
    await page.goto('/protected/recipes')
    await expect(page.getByText('CHEFBOARD')).toBeVisible({ timeout: 10000 })

    // Click the FAB (Add Recipe button)
    await page.getByLabel('Add Recipe').click()

    // Verify we are in the "New Recipe" editor view
    await expect(page.getByRole('heading', { name: 'New Recipe' })).toBeVisible()

    // Verify the AI Importer is present (Photo/URL toggle)
    await expect(page.getByText('Photo', { exact: true })).toBeVisible()
    await expect(page.getByText('URL', { exact: true })).toBeVisible()
  })

  test('should allow adding a recipe via AI URL import', async ({ page }) => {
    await page.goto('/protected/recipes')
    await page.getByLabel('Add Recipe').click()

    // Select URL tab in the AI Importer
    await page.getByText('URL', { exact: true }).click()

    // Fill URL
    await page.getByLabel('Paste Recipe Link').fill('https://example.com/recipe')

    // Process with AI
    await page.getByRole('button', { name: 'Process Recipe' }).click()

    // Wait for form to be populated
    await expect(page.getByLabel('Title')).toHaveValue(/AI Parsed Recipe \d+/, { timeout: 10000 })

    // Save the recipe
    await page.getByRole('button', { name: 'Save Recipe' }).click()

    // Expect to be back on the library
    await expect(page.getByRole('heading', { name: 'New Recipe' })).not.toBeVisible()
  })

  test('should display camera and gallery options in AI importer', async ({ page }) => {
    await page.goto('/protected/recipes')
    await page.getByLabel('Add Recipe').click()

    // Verify default view has Photo tab selected
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

  test('should allow manual recipe entry without AI', async ({ page }) => {
    await page.goto('/protected/recipes')
    await page.getByLabel('Add Recipe').click()

    // Fill in recipe details manually (skip AI importer)
    await page.getByLabel('Title').fill('Manual Test Recipe')
    await page.getByLabel('Protein').selectOption('Beef')
    await page.getByLabel('servings').fill('4')
    await page.getByLabel('prep').fill('15')
    await page.getByLabel('cook').fill('30')
    await page.getByLabel(/Ingredients/i).fill('1 lb Ground Beef\n2 cups Rice')
    await page.getByLabel(/Instructions/i).fill('Cook the beef.\nAdd rice.')

    // Save
    await page.getByRole('button', { name: 'Save Recipe' }).click()

    // Expect to be back on the library
    await expect(page.getByRole('heading', { name: 'New Recipe' })).not.toBeVisible()
  })

  test('should display AI error message when parsing fails', async ({ page }) => {
    // Override the mock for error case
    await page.route('**/api/parse-recipe', async (route) => {
      await route.fulfill({
        status: 400,
        json: { error: 'Could not parse recipe from URL' },
      })
    })

    await page.goto('/protected/recipes')
    await page.getByLabel('Add Recipe').click()
    await page.getByText('URL', { exact: true }).click()
    await page.getByLabel('Paste Recipe Link').fill('https://example.com/bad-url')
    await page.getByRole('button', { name: 'Process Recipe' }).click()

    await expect(page.getByText('Could not parse recipe from URL')).toBeVisible()
  })
})
