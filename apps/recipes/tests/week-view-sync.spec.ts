import { test, expect } from '@playwright/test'
import { AUTH_COOKIES } from './msw-setup'

test.describe('Week View Synchronization', () => {
  test.use({
    storageState: {
      cookies: [...AUTH_COOKIES],
      origins: [],
    },
  })

  test('should remove recipe from week plan when deleted', async ({ page }) => {
    // 1. Setup mocks
    await page.route('**/api/recipes*', async (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        await route.fulfill({
          json: {
            recipes: [], // Start empty, we'll optimistically add
          },
        })
      } else if (method === 'POST') {
        const data = route.request().postDataJSON()
        await route.fulfill({ json: { id: 'test-recipe-id', ...data } })
      } else if (method === 'DELETE') {
        await route.fulfill({ json: { success: true } })
      } else {
        await route.fulfill({ json: { success: true } })
      }
    })

    // 2. Go to app
    await page.goto('/protected/recipes')

    // 3. Create a recipe
    await page.getByRole('button', { name: 'Add Recipe' }).click()
    await page.getByLabel('Title').fill('Toast')
    await page.getByLabel('Ingredients (One per line)').fill('Bread')
    await page.getByLabel('Protein').selectOption('Vegetarian')
    await page.getByRole('button', { name: 'Save Recipe' }).click()

    // 4. Add to "This Week"
    // Find the recipe card
    const recipeCard = page.locator('article', { hasText: 'Toast' })
    // Open 3-dot menu or context menu - wait, current UI might be different.
    // Let's use the explicit "Add to Week" if available, or just toggle "This Week" in detail.
    await recipeCard.click()
    await page.getByRole('button', { name: 'Add to Week' }).click()

    // Select Monday
    await page.getByRole('button', { name: 'Monday' }).click()
    // Close day picker
    await page.keyboard.press('Escape')
    // Close detail
    await page.getByRole('button', { name: 'Back to Library' }).click()

    // 5. Open Week Context Bar and verify count is 1
    // The bar is at bottom.
    await expect(page.getByRole('button', { name: 'View Week Plan' })).toContainText('1 meals')

    // 6. Delete the recipe
    // Open detail again
    await recipeCard.click()
    // Click delete (might be in menu)
    // Assuming delete button is visible or in a menu in detail view
    // Check RecipeDetail.tsx: it has onDelete prop, usually a trash icon.
    await page.getByRole('button', { name: 'Delete Recipe' }).click()
    // Confirm dialog
    await page.on('dialog', (dialog) => dialog.accept())

    // 7. Verify Week Context Bar count is 0
    // Wait for animation
    await page.waitForTimeout(500)
    await expect(page.getByRole('button', { name: 'View Week Plan' })).toContainText('0 meals')
  })
})
