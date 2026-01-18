import { test, expect } from './msw-setup'

test('toggle between grid and list view', async ({ page }) => {
  // 1. Navigate to the app
  await page.goto('/protected/recipes')

  // 2. Wait for the library to load (check for more than 0 elements)
  await expect(page.getByTestId(/^recipe-card-/).first()).toBeVisible({ timeout: 10000 })

  // 3. Verify it starts in Grid Mode (default grid classes)
  const gridContainer = page.locator('.grid.grid-cols-1')
  await expect(gridContainer).toBeVisible()

  // 4. Click the List View toggle (if desktop/tablet)
  const listToggle = page.getByLabel('List View')
  if (await listToggle.isVisible()) {
    await listToggle.click()

    // 5. Verify it switched to List Mode (flex-col classes)
    const listContainer = page.locator('.flex.flex-col.gap-2')
    await expect(listContainer).toBeVisible()

    // 6. Toggle back to Grid Mode
    await page.getByLabel('Grid View').click()
    await expect(gridContainer).toBeVisible()
  } else {
    console.log('Toggle not visible (mobile viewport), skipping interaction')
  }
})
