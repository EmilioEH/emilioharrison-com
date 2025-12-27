import { test, expect } from '@playwright/test'

test.describe('Week View Grouping', () => {
  test.beforeEach(async ({ page, context }) => {
    // Mock Auth
    await context.addCookies([
      { name: 'site_auth', value: 'true', domain: '127.0.0.1', path: '/' },
      { name: 'site_user', value: 'testuser', domain: '127.0.0.1', path: '/' },
    ])

    // Mock Recipes Data
    const mockRecipes = [
      {
        id: '1',
        title: 'Chicken Curry',
        protein: 'Chicken',
        thisWeek: false,
        prepTime: 10,
        cookTime: 20,
        servings: 4,
        ingredients: [{ name: 'Chicken', amount: '1lb' }],
        steps: [],
      },
      {
        id: '2',
        title: 'Beef Stew',
        protein: 'Beef',
        thisWeek: false,
        prepTime: 10,
        cookTime: 20,
        servings: 4,
        ingredients: [{ name: 'Beef', amount: '1lb' }],
        steps: [],
      },
    ]

    await page.route('**/api/user-data', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: { recipes: mockRecipes } })
      } else {
        // Mock Save
        await route.fulfill({ json: { success: true } })
      }
    })

    await page.goto('/protected/recipes')
  })

  test('groups by day in Week View and allows assignment', async ({ page }) => {
    // 1. Add recipe to week
    await page.locator('[data-testid="recipe-card-1"] button[title="Add to This Week"]').click()

    // 2. Go to Week View
    await page.getByRole('button', { name: /^This Week/i }).click()

    // 3. Verify "To Plan" group exists and contains the recipe
    // "To Plan" header should be visible
    await expect(page.getByRole('button', { name: /To Plan/i })).toBeVisible()
    await expect(page.locator('[data-testid="recipe-card-1"]')).toBeVisible()

    // 4. Verify Day Assignment UI is present
    const card = page.locator('[data-testid="recipe-card-1"]')
    const moveSelect = card.locator('select')
    await expect(moveSelect).toBeVisible()
    await expect(moveSelect).toHaveValue('') // Default is empty/Unassigned

    // 5. Assign to Monday (First option after placeholder)
    // We select the first available day in the dropdown
    await moveSelect.selectOption({ index: 1 })

    // 6. Verify assignment
    // The previous "To Plan" group might now be empty (0)
    // We expect the count badge on "To Plan" to be 0
    await expect(page.locator('button:has-text("To Plan") span').first()).toHaveText('0')

    // And the Monday group (index 1 in the groups list?) to have 1
    // Since dates change, we can't hardcode the text "Monday".
    // But we know we selected the first day option.
    // Let's verify that the value of the select is no longer empty.
    const newValue = await moveSelect.inputValue()
    expect(newValue).not.toBe('')
  })
})
