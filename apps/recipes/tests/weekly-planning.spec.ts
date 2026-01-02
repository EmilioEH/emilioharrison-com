import { test, expect } from '@playwright/test'

test.describe('Weekly Meal Planning', () => {
  test.beforeEach(async ({ page, context }) => {
    // Mock Auth
    await context.addCookies([
      { name: 'site_auth', value: 'true', domain: '127.0.0.1', path: '/' },
      { name: 'site_user', value: 'testuser', domain: '127.0.0.1', path: '/' },
      { name: 'site_email', value: 'emilioeh1991@gmail.com', domain: '127.0.0.1', path: '/' },
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

    let currentRecipes = [...mockRecipes]
    await page.route(/\/api\/recipes/, async (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        await route.fulfill({ json: { recipes: currentRecipes } })
      } else if (method === 'POST') {
        const body = await route.request().postDataJSON()
        const newRecipe = { ...body, id: body.id || `recipe-${Date.now()}` }
        currentRecipes.push(newRecipe)
        await route.fulfill({ json: { success: true, id: newRecipe.id } })
      } else if (method === 'PUT') {
        const body = await route.request().postDataJSON()
        currentRecipes = currentRecipes.map((r) => (r.id === body.id ? body : r))
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

    // Verify Tabs exist
    await expect(page.getByRole('tab', { name: /Lib/i })).toBeVisible()

    const thisWeekTab = page.getByRole('tab', { name: /Plan/i })
    await expect(thisWeekTab).toBeVisible()

    // Verify badge is not shown (weekCount = 0)
    const badgeSelector = 'span.bg-primary.text-primary-foreground'
    await expect(thisWeekTab.locator(badgeSelector)).toBeHidden()

    // Toggle Plan Mode
    await page.getByRole('button', { name: 'Enter Plan Mode' }).click()

    // Toggle ID 1 (Chicken Curry) by clicking the card
    await card.click()

    // Verify badge shows 1
    await expect(thisWeekTab.locator(badgeSelector)).toHaveText('1')

    // Switch to Week View
    await page.getByRole('tab', { name: /Plan/i }).click()

    // Verify only ID 1 is visible
    await expect(page.locator('[data-testid="recipe-card-1"]')).toBeVisible()
    await expect(page.locator('[data-testid="recipe-card-2"]')).toBeHidden()

    // Toggle Plan Mode again to remove
    await page.getByRole('button', { name: 'Enter Plan Mode' }).click()

    // Toggle off ID 1
    await page.locator('[data-testid="recipe-card-1"]').click()
    await expect(page.locator('[data-testid="recipe-card-1"]')).toBeHidden()

    // Badge should be hidden (0 items)
    await expect(page.getByRole('tab', { name: /Plan/i }).locator('span.bg-primary')).toBeHidden()
  })

  // SKIPPED: With the new 3-tab navigation, the Shop tab always shows the grocery list.
  // The "minimum 3 recipes" validation was part of the old header-button flow.
  // This behavior change was intentional as part of the DoorDash Pivot refactor.
  test.skip('enforces minimum 3 recipes for grocery list', async ({ page }) => {
    // Wait for content to load
    await expect(page.locator('[data-testid="recipe-card-1"]')).toBeVisible()

    // Select 1 (ID 1)
    await page.locator('[data-testid="recipe-card-1"] button[title="Add to This Week"]').click()

    // Try generate
    const dialogPromise = new Promise<string>((resolve) => {
      page.once('dialog', async (dialog) => {
        resolve(dialog.message())
        await dialog.accept()
      })
    })

    await page.getByRole('tab', { name: /Shop/i }).click()

    const msg = await dialogPromise
    expect(msg).toContain('Please select at least 3 recipes')

    // Select 2nd and 3rd
    await page.locator('[data-testid="recipe-card-2"] button[title="Add to This Week"]').click()
    await page.locator('[data-testid="recipe-card-3"] button[title="Add to This Week"]').click()

    // Now 3 selected. Click generate.
    await page.getByRole('tab', { name: /Shop/i }).click()
    await expect(page.getByText('Grocery List', { exact: true })).toBeVisible()
  })

  test('leads to variety warning on duplicate protein (4th item)', async ({ page }) => {
    // Wait for content to load
    await expect(page.locator('[data-testid="recipe-card-1"]')).toBeVisible()

    // Enter Plan Mode
    await page.getByRole('button', { name: 'Enter Plan Mode' }).click()

    await page.locator('[data-testid="recipe-card-1"]').click()
    await page.locator('[data-testid="recipe-card-2"]').click()
    await page.locator('[data-testid="recipe-card-3"]').click()

    await page.locator('[data-testid="recipe-card-5"]').click()

    await expect(page.getByText('Variety Check!')).toBeVisible()
    await expect(page.getByText("You've selected 2 Chicken recipes this week.")).toBeVisible()
  })
})
