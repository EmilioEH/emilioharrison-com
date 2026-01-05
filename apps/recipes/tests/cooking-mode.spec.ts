import { test, expect, TEST_RECIPES } from './msw-setup'

test.describe('Recipe Cooking Mode', () => {
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

  // Use the first test recipe from our centralized mock data
  const RECIPE = TEST_RECIPES[0]

  test('should navigate through cooking mode flow', async ({ page }) => {
    await page.goto('/protected/recipes')

    // Wait for loading to finish
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible()

    // 1. Open the pre-seeded recipe
    const recipeCard = page.getByText(RECIPE.title).first()
    await expect(recipeCard).toBeVisible()
    await page.waitForTimeout(500)
    await recipeCard.click()

    // Wait for detail view
    await expect(page.getByRole('heading', { name: RECIPE.title, exact: true })).toBeVisible()

    // 2. Start Cooking (Directly to Step 1)
    await page.getByRole('button', { name: 'Start Cooking' }).click()

    // Verify we are in Cooking Mode
    await expect(page.getByText('Step 1 of 2')).toBeVisible()
    await expect(page.getByText(RECIPE.steps[0])).toBeVisible()

    // 3. Navigate to Step 2
    await page.getByRole('button', { name: 'Next Step' }).click()
    await expect(page.getByText('Step 2 of 2')).toBeVisible()
    await expect(page.getByText(RECIPE.steps[1])).toBeVisible()

    // 4. Check for Suggested Timer button (step has "20 mins")
    await expect(page.getByRole('button', { name: 'Start 20 Min Timer' })).toBeVisible()

    // 5. Test Timeline Navigation - click back to Step 1 using data-testid
    await page.getByTestId('timeline-step-1').click()

    // Should be back on Step 1
    await expect(page.getByText('Step 1 of 2')).toBeVisible()
    await expect(page.getByText(RECIPE.steps[0])).toBeVisible()

    // Navigate back to step 2 for exit flow
    await page.getByRole('button', { name: 'Next Step' }).click()

    // 6. Test Exit Flow
    await page.getByLabel('Exit Cooking Mode').click()
    await expect(page.getByText('End Cooking Session?')).toBeVisible()
    await expect(page.getByText("You're on Step 2 of 2")).toBeVisible()

    // Keep Cooking
    await page.getByRole('button', { name: 'Keep Cooking' }).click()
    await expect(page.getByText('End Cooking Session?')).not.toBeVisible()

    // Exit for real
    await page.getByLabel('Exit Cooking Mode').click()
    await page.getByRole('button', { name: 'End Session' }).click()

    // Verify returned to Detail View (may take a moment)
    await page.waitForTimeout(500)
    await expect(page.getByRole('heading', { name: RECIPE.title, exact: true })).toBeVisible({
      timeout: 10000,
    })
  })
})
