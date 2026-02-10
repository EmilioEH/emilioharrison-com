import { test, expect, TEST_RECIPES } from './msw-setup'
import type { Review } from '../src/lib/types'

test.describe('Review Management', () => {
  const RECIPE = TEST_RECIPES[0]

  test.beforeEach(async ({ page }) => {
    // Navigate to recipes page
    // Mock Review Data State
    const mockReviews: Review[] = []

    // Mock Family Data to return our local reviews
    await page.route('**/api/recipes/*/family-data', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            id: 'test-recipe-001',
            notes: [],
            ratings: [],
            reviews: mockReviews,
            weekPlan: { isPlanned: false },
            cookingHistory: [],
          },
        },
      })
    })

    // Mock Review Operations
    await page.route('**/api/recipes/*/reviews*', async (route) => {
      const method = route.request().method()
      const url = route.request().url()

      if (method === 'POST') {
        // Create
        const body = await route.request().postDataJSON()
        const newReview = {
          id: `review-${Date.now()}`,
          recipeId: 'test-recipe-001',
          userId: 'TestUser',
          userName: 'Test User',
          rating: body.rating,
          comment: body.comment,
          photoUrl: body.photoBase64 ? 'https://placehold.co/100x100' : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: 'quick' as const,
        }
        mockReviews.push(newReview)
        await route.fulfill({ json: { success: true, data: newReview } })
        return
      }

      if (method === 'PUT') {
        // Update
        const body = await route.request().postDataJSON()
        const reviewId = url.split('/').pop()
        const index = mockReviews.findIndex((r) => r.id === reviewId)
        if (index !== -1) {
          mockReviews[index] = {
            ...mockReviews[index],
            rating: body.rating,
            comment: body.comment,
            photoUrl: body.photoBase64
              ? 'https://placehold.co/100x100'
              : mockReviews[index].photoUrl,
            updatedAt: new Date().toISOString(),
          }
        }
        await route.fulfill({ json: { success: true, data: mockReviews[index] } })
        return
      }

      if (method === 'DELETE') {
        // Delete
        const reviewId = url.split('/').pop()
        const index = mockReviews.findIndex((r) => r.id === reviewId)
        if (index !== -1) {
          mockReviews.splice(index, 1)
        }
        await route.fulfill({ json: { success: true } })
        return
      }

      await route.continue()
    })

    await page.goto('/protected/recipes')
    // Wait for the specific recipe to appear
    await expect(page.getByText(RECIPE.title).first()).toBeVisible({ timeout: 15000 })
  })

  test('should allow a user to edit their own review', async ({ page }) => {
    // 1. Open Recipe
    await page.getByText(RECIPE.title).first().click()

    // 2. Leave a Review (if not already reviewed - we assume fresh state or mock handles it)
    // We'll use the "Rate this recipe" quick component or the one in history if visible.
    // For reliability, let's use the explicit "CookingHistorySummary" flow.

    // Check if we need to expand history or if the "Leave a review" form is visible
    // The component says: "Leave a review" if !currentUserReview

    // Let's create a review first
    await page.getByLabel('Rate 5 stars').click()

    // Fill comment
    await page.getByPlaceholder('What did you think?').fill('Initial review comment')
    await page.getByRole('button', { name: 'Submit Review' }).click()

    // 3. Verify Review Appears
    await expect(page.getByText('Initial review comment')).toBeVisible()

    // 4. Click "Edit Review"
    await page.getByRole('button', { name: 'Edit Review' }).click()

    // 5. Verify Form Reappears with Data
    await expect(page.locator('textarea')).toHaveValue('Initial review comment')

    // 6. Change Comment
    await page.getByPlaceholder('What did you think?').fill('Updated review comment')
    await page.getByRole('button', { name: 'Update Review' }).click()

    // 7. Verify Update
    await expect(page.getByText('Updated review comment')).toBeVisible()
    await expect(page.getByText('Initial review comment')).not.toBeVisible()
    await expect(page.getByText('edited')).toBeVisible()
  })

  test('should allow a user to delete their own review', async ({ page }) => {
    // 1. Open Recipe
    await page.getByText(RECIPE.title).first().click()

    // 2. Leave a Review
    // 2. Leave a Review
    await page.getByLabel('Rate 5 stars').click()
    await page.getByPlaceholder('What did you think?').fill('To be deleted')
    await page.getByRole('button', { name: 'Submit Review' }).click()

    // 3. Verify Review Appears
    await expect(page.getByText('To be deleted')).toBeVisible()

    // 4. Click "Delete Review" (expecting a confirmation dialog or direct delete)
    // For now, let's assume immediate or we'll handle dialog if we add one.
    // The plan didn't specify a dialog, but good UX usually has one.
    // I'll assume a "Delete" button that might need a double click or just works.
    await page.getByRole('button', { name: 'Delete Review' }).click()

    // If there's a confirmation, handle it.
    // For now, let's assume the button triggers the delete.

    // 5. Verify Review Gone
    await expect(page.getByText('To be deleted')).not.toBeVisible()

    // 6. Verify "Leave a review" form is back
    await expect(page.getByText('Leave a review')).toBeVisible()
  })
})
