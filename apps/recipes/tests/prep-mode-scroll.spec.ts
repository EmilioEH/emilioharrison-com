import { test, expect } from '@playwright/test'

test.describe('Prep Mode Scroll', () => {
  test.beforeEach(async ({ context }) => {
    // Mock Auth
    await context.addCookies([
      { name: 'site_auth', value: 'true', url: 'http://127.0.0.1:8788/' },
      { name: 'site_user', value: 'TestUser', url: 'http://127.0.0.1:8788/' },
    ])
  })

  test('should allow scrolling in mise en place view with many ingredients', async ({ page }) => {
    // 1. Mock Recipe with many ingredients
    await page.route('**/api/recipes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recipes: [
            {
              id: '1',
              title: 'Big Feast',
              // Generate 20 ingredients
              ingredients: Array.from({ length: 25 }, (_, i) => ({
                name: `Ingredient ${i + 1}`,
                amount: '1 cup',
              })),
              steps: ['Step 1'],
              thisWeek: false,
            },
          ],
        }),
      })
    })

    // 2. Go to page
    await page.goto('/protected/recipes')

    // 3. Open Recipe
    await page.getByText('Big Feast').click()

    // 4. Click "Start Prepping"
    // Note: The specific button might need a specific locator if there are multiple
    await page.getByRole('button', { name: 'Start Prepping' }).click()

    // 5. Verify we can see the "Mise en Place" header
    await expect(page.getByRole('heading', { name: 'Mise en Place' })).toBeVisible()

    // 6. Check for the last ingredient presence (might need scrolling)
    const lastIngredient = page.getByText('Ingredient 25')

    // We want to verify it's scrollable.
    // If it's effectively "visible" but off-screen, playwright might auto-scroll.
    // So we explicitly check if the container is scrollable or just try to scroll to it.

    await lastIngredient.scrollIntoViewIfNeeded()
    await expect(lastIngredient).toBeVisible()

    // 7. Also verify the "Start Cooking" button at the bottom is reachable
    const startCookingBtn = page.getByRole('button', { name: 'Start Cooking' })
    await startCookingBtn.scrollIntoViewIfNeeded()
    await expect(startCookingBtn).toBeVisible()
  })
})
