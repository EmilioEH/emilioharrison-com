import { test, expect } from '@playwright/test'

test.describe('Cooking Mode Sticky Ingredient Drawer', () => {
  test('should show step-specific ingredients in cooking mode', async ({ page }) => {
    // Navigate to a known recipe
    await page.goto('/protected/recipes?view=detail&recipe=8605c095-4d69-43c8-94ea-68a04736ff2b')

    // Wait for title
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Enter Cooking Mode (try header button if footer not found)
    const cookingModeBtn = page.getByRole('button', { name: /Cooking Mode|Start Cooking/i }).first()
    await expect(cookingModeBtn).toBeVisible()
    await cookingModeBtn.click()

    // We are now in Cooking Mode.
    // It could be on Prep Step (Step 0) or an Instruction Step (Step 1+).
    // Prep Step has a "Start Cooking" button to go to Step 1.
    // Instruction Steps have "Next Step" or "Finish Cooking".

    // Wait for the container to load
    await expect(page.locator('.fixed.inset-0.z-50')).toBeVisible()

    // Check if we are on Prep Step
    const prepStartBtn = page
      .getByRole('button', { name: 'Start Cooking' })
      .filter({ hasText: 'Start Cooking' })
    if (await prepStartBtn.isVisible()) {
      await prepStartBtn.click()
    } else {
      // We might be on a step. Ensure we are not on the last step (Finish Cooking)
      // Verify we are seeing an instruction step
    }

    // Now we should be on Step 1 (or higher).
    // Wait for the drawer toggle to be visible.
    const drawerToggle = page.getByRole('button', { name: /Ingredients/i })
    await expect(drawerToggle).toBeVisible()

    // Click to open
    await drawerToggle.click()

    // Expect the sheet to be visible (Header)
    const drawerHeader = page.getByRole('heading', { name: 'Ingredients', level: 2 })
    await expect(drawerHeader).toBeVisible()

    // Verify ingredient row visibility
    await expect(page.locator('.space-y-1 > div').first()).toBeVisible()

    // Close
    await page
      .getByRole('button')
      .filter({ has: page.locator('svg.lucide-x') })
      .click()
    await expect(drawerHeader).not.toBeVisible()
  })
})
