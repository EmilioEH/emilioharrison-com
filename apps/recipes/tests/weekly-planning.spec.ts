import { test, expect } from '@playwright/test'

test.describe('Weekly Meal Planning', () => {
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
      {
        id: '3',
        title: 'Grilled Fish',
        protein: 'Fish',
        thisWeek: false,
        prepTime: 10,
        cookTime: 20,
        servings: 4,
        ingredients: [{ name: 'Fish', amount: '1lb' }],
        steps: [],
      },
      {
        id: '4',
        title: 'Pork Chops',
        protein: 'Pork',
        thisWeek: false,
        prepTime: 10,
        cookTime: 20,
        servings: 4,
        ingredients: [{ name: 'Pork', amount: '1lb' }],
        steps: [],
      },
      {
        id: '5',
        title: 'Chicken Salad',
        protein: 'Chicken',
        thisWeek: false,
        prepTime: 10,
        cookTime: 20,
        servings: 4,
        ingredients: [{ name: 'Chicken', amount: '1lb' }],
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

  test('can toggle "This Week" status and view in Plan tab', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('CHEFBOARD')

    // Initial State: 0 items in week

    // Verify content loaded first
    const card = page.locator('[data-testid="recipe-card-1"]')
    await expect(card).toBeVisible()

    // Verify Tabs exist - use exact name match for tab buttons
    const libraryTab = page.getByRole('button', { name: 'Library 5', exact: true })
    const thisWeekTab = page.getByRole('button', { name: 'This Week 0', exact: true })
    await expect(libraryTab).toBeVisible()
    await expect(thisWeekTab).toBeVisible()

    // Toggle ID 1 (Chicken Curry) to add to This Week
    await card.locator('button[title="Add to This Week"]').click()

    // Verify badge updates to 1 - tab accessible name now includes "1"
    const thisWeekTabUpdated = page.getByRole('button', { name: 'This Week 1', exact: true })
    await expect(thisWeekTabUpdated).toBeVisible()

    // Switch to Week View
    await thisWeekTabUpdated.click()

    // Verify only ID 1 is visible
    await expect(page.locator('[data-testid="recipe-card-1"]')).toBeVisible()
    await expect(page.locator('[data-testid="recipe-card-2"]')).toBeHidden()

    // Verify removing from week in Week View removes it from list
    await page
      .locator('[data-testid="recipe-card-1"] button[title="Remove from This Week"]')
      .click()
    await expect(page.locator('[data-testid="recipe-card-1"]')).toBeHidden()

    // Badge should be 0 - tab accessible name back to 0
    await expect(page.getByRole('button', { name: 'This Week 0', exact: true })).toBeVisible()
  })

  test('enforces minimum 3 recipes for grocery list', async ({ page }) => {
    // Select 1 (ID 1)
    await page.locator('[data-testid="recipe-card-1"] button[title="Add to This Week"]').click()

    // Try generate
    const dialogPromise = new Promise<string>((resolve) => {
      page.once('dialog', async (dialog) => {
        resolve(dialog.message())
        await dialog.accept()
      })
    })

    await page.locator('button[title="Grocery List"]').click()

    const msg = await dialogPromise
    expect(msg).toContain('Please select at least 3 recipes')

    // Select 2nd and 3rd
    await page.locator('[data-testid="recipe-card-2"] button[title="Add to This Week"]').click()
    await page.locator('[data-testid="recipe-card-3"] button[title="Add to This Week"]').click()

    // Now 3 selected. Click generate.
    await page.locator('button[title="Grocery List"]').click()
    await expect(page.getByText('Grocery List', { exact: true })).toBeVisible()
  })

  test('leads to variety warning on duplicate protein (4th item)', async ({ page }) => {
    await page.locator('[data-testid="recipe-card-1"] button[title="Add to This Week"]').click()
    await page.locator('[data-testid="recipe-card-2"] button[title="Add to This Week"]').click()
    await page.locator('[data-testid="recipe-card-3"] button[title="Add to This Week"]').click()

    await page.locator('[data-testid="recipe-card-5"] button[title="Add to This Week"]').click()

    await expect(page.getByText('Variety Check!')).toBeVisible()
    await expect(page.getByText("You've selected 2 Chicken recipes this week.")).toBeVisible()
  })
})
