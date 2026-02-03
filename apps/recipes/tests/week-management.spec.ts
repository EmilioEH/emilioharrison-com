import { test, expect } from './msw-setup'

test.describe('Week Management', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => console.log(`[Browser]: ${msg.text()}`))
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

    // Click "Add to Week" badge
    await firstRecipeCard.getByRole('button', { name: 'Add to Week' }).click()

    // Select a day (Monday)
    await page.locator('button:has-text("Mon")').first().click()

    // Open Week View
    await page.locator('button[title="View Week"]').click()
    // Wait for Week View navigation to be visible
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
    // Scope search to the sheet/dialog if possible, or just be more specific
    await expect(page.getByRole('dialog').getByText(recipeTitle)).toBeVisible()
  })

  test.fixme('should remove recipe from specific day', async ({ page }) => {
    // Plan a recipe
    const firstRecipeCard = page.locator('[data-testid^="recipe-card"]').first()
    const recipeTitle = await firstRecipeCard.locator('h4').textContent()
    if (!recipeTitle) throw new Error('Recipe title not found')

    await firstRecipeCard.getByRole('button', { name: 'Add to Week' }).click()
    await page.locator('button:has-text("Mon")').first().click()

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

  test.fixme('should show move to different day option', async ({ page }) => {
    // Plan a recipe
    const firstRecipeCard = page.locator('[data-testid^="recipe-card"]').first()
    const recipeTitle = await firstRecipeCard.locator('h4').textContent()
    if (!recipeTitle) throw new Error('Recipe title not found')

    await firstRecipeCard.getByRole('button', { name: 'Add to Week' }).click()
    await page.locator('button:has-text("Mon")').first().click()

    // Open Week View
    await page.locator('button[title="View Week"]').click()
    await expect(page.locator('button[aria-label="This Week"]')).toBeVisible()

    // Open management sheet
    const weekRecipeCard = page
      .locator('div[data-testid^="recipe-card-"]')
      .filter({ hasText: recipeTitle })
      .first()
    await weekRecipeCard.getByRole('button', { name: 'Manage recipe' }).click()

    // Verify "Move to Different Day" button exists
    await expect(page.getByRole('button', { name: 'Move to Different Day' })).toBeVisible()

    // Click it to open day picker
    await page.getByRole('button', { name: 'Move to Different Day' }).click()

    // Verify day picker opened with "Move" title - use strict heading check
    // The title might be 'Move "Recipe Name"' or just 'Move', check previous error: <h2 ...>Move "E2E Test Recipe"</h2>
    await expect(page.getByRole('heading', { name: 'Move' })).toBeVisible()
  })

  test.fixme('should show move to different week option', async ({ page }) => {
    // Plan a recipe
    const firstRecipeCard = page.locator('[data-testid^="recipe-card"]').first()
    const recipeTitle = await firstRecipeCard.locator('h4').textContent()
    if (!recipeTitle) throw new Error('Recipe title not found')

    await firstRecipeCard.getByRole('button', { name: 'Add to Week' }).click()
    await page.locator('button:has-text("Mon")').first().click()

    // Open Week View
    await page.locator('button[title="View Week"]').click()
    await expect(page.locator('button[aria-label="This Week"]')).toBeVisible()

    // Open management sheet
    const weekRecipeCard = page
      .locator('div[data-testid^="recipe-card-"]')
      .filter({ hasText: recipeTitle })
      .first()
    await weekRecipeCard.getByRole('button', { name: 'Manage recipe' }).click()

    // Verify "Move to Different Week" button exists
    await expect(page.locator('text=Move to Different Week')).toBeVisible()
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

    // Plan a recipe
    const firstRecipeCard = page.locator('[data-testid^="recipe-card"]').first()
    await firstRecipeCard.getByRole('button', { name: 'Add to Week' }).click()

    // Wait for the API call to complete
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/week-plan') && resp.status() === 200,
    )
    await page.locator('button:has-text("Mon")').first().click()
    await responsePromise

    // Open Week View again
    await page.locator('button[title="View Week"]').click()
    await expect(page.locator('button[aria-label="This Week"]')).toBeVisible()

    // Now there should be exactly one management button
    await expect(managementButtons).toHaveCount(1)
  })

  test.fixme('should show currently planned days in management sheet', async ({ page }) => {
    // Plan a recipe on multiple days
    const firstRecipeCard = page.locator('[data-testid^="recipe-card"]').first()
    const recipeTitle = await firstRecipeCard.locator('h4').textContent()
    if (!recipeTitle) throw new Error('Recipe title not found')

    // Add to Monday
    await firstRecipeCard.getByRole('button', { name: 'Add to Week' }).click()
    await page.locator('button:has-text("Mon")').first().click()

    // Add to Wednesday (reopen the card)
    await page
      .locator('div[data-testid^="recipe-card-"]')
      .filter({ hasText: recipeTitle })
      .first()
      .getByRole('button', { name: 'Manage recipe' })
      .click()
    await page.locator('text=Move to Different Day').click()
    await page.locator('button:has-text("Wed")').first().click()

    // Open Week View
    await page.locator('button[title="View Week"]').click()
    await expect(page.locator('button[aria-label="This Week"]')).toBeVisible()

    // Open management sheet
    const weekRecipeCard = page
      .locator('div[data-testid^="recipe-card-"]')
      .filter({ hasText: recipeTitle })
      .first()
    await weekRecipeCard.getByRole('button', { name: 'Manage recipe' }).click()

    // Verify both days are shown
    await expect(page.locator('text=CURRENTLY PLANNED')).toBeVisible()
    await expect(page.locator('text=Monday')).toBeVisible()
    await expect(page.locator('text=Wednesday')).toBeVisible()
  })
})
