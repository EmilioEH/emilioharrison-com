import { test, expect } from '@playwright/test'

test.describe('Grocery List Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage
    await page.addInitScript(() => {
        window.localStorage.clear()
        // Mock default recipes if needed, or rely on app initial state
        // The app loads recipes from /api/user-data which might be empty or mocked
    })
    
    // Mock API for grocery list generation
    await page.route('/api/generate-grocery-list', async route => {
      const json = {
        ingredients: [
          { original: '1 cup flour', name: 'flour', amount: 1, unit: 'cup', category: 'Pantry' },
          { original: '2 eggs', name: 'egg', amount: 2, unit: 'unit', category: 'Dairy' }
        ]
      }
      await route.fulfill({ json })
    })

    await page.goto('/')
  })

  test('should generate and display grocery list from "This Week" recipes', async ({ page }) => {
    // 1. Add a recipe manually (since we cleared storage)
    // Click "Add Recipe"
    await page.getByRole('button', { name: 'Add Recipe' }).click()
    
    // Fill form
    await page.getByLabel('Title').fill('Pancakes')
    await page.getByLabel('Protein').selectOption('Vegetarian')
    await page.getByLabel('Ingredients (One per line)').fill('1 cup flour\n2 eggs')
    await page.getByRole('button', { name: 'Save Recipe' }).click()
    
    // 2. Add to "This Week"
    // The button is on the card in the library view
    await page.getByRole('button', { name: 'Add to This Week' }).click()
    
    // Check for success sync/save if applicable, wait for UI update
    // Instead of checking button class, check for the badge which is more explicit
    await expect(page.locator('.text-md-sys-color-on-primary-container').getByText('This Week')).toBeVisible()

    // 3. Generate List
    // First, verify button exists
    const generateBtn = page.getByTitle('Grocery List')
    await generateBtn.click()
    
    // 4. Verify List UI
    await expect(page.getByText('Grocery List', { exact: true })).toBeVisible()
    await expect(page.getByText('Pantry')).toBeVisible() // Category
    await expect(page.getByText('flour')).toBeVisible()
    await expect(page.getByText('egg')).toBeVisible()
    
    // 5. Test Interaction
    // Use a more specific selector for the interactive row (it has cursor-pointer)
    const flourItem = page.locator('.cursor-pointer', { hasText: 'flour' }).first()
    await flourItem.click()
    
    // Should be checked (opacity reduced, check icon)
    await expect(flourItem).toHaveClass(/opacity-50/)
  })
})
