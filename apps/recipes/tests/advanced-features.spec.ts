import { test, expect } from '@playwright/test'
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
      } else {
        await route.fulfill({ json: { success: true } })
      }
    })
  })

  test('should allow favoriting a recipe and filtering by favorites', async ({ page }) => {
    await login(page)
    await page.goto('/protected/recipes')

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
    await expect(page.getByTestId('debug-view')).toHaveText('library')

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
    await page.goto('/protected/recipes')

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

    // 3. Rate it 5 stars
    await page.getByRole('button', { name: 'Rate 5 stars' }).click()

    // Allow state to settle
    await page.waitForTimeout(1000)

    // 4. Close detail
    await page.getByRole('button', { name: 'Back to Library' }).click()

    // 5. Verify rating on card - need to locate the full card, not just the title text
    // The card contains an h3 with the title, and the rating is in a sibling div
    const recipeCard = page.locator('[data-testid^="recipe-card-"]').filter({ hasText: title })
    await expect(recipeCard.getByText('5', { exact: true })).toBeVisible({ timeout: 10000 })
  })

  test('should update modification date on edit', async ({ page }) => {
    await login(page)
    await page.goto('/protected/recipes')
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
    const today = new Date().toLocaleDateString()
    await expect(page.getByText(`Updated ${today}`)).toBeVisible()

    // 4. Edit
    const moreBtn = page.getByRole('button', { name: 'More Options' })
    await expect(moreBtn).toBeVisible()
    await moreBtn.hover()
    await page.getByRole('button', { name: 'Edit Recipe' }).click()

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
    await expect(page.getByText(`Updated ${today}`)).toBeVisible()
  })
})
