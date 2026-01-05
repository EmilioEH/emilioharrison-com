import { test, expect } from '@playwright/test'

test.describe('Cooking Mode Step Enhancements', () => {
  test.use({
    storageState: {
      cookies: [],
      origins: [],
    },
  })

  // Pre-seed recipe
  const TEST_RECIPE = {
    id: `recipe-step-test-${Date.now()}`,
    title: 'STEP_TEST_RECIPE',
    servings: 2,
    prepTime: 10,
    cookTime: 20,
    ingredients: [{ name: 'Ingredient 1', amount: '1' }],
    steps: ['Step 1: Mix', 'Step 2: Bake', 'Step 3: Serve'],
  }

  test.beforeEach(async ({ page }) => {
    const currentRecipes: unknown[] = [TEST_RECIPE]

    await page.route('**/api/recipes*', async (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        await route.fulfill({ json: { recipes: currentRecipes } })
      } else {
        await route.fulfill({ json: { success: true, id: TEST_RECIPE.id } })
      }
    })
  })

  test('should display vertical previews and step list', async ({ page }) => {
    await page.goto('/protected/recipes')

    // Wait for loading to finish
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible()

    // Open recipe and start cooking
    await page.getByText(TEST_RECIPE.title).first().click()
    await page.getByRole('button', { name: 'Start Cooking' }).click()

    // 1. Check Initial State (Step 1)
    await expect(page.getByText('Step 1 of 3')).toBeVisible()
    await expect(page.getByText('Step 1: Mix')).toBeVisible()

    // Check Next Step Preview (Vertical)
    await expect(page.getByText('Step 2').first()).toBeVisible()
    await expect(page.getByText('Step 2: Bake').first()).toBeVisible()

    // Check Footer Buttons
    const nextBtn = page.getByRole('button', { name: 'Next Step' })
    await expect(nextBtn).toBeVisible()
    await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled()

    // 2. Click Steps Button in Header
    const stepsBtn = page.getByTitle('View All Steps')
    await expect(stepsBtn).toBeVisible()
    await stepsBtn.click()

    // 3. Verify Sheet Opens
    await expect(page.getByRole('heading', { name: 'Cooking Steps' })).toBeVisible()
    await expect(page.getByText('Step 1: Mix')).toBeVisible()
    await expect(page.getByText('Step 2: Bake')).toBeVisible()
    await expect(page.getByText('Step 3: Serve')).toBeVisible()

    // 4. Jump to Step 3
    await page.getByText('Step 3: Serve').click()

    // Verify Sheet Closed and Step Updated
    await expect(page.getByRole('heading', { name: 'Cooking Steps' })).not.toBeVisible()
    await expect(page.getByText('Step 3 of 3')).toBeVisible()
    await expect(page.getByText('Step 3: Serve')).toBeVisible()

    // 5. Verify Previous Preview (Vertical)
    await expect(page.getByText('Step 2').first()).toBeVisible()
    await expect(page.getByText('Step 2: Bake').first()).toBeVisible()

    // Check Footer Button
    await expect(page.getByRole('button', { name: 'Finish Cooking' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Previous' })).not.toBeDisabled()
  })
})
