import { test, expect } from './msw-setup'

// NOTE: The management sheet these tests exercise is only reachable via
// `RecipeLibrary`'s `allowManagement` prop, which nothing in the app currently sets to
// true — these remain `test.fixme` pending a real entry point. Content reflects the
// current week-level (not day-level) RecipeManagementSheet: recipes are added to a week
// with one tap (no day picker), and the sheet offers Remove/Share only (no "move").
test.describe('Week Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/protected/recipes')

    // Wait for app to load - increased timeout for CI stability
    await page.waitForSelector('[data-testid^="recipe-card"]', {
      state: 'attached',
      timeout: 30000,
    })
  })

  test.fixme('should open management sheet when clicking more button on planned recipe', async ({
    page,
  }) => {
    // First, plan a recipe for this week
    const firstRecipeCard = page.locator('[data-testid^="recipe-card"]').first()
    const recipeTitle = await firstRecipeCard.locator('h4').textContent()
    if (!recipeTitle) throw new Error('Recipe title not found')

    // Tap "Add to Week" — plans it directly, no day selection.
    await firstRecipeCard.getByLabel('Add to Week').click()

    // Open Week View
    await page.locator('button[title="View Week"]').click()
    await expect(page.locator('button[aria-label="This Week"]')).toBeVisible()

    // Find the recipe card in week view
    const weekRecipeCard = page
      .locator('div[data-testid^="recipe-card-"]')
      .filter({ hasText: recipeTitle })
      .first()

    // Click the management button (three dots)
    await weekRecipeCard.getByRole('button', { name: 'Manage recipe' }).click()

    // Verify management sheet opened
    await expect(page.getByRole('heading', { name: 'Manage Recipe', exact: true })).toBeVisible()
    await expect(page.getByRole('dialog').getByText(recipeTitle)).toBeVisible()
  })

  test.fixme('should remove recipe from the week', async ({ page }) => {
    // Plan a recipe
    const firstRecipeCard = page.locator('[data-testid^="recipe-card"]').first()
    const recipeTitle = await firstRecipeCard.locator('h4').textContent()
    if (!recipeTitle) throw new Error('Recipe title not found')

    await firstRecipeCard.getByLabel('Add to Week').click()

    // Open Week View
    await page.locator('button[title="View Week"]').click()
    await expect(page.locator('button[aria-label="This Week"]')).toBeVisible()

    // Open management sheet
    const weekRecipeCard = page
      .locator('div[data-testid^="recipe-card-"]')
      .filter({ hasText: recipeTitle })
      .first()
    await weekRecipeCard.getByRole('button', { name: 'Manage recipe' }).click()

    // Click remove button - use strict locator
    await page.getByRole('button', { name: 'Remove' }).first().click()

    // Verify recipe is removed from week view
    await expect(page.locator(`h4:has-text("${recipeTitle}")`)).not.toBeVisible()
  })

  test.fixme('management button should only appear on planned recipes', async ({ page }) => {
    // Open Week View (should be empty initially)
    await page.locator('button[title="View Week"]').click()
    await expect(page.locator('button[aria-label="This Week"]')).toBeVisible()

    // Check that no management buttons are visible
    const managementButtons = page.locator('button[title="Manage recipe"]')
    await expect(managementButtons).toHaveCount(0)

    // Go back to library
    await page.locator('button[title="Back to Library"]').click()

    // Plan a recipe — one tap, no day picker.
    const firstRecipeCard = page.locator('[data-testid^="recipe-card"]').first()
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/week-plan') && resp.status() === 200,
    )
    await firstRecipeCard.getByLabel('Add to Week').click()
    await responsePromise

    // Open Week View again
    await page.locator('button[title="View Week"]').click()
    await expect(page.locator('button[aria-label="This Week"]')).toBeVisible()

    // Now there should be exactly one management button
    await expect(managementButtons).toHaveCount(1)
  })
})
