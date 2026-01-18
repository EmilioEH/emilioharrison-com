import { test, expect } from './msw-setup'
import { AUTH_COOKIES } from './msw-setup'

test.describe('Custom Dialogs', () => {
  test.use({
    storageState: {
      cookies: [...AUTH_COOKIES],
      origins: [],
    },
  })

  test.beforeEach(async ({ page }) => {
    // Navigate to recipes page
    await page.goto('/protected/recipes')
    // Wait for recipes to load
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible()
  })

  test('should show confirmation dialog when deleting a recipe', async ({ page }) => {
    // Override the GET mock to return a recipe immediately
    await page.route('**/api/recipes*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          json: {
            recipes: [
              {
                id: 'test-recipe-dialog',
                title: 'Dialog Test Recipe',
                ingredients: [],
                steps: [],
                userId: 'test-user',
                createdAt: new Date().toISOString(),
              },
            ],
          },
        })
      } else if (route.request().method() === 'DELETE') {
        await route.fulfill({ json: { success: true } })
      } else {
        await route.continue()
      }
    })

    // Reload page to get the mocked recipe
    await page.reload()
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible()

    // 1. Verify recipe is visible and click it
    const recipeCard = page.getByText('Dialog Test Recipe')
    await expect(recipeCard).toBeVisible()
    await recipeCard.click({ force: true }) // Force click in case of overlay

    // 2. Wait for detail view content
    // Check for a known element in Detail View, e.g., the title again or a specific detail element
    // The title should still be visible in the detail view header or body
    await expect(
      page.locator('h1, h2, h3, h4').filter({ hasText: 'Dialog Test Recipe' }).first(),
    ).toBeVisible()

    // 3. Trigger Delete action
    const deleteBtn = page.getByRole('button', { name: /delete/i }) // Ensure regex matches "Delete" or accessible name

    // Check visibility and handle menu if needed
    if (!(await deleteBtn.isVisible())) {
      const menuBtn = page
        .locator('button')
        .filter({ has: page.locator('svg.lucide-more-vertical') })
        .first()
        .or(page.getByRole('button', { name: /menu/i }).first())
        .or(page.getByRole('button', { name: /more/i }).first())

      if (await menuBtn.isVisible()) {
        await menuBtn.click()
        // Wait for menu
        const deleteMenuItem = page
          .getByRole('menuitem', { name: /delete/i })
          .or(page.getByText('Delete'))
        await expect(deleteMenuItem).toBeVisible()
        await deleteMenuItem.click()
      }
    } else {
      await deleteBtn.first().click()
    }

    // 4. Verify Custom Dialog
    const dialog = page.getByRole('dialog', { name: /confirm/i })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Are you certain you want to delete this recipe?')

    // 5. Test Cancel
    await dialog.getByRole('button', { name: /cancel/i }).click()
    await expect(dialog).not.toBeVisible()

    // 6. Test Confirm
    // Re-trigger delete
    if (!(await deleteBtn.isVisible())) {
      const menuBtn = page
        .locator('button')
        .filter({ has: page.locator('svg.lucide-more-vertical') })
        .first()
        .or(page.getByRole('button', { name: /menu/i }).first())
        .or(page.getByRole('button', { name: /more/i }).first())
      if (await menuBtn.isVisible()) {
        await menuBtn.click()
        const deleteMenuItem = page
          .getByRole('menuitem', { name: /delete/i })
          .or(page.getByText('Delete'))
        await deleteMenuItem.click()
      }
    } else {
      await deleteBtn.first().click()
    }

    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: /ok|confirm/i }).click()

    // 7. Verify deletion (RecipeManager should go back to library)
    await expect(page.getByText('Dialog Test Recipe')).not.toBeVisible()
  })
})
