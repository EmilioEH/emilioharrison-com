import { test, expect } from './msw-setup'
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
    await page.goto('/protected/recipes?skip_setup=true')

    // 3. Create a recipe
    await page.getByRole('button', { name: 'Add Recipe' }).click()
    await page.getByLabel('Title').fill('Toast')
    await page.getByLabel('Ingredients (One per line)').fill('Bread')
    await page.getByLabel('Protein').selectOption('Vegetarian')
    await page.getByRole('button', { name: 'Save Recipe' }).click()

    // 4. Add to "This Week"
    await expect(page.getByRole('heading', { name: 'Recipe Saved!' })).toBeVisible()
    // Go to Detail
    await page.getByRole('button', { name: 'View Recipe' }).click()

    // Toggle "Add to Week" (assuming it's available in detail or menu)
    // The test originally clicked a card in library.
    // Now we are in detail view.
    // Need to find "Add to Week" button.
    // WeekWorkspace.tsx has logic. Detail view (RecipeDetail.tsx) usually has it in "More" or direct.
    // Let's assume there is a way or check the original test logic.
    // "await page.getByRole('button', { name: 'Add to Week' }).click()" was used after opening.
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
    const recipeCard = page.getByRole('heading', { name: 'Toast' })
    await recipeCard.click()
    // Click delete (might be in menu)
    // Assuming delete button is visible or in a menu in detail view
    // Check RecipeDetail.tsx: it has onDelete prop, usually a trash icon.
    // Confirm dialog
    page.on('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Delete Recipe' }).click()

    // 7. Verify Week Context Bar count is 0
    // Wait for animation
    await page.waitForTimeout(500)
    await expect(page.getByRole('button', { name: 'View Week Plan' })).toContainText('0 meals')
  })
})
