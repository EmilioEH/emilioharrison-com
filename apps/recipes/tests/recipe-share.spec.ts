import { test, expect } from './msw-setup'

test.describe('Recipe Share Feature', () => {
  // Bypass authentication for all tests in this file
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

  test.beforeEach(async ({ page }) => {
    // Mock API to return a recipe with notes and ratings
    await page.route('**/api/recipes*', async (route) => {
      const url = route.request().url()
      // If asking for a specific recipe
      if (url.match(/\/api\/recipes\/[a-zA-Z0-9_-]+$/)) {
        await route.fulfill({
          json: {
            success: true,
            recipe: {
              id: 'share-test-recipe',
              title: 'Shareable Test Recipe',
              servings: 4,
              prepTime: 15,
              cookTime: 30,
              ingredients: [
                { name: 'Flour', amount: '2 cups', prep: 'sifted' },
                { name: 'Eggs', amount: '3' },
              ],
              steps: ['Preheat oven to 350°F', 'Mix ingredients', 'Bake for 30 minutes'],
              notes: "Chef's note: Best served warm",
              description: 'A delicious test recipe for sharing',
              sourceImage: 'https://placehold.co/600x400',
              rating: 4,
              cuisine: 'American',
              difficulty: 'Easy',
              protein: 'Chicken',
            },
          },
        })
        return
      }

      // List call
      if (route.request().method() === 'GET') {
        await route.fulfill({
          json: {
            recipes: [
              {
                id: 'share-test-recipe',
                title: 'Shareable Test Recipe',
                servings: 4,
                prepTime: 15,
                cookTime: 30,
                ingredients: [
                  { name: 'Flour', amount: '2 cups', prep: 'sifted' },
                  { name: 'Eggs', amount: '3' },
                ],
                steps: ['Preheat oven to 350°F', 'Mix ingredients', 'Bake for 30 minutes'],
                notes: "Chef's note: Best served warm",
                description: 'A delicious test recipe for sharing',
                sourceImage: 'https://placehold.co/600x400',
                rating: 4,
                cuisine: 'American',
                difficulty: 'Easy',
                protein: 'Chicken',
              },
            ],
          },
        })
      } else {
        await route.fulfill({ json: { success: true } })
      }
    })

    // Mock family data
    await page.route('**/api/recipes/*/family-data', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            ratings: [
              {
                userId: 'user1',
                userName: 'Test User',
                rating: 5,
                ratedAt: new Date().toISOString(),
              },
            ],
            notes: [
              {
                userId: 'user1',
                userName: 'Test User',
                text: 'Family favorite!',
                createdAt: new Date().toISOString(),
              },
            ],
            cookingHistory: [
              {
                userId: 'user1',
                userName: 'Test User',
                cookedAt: new Date().toISOString(),
                wouldMakeAgain: true,
              },
            ],
          },
        },
      })
    })

    // Mock cost
    await page.route('**/api/estimate-cost', async (route) => {
      await route.fulfill({
        json: { totalCost: 12.5 },
      })
    })

    // Mock family current API
    await page.route('**/api/families/current', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          family: { id: 'test-family', name: 'Test Family', createdBy: 'TestUser' },
          members: [{ id: 'TestUser', displayName: 'Test User', email: 'test@test.com' }],
        },
      })
    })

    await page.route('**/api/week/planned', async (route) => {
      await route.fulfill({
        json: { success: true, planned: [] },
      })
    })
  })

  test('should open share dialog from recipe detail header menu', async ({ page }) => {
    // 1. Navigate to the app
    await page.goto('/protected/recipes')

    // 2. Open the recipe
    const recipeCard = page.getByRole('button').filter({ hasText: 'Shareable Test Recipe' })
    await expect(recipeCard).toBeVisible()
    await recipeCard.click()

    // 3. Wait for details to load
    await expect(page.getByRole('heading', { name: 'Shareable Test Recipe' })).toBeVisible()

    // 4. Click Share Recipe button directly
    const shareBtn = page.getByRole('button', { name: 'Share Recipe' })
    await expect(shareBtn).toBeVisible()
    await shareBtn.click()

    // 6. Verify Share Dialog opens with heading
    const shareDialog = page.getByRole('dialog')
    await expect(shareDialog).toBeVisible()
    await expect(shareDialog.getByRole('heading', { name: /Share Recipe/ })).toBeVisible()

    // 7. Verify dialog has format options
    await expect(page.getByText('Share as Text')).toBeVisible()
    await expect(page.getByText('Share as PDF')).toBeVisible()
  })

  test('should show content customization options when available', async ({ page }) => {
    // Navigate to the app
    await page.goto('/protected/recipes')

    // Open the recipe
    const recipeCard = page.getByRole('button').filter({ hasText: 'Shareable Test Recipe' })
    await recipeCard.click()

    // Wait for details
    await expect(page.getByRole('heading', { name: 'Shareable Test Recipe' })).toBeVisible()

    // Open More Options menu and click Share
    // Click Share directly
    await page.getByRole('button', { name: 'Share Recipe' }).click()

    // Wait for dialog
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Verify at least the photo option is shown (recipe has sourceImage)
    // The dialog shows "Include in share:" section with checkboxes
    await expect(dialog.getByText('Include in share:')).toBeVisible()
    await expect(dialog.getByLabel('Recipe Photo')).toBeVisible()
  })

  test('should share recipe as text with clipboard fallback', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])

    // Navigate to the app
    await page.goto('/protected/recipes')

    // Open the recipe
    const recipeCard = page.getByRole('button').filter({ hasText: 'Shareable Test Recipe' })
    await recipeCard.click()

    // Wait for details
    await expect(page.getByRole('heading', { name: 'Shareable Test Recipe' })).toBeVisible()

    // Open More Options menu and click Share
    // Click Share
    await page.getByRole('button', { name: 'Share Recipe' }).click()

    // Wait for dialog
    await expect(page.getByRole('dialog')).toBeVisible()

    // Click Share as Text
    await page.getByText('Share as Text').click()

    // Should show success message (clipboard copy fallback on desktop)
    await expect(page.getByText('Recipe copied to clipboard!')).toBeVisible({ timeout: 5000 })
  })

  test('should close share dialog when cancelled', async ({ page }) => {
    // Navigate to the app
    await page.goto('/protected/recipes')

    // Open the recipe
    const recipeCard = page.getByRole('button').filter({ hasText: 'Shareable Test Recipe' })
    await recipeCard.click()

    // Wait for details
    await expect(page.getByRole('heading', { name: 'Shareable Test Recipe' })).toBeVisible()

    // Open More Options menu and click Share
    // Click Share
    await page.getByRole('button', { name: 'Share Recipe' }).click()

    // Wait for dialog
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Close dialog by pressing Escape
    await page.keyboard.press('Escape')

    // Dialog should be closed
    await expect(dialog).not.toBeVisible()
  })
})
