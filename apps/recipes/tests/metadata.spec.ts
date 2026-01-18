import { test, expect } from './msw-setup'

test.describe('Recipe Metadata & Filtering', () => {
  test('should create recipe with metadata and filter by it', async ({ page, context }) => {
    // 0. Set Auth Cookies
    await context.addCookies([
      { name: 'site_auth', value: 'true', domain: 'localhost', path: '/' },
      { name: 'site_user', value: 'TestUser', domain: 'localhost', path: '/' },
      { name: 'site_email', value: 'emilioeh1991@gmail.com', domain: 'localhost', path: '/' },
    ])

    // 1. Load Page with Mock Data
    const mockRecipes = [
      {
        id: 'r1',
        title: 'Vegan Breakfast Burrito',
        protein: 'Vegetarian',
        mealType: 'Breakfast',
        dishType: 'Main',
        dietary: ['Vegan', 'Gluten-Free'],
        equipment: ['Pan'],
        occasion: ['Weeknight'],
        ingredients: [],
        steps: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'r2',
        title: 'Steak Dinner',
        protein: 'Beef',
        mealType: 'Dinner',
        dishType: 'Main',
        dietary: ['Keto'],
        equipment: ['Grill'],
        occasion: ['Date Night'],
        ingredients: [],
        steps: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    let currentRecipes = [...mockRecipes]
    await page.route('**/api/recipes*', async (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        await route.fulfill({ json: { recipes: currentRecipes } })
      } else if (method === 'PUT') {
        const body = await route.request().postDataJSON()
        currentRecipes = currentRecipes.map((r) => (r.id === body.id ? body : r))
        await route.fulfill({ json: { success: true } })
      } else {
        await route.fulfill({ json: { success: true } })
      }
    })

    await page.goto('/protected/recipes')

    // 2. Open Filters
    await page.getByLabel('Open Filters').click()

    // 3. Filter by Meal Type: Breakfast
    // Wait for filter modal
    await expect(page.getByText('Sort & Filter')).toBeVisible()

    await page.getByRole('button', { name: 'Breakfast', exact: true }).click()

    // Close filters
    await page.getByRole('button', { name: /close/i }).first().click() // Close icon

    // 4. Verify Grid
    await expect(page.getByText('Vegan Breakfast Burrito')).toBeVisible()
    await expect(page.getByText('Steak Dinner')).toBeHidden()

    // 5. Reset Filters
    await page.getByLabel('Open Filters').click()
    await page.getByText('Reset all filters').click()
    await page.getByRole('button', { name: /close/i }).first().click()

    // 6. Filter by Dietary: Keto
    await page.getByLabel('Open Filters').click()
    await page.getByRole('button', { name: 'Keto' }).click()
    await page.getByRole('button', { name: /close/i }).first().click()

    await expect(page.getByText('Steak Dinner')).toBeVisible()
    await expect(page.getByText('Vegan Breakfast Burrito')).toBeHidden()

    // 7. Grouping (Sort by Meal Type)
    await page.getByLabel('Open Filters').click()
    await page.getByRole('button', { name: 'Meal Type' }).click()
    await page.getByRole('button', { name: /close/i }).first().click()

    // Expect Accordion Headers
    await expect(page.getByText('Breakfast')).toBeVisible()
    await expect(page.getByText('Dinner')).toBeVisible()
  })
})
