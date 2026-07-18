import { test, expect } from './msw-setup'
import { AUTH_COOKIES } from './msw-setup'

test.describe('Week View Synchronization', () => {
  test.use({
    storageState: {
      cookies: [...AUTH_COOKIES],
      origins: [],
    },
  })

  test('should remove recipe from week plan when deleted', async ({ page }) => {
    // 1. Setup mocks
    let recipes: Array<Record<string, unknown>> = []

    await page.route('**/api/recipes*', async (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        await route.fulfill({ json: { recipes } })
      } else if (method === 'POST') {
        const data = route.request().postDataJSON()
        const created = { id: 'test-recipe-id', ...data }
        recipes = [...recipes, created]
        await route.fulfill({ json: { success: true, id: created.id } })
      } else if (method === 'DELETE') {
        recipes = []
        await route.fulfill({ json: { success: true } })
      } else {
        await route.fulfill({ json: { success: true } })
      }
    })

    await page.route('**/week-plan', async (route) => {
      const method = route.request().method()
      if (method === 'POST') {
        const body = route.request().postDataJSON()
        await route.fulfill({
          json: {
            success: true,
            data: { id: 'test-recipe-id', weekPlan: { isPlanned: true, ...body } },
          },
        })
      } else {
        await route.fulfill({ json: { success: true } })
      }
    })

    // 2. Go to app
    await page.goto('/protected/recipes?skip_setup=true')

    // 3. Create a recipe
    await page.getByRole('button', { name: 'Add Recipe' }).click()
    await page.getByLabel('Title').fill('Toast')
    await page.getByLabel('Ingredients (One per line)').fill('Bread')
    await page.getByLabel('Protein').selectOption('Vegetarian')
    await page.getByRole('button', { name: 'Save Recipe' }).click()

    // 4. Add to the active week — one tap, no day picker.
    await expect(page.getByRole('heading', { name: 'Recipe Saved!' })).toBeVisible()
    await page.getByRole('button', { name: 'View Recipe' }).click()
    await page.getByRole('button', { name: 'Add to Week' }).click()
    await expect(page.getByText('Added')).toBeVisible()

    // 5. Go to the This Week tab and verify the recipe is planned.
    await page.getByRole('button', { name: 'Back to Library' }).click()
    await page.getByRole('button', { name: 'This Week', exact: true }).click()
    await expect(page.getByText('Toast')).toBeVisible()

    // 6. Delete the recipe from its detail view. Confirmation is a custom in-app dialog
    // (Cancel/Confirm buttons), not a native window.confirm(), so it needs an explicit click.
    await page.getByText('Toast').click()
    await page.getByLabel('More Options').click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await page.getByRole('button', { name: 'Confirm' }).click()

    // 7. Verify it's gone from the week list.
    await expect(page.getByRole('button', { name: 'This Week', exact: true })).toBeVisible()
    await expect(page.getByText('Toast')).not.toBeVisible()
  })
})
