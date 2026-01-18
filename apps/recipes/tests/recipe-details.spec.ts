import { test, expect } from './msw-setup'

test.describe('Recipe Details', () => {
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
    // Mock API to return a recipe with an image
    await page.route('**/api/recipes*', async (route) => {
      const url = route.request().url()
      // If asking for a specific recipe (e.g. /api/recipes/RECIPE_ID)
      if (url.match(/\/api\/recipes\/[a-zA-Z0-9_-]+$/)) {
        await route.fulfill({
          json: {
            success: true,
            recipe: {
              id: 'test-recipe-1',
              title: 'Test Recipe with Image',
              ingredients: ['1 cup flour'],
              steps: ['Mix it up'],
              sourceImage: 'https://placehold.co/600x400',
              rating: 5,
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
                id: 'test-recipe-1',
                title: 'Test Recipe with Image',
                ingredients: ['1 cup flour'],
                steps: ['Mix it up'],
                sourceImage: 'https://placehold.co/600x400',
                rating: 5,
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
            ratings: [],
            notes: [],
          },
        },
      })
    })
    // Mock cost
    await page.route('**/api/estimate-cost', async (route) => {
      await route.fulfill({
        json: { totalCost: 15.5 },
      })
    })
  })

  test('should open recipe image in full screen when clicked', async ({ page }) => {
    // 1. Navigate to the app
    await page.goto('/protected/recipes')

    // 2. Open the recipe
    const recipeCard = page.getByRole('button').filter({ hasText: 'Test Recipe with Image' })
    await expect(recipeCard).toBeVisible()
    await recipeCard.click()

    // 3. Wait for details to load
    await expect(page.getByRole('heading', { name: 'Test Recipe with Image' })).toBeVisible()

    // 4. Find and click the image
    // The image button has a specific aria-label
    const imageButton = page.getByLabel('View image full-screen')
    await expect(imageButton).toBeVisible()
    await imageButton.click()

    // 5. Verify Full Screen Modal is visible via the close button
    const closeButton = page.getByLabel('Close image viewer')
    await expect(closeButton).toBeVisible()

    // Verify the full-screen image is also visible
    const fullScreenImage = page.getByRole('img', { name: 'Test Recipe with Image' })
    await expect(fullScreenImage).toBeVisible()

    // 6. Close the modal
    await closeButton.click()

    // 7. Verify Modal is gone (button should no longer be visible)
    await expect(closeButton).not.toBeVisible()
  })
})
