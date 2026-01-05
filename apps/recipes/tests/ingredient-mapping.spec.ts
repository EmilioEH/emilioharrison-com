import { test, expect } from '@playwright/test'

test.describe('Ingredient Mapping Robustness', () => {
  test.use({
    storageState: {
      cookies: [
        {
          name: 'site_auth',
          value: 'true',
          domain: '127.0.0.1',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
        {
          name: 'site_user',
          value: 'TestUser',
          domain: '127.0.0.1',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
        {
          name: 'site_email',
          value: 'emilioeh1991@gmail.com',
          domain: '127.0.0.1',
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

  // Mock Data Store
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockRecipes: any[] = []

  test.beforeEach(async ({ page }) => {
    // Reset mock data
    mockRecipes = []

    // Mock API Routes
    await page.route('**/api/recipes*', async (route) => {
      const method = route.request().method()
      const url = route.request().url()

      // GET List
      if (method === 'GET' && !url.split('api/recipes/').pop()) {
        await route.fulfill({ status: 200, json: { recipes: mockRecipes } })
        return
      }

      // POST Create
      if (method === 'POST' && url.endsWith('api/recipes')) {
        const body = await route.request().postDataJSON()
        const newRecipe = {
          ...body,
          id: body.id || `mock-${Date.now()}-${Math.random()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        mockRecipes.push(newRecipe)
        await route.fulfill({ status: 201, json: { success: true, id: newRecipe.id } })
        return
      }

      // PUT Update
      if (method === 'PUT') {
        const id = url.split('/').pop()
        const body = await route.request().postDataJSON()
        const idx = mockRecipes.findIndex((r) => r.id === id)
        if (idx !== -1) {
          mockRecipes[idx] = { ...mockRecipes[idx], ...body, updatedAt: new Date().toISOString() }
        }
        await route.fulfill({ status: 200, json: { success: true } })
        return
      }

      // DELETE
      if (method === 'DELETE') {
        const id = url.split('/').pop()
        mockRecipes = mockRecipes.filter((r) => r.id !== id)
        await route.fulfill({ status: 200, json: { success: true } })
        return
      }

      // Fallback
      await route.continue()
    })
  })

  test('should use explicit mapping when available', async ({ page }) => {
    // Pre-seed the mock with a recipe that has explicit mapping
    mockRecipes.push({
      id: 'recipe-mapping-test',
      title: 'Explicit Mapping Test',
      ingredients: [
        { name: 'Secret Item A', amount: '1 unit' },
        { name: 'Secret Item B', amount: '2 units' },
      ],
      steps: ['First step without names', 'Second step also without names'],
      stepIngredients: [[0], [1]], // Index 0 for step 1, index 1 for step 2
      description: 'Test recipe',
      thisWeek: false,
      servings: 2,
      prepTime: 10,
      cookTime: 20,
    })

    // Log to verify mock is set up
    console.log('Mock recipes count:', mockRecipes.length)

    await page.goto('/protected/recipes')

    // Wait for loading to complete
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible()

    // Debug: Check what's on the page
    const recipeCards = await page.locator('[data-testid^="recipe-card-"]').count()
    console.log('Recipe cards found:', recipeCards)

    // Click on the recipe
    await expect(page.getByText('Explicit Mapping Test')).toBeVisible({ timeout: 5000 })
    await page.getByText('Explicit Mapping Test').first().click()
    await page.getByRole('button', { name: 'Start Cooking' }).click()

    // Step 1: Should show Secret Item A even though it's not in the text "First step without names"
    await expect(page.getByText('Step 1 of 2')).toBeVisible()
    await expect(page.getByText('Secret Item A')).toBeVisible()
    await expect(page.getByText('Secret Item B')).not.toBeVisible()

    await page.getByRole('button', { name: 'Next Step' }).click()

    // Step 2: Should show Secret Item B
    await expect(page.getByText('Step 2 of 2')).toBeVisible()
    await expect(page.getByText('Secret Item B')).toBeVisible()
    await expect(page.getByText('Secret Item A')).not.toBeVisible()
  })

  test('should fallback to heuristic when mapping is missing', async ({ page }) => {
    // Pre-seed the mock with a recipe WITHOUT explicit mapping
    mockRecipes.push({
      id: 'recipe-heuristic-test',
      title: 'Heuristic Fallback Test',
      ingredients: [
        { name: 'Carrots', amount: '2' },
        { name: 'Onions', amount: '1' },
      ],
      steps: ['Chop the Carrots', 'Dice the Onions'],
      // Missing stepIngredients - should fallback to heuristic
      description: 'Test recipe',
      thisWeek: false,
      servings: 2,
      prepTime: 10,
      cookTime: 20,
    })

    await page.goto('/protected/recipes')
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible()

    await page.getByText('Heuristic Fallback Test').first().click()
    await page.getByRole('button', { name: 'Start Cooking' }).click()

    // Step 1: Should show Carrots via heuristic
    await expect(page.getByText('Step 1 of 2')).toBeVisible()
    await expect(page.getByText('Carrots')).toBeVisible()

    await page.getByRole('button', { name: 'Next Step' }).click()

    // Step 2: Should show Onions via heuristic
    await expect(page.getByText('Step 2 of 2')).toBeVisible()
    await expect(page.getByText('Onions')).toBeVisible()
  })
})
