import { test, expect } from '@playwright/test'

test.describe('Smart Grocery List', () => {
  test.use({ baseURL: 'http://127.0.0.1:8788' })

  test.beforeEach(async ({ page, context }) => {
    // Mock user state
    await context.addCookies([
      { name: 'site_auth', value: 'true', url: 'http://127.0.0.1:8788/' },
      { name: 'site_user', value: 'TestUser', url: 'http://127.0.0.1:8788/' },
      { name: 'site_email', value: 'test@example.com', url: 'http://127.0.0.1:8788/' },
    ])

    // Mock API: Recipes
    await page.route('**/api/recipes*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recipes: [
            {
              id: '1',
              title: 'Garlic Chicken',
              ingredients: [
                { name: 'Garlic', amount: '3 cloves' },
                { name: 'Chicken', amount: '1 lb' },
              ],
              thisWeek: true,
            },
            {
              id: '2',
              title: 'Garlic Pasta',
              ingredients: [
                { name: 'Garlic', amount: '5 cloves' },
                { name: 'Pasta', amount: '1 box' },
              ],
              thisWeek: true,
            },
          ],
        }),
      })
    })

    // Mock API: Generate Smart List
    await page.route('**/api/generate-grocery-list', async (route) => {
      const body = await route.request().postDataJSON()
      // Verify request body contains recipes
      if (!body.recipes || body.recipes.length === 0) {
        return route.abort()
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ingredients: [
            {
              name: 'garlic',
              purchaseAmount: 1, // 3+5=8 cloves -> 1 head
              purchaseUnit: 'head',
              category: 'Produce',
              sources: [
                { recipeId: '1', recipeTitle: 'Garlic Chicken', originalAmount: '3 cloves' },
                { recipeId: '2', recipeTitle: 'Garlic Pasta', originalAmount: '5 cloves' },
              ],
            },
            {
              name: 'chicken',
              purchaseAmount: 1,
              purchaseUnit: 'lb',
              category: 'Meat',
              sources: [],
            },
            {
              name: 'pasta',
              purchaseAmount: 1,
              purchaseUnit: 'box',
              category: 'Pantry',
              sources: [],
            },
          ],
        }),
      })
    })

    await page.goto('http://127.0.0.1:8788/protected/recipes')
  })

  test('should optimize grocery list when button is clicked', async ({ page }) => {
    // 1. Open Week/Grocery View
    // Assuming "Shop" tab opens it, or we need to click "Week" then "Grocery".
    // Based on previous test, clicking "Shop" tab seems to open it.
    // If not, we might need to click a "Grocery List" button in the library.
    // Attempting "Shop" tab first.
    // Ensure navigation to week view
    // Verify page loaded
    await expect(page.getByText('Recipes', { exact: false }).first()).toBeVisible()

    // Debug: output content if failed
    console.log(await page.content())

    const shopTab = page.getByRole('tab', { name: /shop/i })
    if (await shopTab.isVisible()) {
      await shopTab.click()
    } else {
      // Fallback: Open via header or other means if tab isn't visible (desktop/mobile)
      await page
        .getByRole('button', { name: /grocery/i })
        .first()
        .click()
    }

    // 2. Initial State: Standard local list
    // Should see "Garlic" (aggregated by name, maybe raw?)
    // Local aggregator usually keeps raw units if they differ, or adds numbers.
    // "3 cloves" + "5 cloves" -> "8 cloves" (if name matches).
    // Let's verify we see "Garlic"
    await expect(page.getByText('Garlic', { exact: false })).toBeVisible()

    // 3. Find and Click "Optimize" button
    const optimizeBtn = page.getByTitle('Optimize with AI')
    await expect(optimizeBtn).toBeVisible()

    // 4. Click
    await optimizeBtn.click()

    // 5. Verify "Optimizing..." state
    // Might be too fast to catch, but we verify end state.

    // 6. Verify "Smart List" active state
    await expect(page.getByText('Smart List')).toBeVisible()

    // 7. Verify Content Changed
    // Should see "head" or "1 head" for garlic in the mock response
    await expect(page.getByText('head', { exact: false })).toBeVisible()

    // 8. Verify source details (hover or expand)
    // Click the item to expand details?
    const garlicRow = page.locator('div').filter({ hasText: 'garlic' }).last()
    await garlicRow.click() // or expand button
    // Should see "Garlic Chicken" and "Garlic Pasta" tags
    await expect(page.getByText('Garlic Chicken')).toBeVisible()
  })
})
