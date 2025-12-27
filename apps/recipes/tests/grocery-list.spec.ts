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
    await page.route('**/api/generate-grocery-list', async (route) => {
      const json = {
        ingredients: [
          { original: '1 cup flour', name: 'flour', amount: 1, unit: 'cup', category: 'Pantry' },
          { original: '2 eggs', name: 'egg', amount: 2, unit: 'unit', category: 'Dairy' },
        ],
      }
      await route.fulfill({ json })
    })

    // Mock User Data with 3 recipes to satisfy minimum requirement
    await page.route('**/api/user-data', async (route) => {
      await route.fulfill({
        json: {
          recipes: [
            {
              id: '1',
              title: 'Pancakes',
              ingredients: [
                { name: 'flour', amount: '1 cup' },
                { name: 'eggs', amount: '2' },
              ],
              structuredIngredients: undefined, // Force AI generation
              thisWeek: true,
              protein: 'Vegetarian',
            },
            {
              id: '2',
              title: 'Omelette',
              ingredients: [],
              structuredIngredients: undefined,
              thisWeek: true,
              protein: 'Vegetarian',
            },
            {
              id: '3',
              title: 'Toast',
              ingredients: [],
              structuredIngredients: undefined,
              thisWeek: true,
              protein: 'Vegetarian',
            },
          ],
        },
      })
    })

    await page.goto('/')
  })

  test('should generate and display grocery list from "This Week" recipes', async ({ page }) => {
    // 1. Recipes are loaded from mock
    // Wait for them to appear
    await expect(page.getByText('Pancakes')).toBeVisible()

    // 2. Generate List
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
