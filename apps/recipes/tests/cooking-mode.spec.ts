import { test, expect } from '@playwright/test'

test.describe('Recipe Cooking Mode', () => {
  test.use({
    storageState: {
      cookies: [
        {
          name: 'site_auth',
          value: 'true',
          domain: 'localhost',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
        {
          name: 'site_user',
          value: 'TestUser',
          domain: 'localhost',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
        {
          name: 'site_email',
          value: 'emilioeh1991@gmail.com',
          domain: 'localhost',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
      ],
      origins: [],
    },
  })

  // Pre-seed recipe to avoid flaky UI creation
  const TEST_RECIPE = {
    id: `recipe-test-${Date.now()}`,
    title: 'COOK_TEST_PRESEEDED',
    servings: 2,
    prepTime: 10,
    cookTime: 20,
    ingredients: [
      { name: 'Flour', amount: '1 cup', prep: 'sifted' },
      { name: 'Eggs', amount: '2' },
    ],
    steps: ['Mix ingredients', 'Bake for 20 mins'],
    // Optional fields to match type
    notes: '',
    description: 'Test recipe',
    thisWeek: false,
  }

  test.beforeEach(async ({ page }) => {
    // Mock user data to keep the test environment clean and isolated
    let currentRecipes: any[] = [TEST_RECIPE]

    await page.route('**/api/recipes*', async (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        await route.fulfill({ json: { recipes: currentRecipes } })
      } else if (method === 'POST') {
        const body = await route.request().postDataJSON()
        const newRecipe = { ...body, id: body.id || `recipe-${Date.now()}` }
        currentRecipes.push(newRecipe)
        await route.fulfill({ json: { success: true, id: newRecipe.id } })
      } else if (method === 'PUT') {
        const body = await route.request().postDataJSON()
        currentRecipes = currentRecipes.map((r) => (r.id === body.id ? body : r))
        await route.fulfill({ json: { success: true } })
      } else {
        await route.fulfill({ json: { success: true } })
      }
    })
  })

  test('should navigate through new cooking mode flow (Phase 1)', async ({ page }) => {
    // Setup wait for response BEFORE triggering navigation
    // Relaxed URL check to catch any API call
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/recipes') && response.status() === 200,
    )

    await page.goto('/protected/recipes')

    // Wait for the API call to complete
    await responsePromise

    // Wait for loading to finish
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible()

    // 1. Open the pre-seeded recipe
    const recipeCard = page.getByText(TEST_RECIPE.title).first()
    await expect(recipeCard).toBeVisible()
    await page.waitForTimeout(500)
    await recipeCard.click()

    // Wait for detail view
    await expect(page.getByRole('heading', { name: TEST_RECIPE.title, exact: true })).toBeVisible()

    // 2. Start Cooking (Directly to Step 1)
    await page.getByRole('button', { name: 'Start Cooking' }).click()

    // Verify we are in Cooking Mode
    // Header check
    await expect(page.getByText('Step 1 of 2')).toBeVisible()

    // Instruction check
    await expect(page.getByText('Mix ingredients')).toBeVisible()

    // 3. Check Timer Existence
    // Step 2 has "20 mins", so let's go to step 2 to see suggested timer
    await page.getByRole('button', { name: 'Next Step' }).click()

    // Now on Step 2
    await expect(page.getByText('Step 2 of 2')).toBeVisible()
    await expect(page.getByText('Bake for 20 mins')).toBeVisible()

    // Check for Suggested Timer button
    await expect(page.getByRole('button', { name: 'Start 20 Min Timer' })).toBeVisible()

    // 4. Test Exit Flow
    // Click Exit (X icon)
    await page.getByLabel('Exit Cooking Mode').click()

    // Check Confirmation Dialog
    await expect(page.getByText('Exit Cooking Mode?')).toBeVisible()
    await expect(page.getByText("You're on Step 2 of 2")).toBeVisible()

    // Click "Keep Cooking"
    await page.getByRole('button', { name: 'Keep Cooking' }).click()
    await expect(page.getByText('Exit Cooking Mode?')).not.toBeVisible()

    // Click Exit again and Confirm
    await page.getByLabel('Exit Cooking Mode').click()
    await page.getByRole('button', { name: 'Save & Exit' }).click()

    // Verify returned to Detail View or Library
    await expect(page.getByRole('heading', { name: TEST_RECIPE.title, exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start Cooking' })).toBeVisible()
  })
})
