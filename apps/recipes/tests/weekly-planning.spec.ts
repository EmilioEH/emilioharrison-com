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

  test('can toggle "This Week" status on a recipe', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('CHEFBOARD')

    // Toggle ID 1 (Chicken Curry)
    const card = page.locator('[data-testid="recipe-card-1"]')
    await expect(card).toBeVisible()

    // Initial state: not in week
    await expect(card).not.toHaveClass(/border-md-sys-color-primary/)

    const toggleBtn = card.locator('button[title="Add to This Week"]')
    await toggleBtn.click()

    // Expect state change
    await expect(card.locator('button[title="Remove from This Week"]')).toBeVisible()
    await expect(card).toHaveClass(/border-md-sys-color-primary/)
  })

  test('enforces minimum 3 recipes for grocery list', async ({ page }) => {
    // Initially 0 selected mockRecipes.
    // Select 1 (ID 1)
    await page.locator('[data-testid="recipe-card-1"] button[title="Add to This Week"]').click()

    // Try generate
    // Expect alert check
    const dialogPromise = new Promise<string>((resolve) => {
      page.once('dialog', async (dialog) => {
        resolve(dialog.message())
        await dialog.accept()
      })
    })

    await page.locator('button[title="Grocery List"]').click()

    const msg = await dialogPromise
    expect(msg).toContain('Please select at least 3 recipes')

    // As we only have 1 selected (and Mock logic in component enforces strict rule on This Week items),
    // wait... in component: "if (thisWeekRecipes.length > 0) ... if (length < 3) alert"
    // So logic matches.

    // Wait for alert (handling might need small delay or poll)
    // Playwright captures dialog automatically if listener attached.
    // We need to ensure we wait enough.
    // Also "Grocery List" view should NOT appear.
    await expect(page.getByText('Consulting the AI Chef')).not.toBeVisible()

    // Select 2nd and 3rd
    await page.locator('[data-testid="recipe-card-2"] button[title="Add to This Week"]').click()
    await page.locator('[data-testid="recipe-card-3"] button[title="Add to This Week"]').click()

    // Now 3 selected. Click generate.
    await page.locator('button[title="Grocery List"]').click()
    await expect(page.getByText('Grocery List', { exact: true })).toBeVisible()
  })
  /*
  test('leads to variety warning on duplicate protein (4th item)', async ({ page }) => {
     // Prepare state: Select 3 items. One Chicken, Two Others.
     // ID 1 (Chicken), ID 2 (Beef), ID 3 (Fish)
     await page.locator('[data-testid="recipe-card-1"] button[title="Add to This Week"]').click()
     await page.locator('[data-testid="recipe-card-2"] button[title="Add to This Week"]').click()
     await page.locator('[data-testid="recipe-card-3"] button[title="Add to This Week"]').click()
     
     // Now select 4th item: ID 5 (Chicken Salad). Duplicate of ID 1.
     // Should trigger warning.
     await page.locator('[data-testid="recipe-card-5"] button[title="Add to This Week"]').click()
     
     // Expect warning toast
     await expect(page.getByText('Variety Check!')).toBeVisible()
     await expect(page.getByText("You've selected 2 Chicken recipes this week.")).toBeVisible()
  })
*/
  // Commenting out test 3 temporarily to ensure 1 and 2 pass first (step by step debugging)
  // actually I'll uncomment it, confidence is high.
  test('leads to variety warning on duplicate protein (4th item)', async ({ page }) => {
    await page.locator('[data-testid="recipe-card-1"] button[title="Add to This Week"]').click()
    await page.locator('[data-testid="recipe-card-2"] button[title="Add to This Week"]').click()
    await page.locator('[data-testid="recipe-card-3"] button[title="Add to This Week"]').click()

    await page.locator('[data-testid="recipe-card-5"] button[title="Add to This Week"]').click()

    await expect(page.getByText('Variety Check!')).toBeVisible()
    await expect(page.getByText("You've selected 2 Chicken recipes this week.")).toBeVisible()
  })
})
