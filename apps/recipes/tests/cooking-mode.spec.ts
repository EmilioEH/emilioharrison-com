import { test, expect } from '@playwright/test'

test.describe('Recipe Cooking Mode', () => {
  test.use({
    storageState: {
      cookies: [
        {
          name: 'site_auth',
          value: 'true',
          domain: 'localhost', path: '/',
          domain: 'localhost', path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
        {
          name: 'site_user',
          value: 'TestUser',
          domain: 'localhost', path: '/',
          domain: 'localhost', path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
        {
          name: 'site_email',
          value: 'emilioeh1991@gmail.com',
          domain: 'localhost', path: '/',
          domain: 'localhost', path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
      ],
      origins: [],
    },
  })

  test.beforeEach(async ({ page }) => {
    // Mock user data to keep the test environment clean and isolated
    let currentRecipes: any[] = []
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

  test.skip('should navigate through full cooking mode lifecycle', async ({ page }) => {
    await page.goto('/protected/recipes')

    // 1. Create a dummy recipe to test with
    await page.getByRole('button', { name: 'Add Recipe' }).click()
    const testTitle = `COOK_TEST_${Date.now()}`
    await page.getByLabel('Title').fill(testTitle)
    await page.getByLabel('Ingredients (One per line)').fill('1 cup Flour\n2 Eggs')
    await page.getByLabel('Instructions (One per line)').fill('Mix ingredients\nBake for 20 mins')
    await page.getByRole('button', { name: 'Save Recipe' }).click()

    // 2. Open the recipe
    // Find the specific recipe card by its unique title heading
    const recipeCard = page.getByText(testTitle).first()

    // Ensure it's visible (should be open by default now)
    await expect(recipeCard).toBeVisible()
    await page.waitForTimeout(500)
    await recipeCard.click()

    // 3. Enter Cooking Mode (Starts with Pre-cooking)
    // Wait for the detail view to be stable
    await expect(page.getByRole('heading', { name: testTitle, exact: true })).toBeVisible()
    await page.getByTitle('Cooking Mode (Keep Screen On)').click({ force: true })
    await expect(page.getByText('Mise en Place')).toBeVisible()
    await expect(page.getByText('1 cup Flour')).toBeVisible()

    // 4. Mark ingredients as gathered
    await page.getByText('1 cup Flour').click()
    await page.getByText('2 Eggs').click()

    // 5. Start Cooking (Step-by-step)
    await page.getByRole('button', { name: 'Start Cooking' }).click()
    await expect(page.getByText('Step 1 of 2')).toBeVisible()
    await expect(page.getByText('Mix ingredients')).toBeVisible()

    // 6. Advance steps
    await page.getByRole('button', { name: 'Next Step' }).click()
    await expect(page.getByText('Step 2 of 2')).toBeVisible()
    await expect(page.getByText('Bake for 20 mins')).toBeVisible()

    // 7. Finish Cooking (Enters Review)
    await page.getByRole('button', { name: 'Finish Cooking' }).click()
    await expect(page.getByText("Chef's Kiss!")).toBeVisible()

    // 8. Submit feedback
    // Rate 4 stars
    const stars = page.getByTestId('review-rating').locator('button')
    await stars.nth(3).click() // 4th star

    await page
      .getByPlaceholder('Added a pinch more salt next time...')
      .fill('Delicious and fluffy!')
    await page.getByRole('button', { name: 'Save Review & Finish' }).click()

    // 9. Verify it's saved (returned to library)
    await expect(page.getByText('CHEFBOARD')).toBeVisible()

    // Re-open and check notes/rating
    await expect(page.getByText(testTitle).first()).toBeVisible()
    await page.waitForTimeout(500)
    await page.getByText(testTitle).first().click()

    await expect(page.getByTestId('recipe-notes')).toContainText('Delicious and fluffy!', {
      timeout: 10000,
    })
    // Check if 4 stars are visible in the preview section
    const previewStars = page.locator(
      '.mb-8.rounded-md-xl svg.lucide-star.fill-md-sys-color-tertiary',
    )
    await expect(previewStars).toHaveCount(4)
  })
})
