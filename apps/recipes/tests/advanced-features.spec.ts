import { test, expect } from './msw-setup'
import type { Page, ConsoleMessage } from '@playwright/test'
import type { Recipe } from '../src/lib/types'

const login = async (page: Page) => {
  await page.context().addCookies([
    {
      name: 'site_auth',
      value: 'true',
      domain: '127.0.0.1',
      path: '/',
    },
    {
      name: 'site_user',
      value: 'TestUser',
      domain: '127.0.0.1',
      path: '/',
    },
    {
      name: 'site_email',
      value: 'emilioeh1991@gmail.com',
      domain: '127.0.0.1',
      path: '/',
    },
  ])
  page.on('console', (msg: ConsoleMessage) => console.log('BROWSER LOG:', msg.text()))
}

test.describe('Advanced Features: Ratings, Favorites, and Editing', () => {
  let currentRecipes: Recipe[] = []

  test.beforeEach(async ({ page }) => {
    currentRecipes = []
    await page.route('**/api/**', async (route) => {
      const url = route.request().url()
      const method = route.request().method()
      const { pathname } = new URL(url)

      // 1. Handle sub-resource actions (rating, family-data, refresh, etc.) - EXTREMELY SPECIFIC
      const subResourceMatch = pathname.match(
        /api\/recipes\/([^/]+)\/(rating|family-data|refresh|enhance|family-sync|week-plan)$/,
      )
      if (subResourceMatch) {
        const [_, id, action] = subResourceMatch
        // Return realistic family data to prevent rendering crashes
        if (action === 'family-data') {
          await route.fulfill({
            json: {
              success: true,
              data: {
                id,
                notes: [],
                ratings: [],
                weekPlan: { isPlanned: false },
                cookingHistory: [],
              },
            },
          })
          return
        }

        if (action === 'rating') {
          const body = await route.request().postDataJSON()
          currentRecipes = currentRecipes.map((r) =>
            r.id === id ? { ...r, rating: body.rating } : r,
          )
          await route.fulfill({ json: { success: true } })
          return
        }

        await route.fulfill({ json: { success: true, data: {} } })
        return
      }

      // 2. Handle Favorites
      if (pathname.includes('/api/favorites')) {
        if (method === 'POST') {
          const body = await route.request().postDataJSON()
          const recipeId = body.recipeId
          let newIsFavorite = false
          currentRecipes = currentRecipes.map((r) => {
            if (r.id === recipeId) {
              newIsFavorite = !r.isFavorite
              return { ...r, isFavorite: newIsFavorite }
            }
            return r
          })
          await route.fulfill({ json: { success: true, isFavorite: newIsFavorite } })
        } else {
          await route.fulfill({ json: { success: true } })
        }
        return
      }

      // 3. Handle Main Recipe Endpoints
      const recipeMatch = pathname.match(/api\/recipes(\/([^/]+))?$/)
      if (recipeMatch) {
        const id = recipeMatch[2]

        if (method === 'GET') {
          if (id) {
            const recipe = currentRecipes.find((r) => r.id === id)
            await route.fulfill({ json: { success: true, recipe: recipe || null } })
          } else {
            await route.fulfill({ json: { recipes: currentRecipes } })
          }
        } else if (method === 'POST') {
          const body = await route.request().postDataJSON()
          const newRecipe = {
            ...body,
            id: body.id || `recipe-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isFavorite: false,
          }
          currentRecipes.push(newRecipe)
          await route.fulfill({ json: { success: true, id: newRecipe.id } })
        } else if (method === 'PUT' || method === 'PATCH') {
          const body = await route.request().postDataJSON()
          currentRecipes = currentRecipes.map((r) =>
            r.id === id ? { ...r, ...body, updatedAt: new Date().toISOString() } : r,
          )
          await route.fulfill({ json: { success: true } })
        } else {
          await route.fulfill({ json: { success: true } })
        }
        return
      }

      // Fallback for other /api/ calls
      await route.fulfill({ json: { success: true } })
    })
  })

  test('should allow favoriting a recipe and filtering by favorites', async ({ page }) => {
    await login(page)
    await page.goto('/protected/recipes?skip_setup=true&skip_onboarding=true')

    // 1. Create a test recipe
    await expect(page.getByTestId('loading-indicator')).toBeHidden()
    const addBtn = page.getByRole('button', { name: 'Add Recipe' })
    await expect(addBtn).toBeVisible()
    await addBtn.click()
    const title = `Favorite Test ${Date.now()}`
    await page.getByLabel('Title').fill(title)
    await page.getByLabel('Protein').selectOption('Other')
    await page.getByRole('button', { name: 'Save Recipe' }).click()

    // 2. Open it
    // Wait for view to switch to library
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible({ timeout: 1000 })
    // await expect(page.getByTestId('debug-view')).toHaveText('library')

    const card = page.getByText(title).first()
    await expect(card).toBeVisible()
    await page.waitForTimeout(1000)
    await card.click()

    // Ensure detail view is open
    await expect(page.getByRole('heading', { name: title })).toBeVisible()

    // 3. Toggle Favorite (Heart icon in header)
    const heartBtn = page.getByRole('button', { name: 'Add to Favorites' })
    await expect(heartBtn).toBeVisible()
    await heartBtn.click()

    // Check if it changed to "Remove from Favorites"
    await expect(page.getByRole('button', { name: 'Remove from Favorites' })).toBeVisible()

    // 4. Close detail
    await page.getByRole('button', { name: 'Back to Library' }).click()

    // 5. Verify via filter
    await page.getByRole('button', { name: 'Open Filters' }).click()
    await page.getByRole('button', { name: 'Favorites Only' }).click()
    await page
      .getByRole('button')
      .filter({ has: page.locator('svg.lucide-x') })
      .click() // Close filter

    // 6. Verify our recipe is still visible
    await expect(page.getByText(title).first()).toBeVisible()
  })

  test('should allow rating a recipe', async ({ page }) => {
    await login(page)
    await page.goto('/protected/recipes?skip_setup=true&skip_onboarding=true')

    // 1. Create or use existing
    await expect(page.getByTestId('loading-indicator')).toBeHidden()
    const addBtn = page.getByRole('button', { name: 'Add Recipe' })
    await expect(addBtn).toBeVisible()
    await addBtn.click()
    const title = `Rating Test ${Date.now()}`
    await page.getByLabel('Title').fill(title)
    await page.getByLabel('Protein').selectOption('Other')
    await page.getByRole('button', { name: 'Save Recipe' }).click()

    // 2. Open it
    const card = page.getByText(title).first()
    await expect(card).toBeVisible()
    await page.waitForTimeout(1000)
    await card.click()

    // Ensure detail view is open
    await expect(page.getByRole('heading', { name: title })).toBeVisible()

    // 3. Rate it 5 stars via Cooking Mode (since direct rating is removed)
    // Start Cooking
    await page.getByRole('button', { name: 'Start Cooking' }).click()

    // In Prep Step (Step 0)
    // Since this is a new empty recipe, it has 0 instructions.
    // Clicking "Start Cooking" (next) should go straight to Review.
    await page.getByRole('button', { name: 'Start Cooking' }).click()

    // Verify Review Screen
    await expect(page.getByText('All Done!')).toBeVisible()

    // Rate 5 stars
    await page.getByRole('button', { name: 'Rate 5 stars' }).click()

    // Select Difficulty (Medium)
    await page.getByRole('button', { name: 'Difficulty: Medium' }).click()

    // Complete Review
    await page.getByRole('button', { name: 'Complete Review' }).click()

    // 4. Verification
    // After satisfying review, it returns to detail view
    await expect(page.getByRole('heading', { name: title })).toBeVisible()

    // Verify "Last Cooked" or similar if possible (optional but good)
    // await expect(page.getByText(/Last: /)).toBeVisible()

    // GO BACK TO LIBRARY
    await page.getByRole('button', { name: 'Back to Library' }).click()

    // 5. Verify rating on card
    const recipeCard = page.locator('[data-testid^="recipe-card-"]').filter({ hasText: title })

    // Retry mechanism: if rating doesn't show, try a reload
    try {
      await expect(recipeCard.getByTestId('recipe-rating')).toHaveText('5', { timeout: 5000 })
    } catch {
      console.log('Rating not found on card, reloading...')
      await page.reload()
      await expect(recipeCard.getByTestId('recipe-rating')).toHaveText('5', { timeout: 10000 })
    }
  })

  test.skip('should update modification date on edit', async ({ page }) => {
    await login(page)
    await page.goto('/protected/recipes?skip_setup=true')
    // 1. Create
    await expect(page.getByTestId('loading-indicator')).toBeHidden()
    const addBtn = page.getByRole('button', { name: 'Add Recipe' })
    await expect(addBtn).toBeVisible()
    await addBtn.click()
    const title = `Edit Test ${Date.now()}`
    await page.getByLabel('Title').fill(title)
    await page.getByLabel('Protein').selectOption('Chicken')
    await page.getByRole('button', { name: 'Save Recipe' }).click()

    // 2. Open it
    const card = page.getByText(title).first()
    await expect(card).toBeVisible()
    await page.waitForTimeout(1000)
    await card.click()

    // Ensure detail view is open
    await expect(page.getByRole('heading', { name: title })).toBeVisible()

    // 3. Check "Updated" text exists
    const currentYear = new Date().getFullYear()
    await expect(page.getByText(new RegExp(`Updated .*${currentYear}`))).toBeVisible()

    // 4. Edit
    const moreBtn = page.getByRole('button', { name: 'More Options' })
    await expect(moreBtn).toBeVisible()
    await moreBtn.click()
    await page.getByRole('menuitem', { name: 'Edit Recipe' }).click()

    // Change title
    const newTitle = title + ' Edited'
    await page.getByLabel('Title').fill(newTitle)
    await page.getByRole('button', { name: 'Save Recipe' }).click()

    // Allow saving and closing
    await page.waitForTimeout(1000)

    // 5. Verify Title updated in library
    await expect(page.getByRole('heading', { name: newTitle })).toBeVisible()

    // 6. Re-open to verify "Updated" date in Detail View
    const newCard = page
      .getByRole('button')
      .filter({ has: page.getByRole('heading', { name: newTitle }) })
    await newCard.click()

    // Date should still be today.
    await expect(page.getByText(new RegExp(`Updated .*${currentYear}`))).toBeVisible()
  })
})
