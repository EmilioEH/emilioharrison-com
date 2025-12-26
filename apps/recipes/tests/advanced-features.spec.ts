import { test, expect } from '@playwright/test'

test.describe('Advanced Features: Ratings, Favorites, and Editing', () => {
  // Bypass authentication
  test.use({
    storageState: {
      cookies: [
        {
          name: 'site_auth',
          value: 'true',
          domain: '127.0.0.1',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
        {
          name: 'site_user',
          value: 'TestUser',
          domain: '127.0.0.1',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
      ],
      origins: [],
    },
  })

  test.beforeEach(async ({ page }) => {
    // Mock user data to keep the test environment clean and isolated
    await page.route('**/api/user-data', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          json: {
            recipes: [], // Start with empty library for these tests
          },
        })
      } else {
        await route.fulfill({ json: { success: true } })
      }
    })
  })

  test('should allow favoriting a recipe and filtering by favorites', async ({ page }) => {
    await page.goto('/protected/recipes')

    // 1. Create a test recipe
    await page.getByRole('button', { name: 'Add Recipe' }).click()
    const title = `Favorite Test ${Date.now()}`
    await page.getByLabel('Title').fill(title)
    await page.getByLabel('Protein').selectOption('Other')
    await page.getByRole('button', { name: 'Save Recipe' }).click()

    // 2. Open it
    const card = page.getByRole('button').filter({ hasText: title }).first()
    await expect(card).toBeVisible()
    await page.waitForTimeout(1000)
    await card.click()

    // Ensure detail view is open
    await expect(page.getByRole('heading', { name: title })).toBeVisible()

    // 3. Toggle Favorite (Heart icon in header)
    // Find the heart button. It has title "Add to Favorites"
    const heartBtn = page.getByRole('button', { name: 'Add to Favorites' })
    await expect(heartBtn).toBeVisible()
    await heartBtn.click()

    // Check if it changed to "Remove from Favorites" (or just check existence of filled heart class if possible, but title is better a11y check)
    await expect(page.getByRole('button', { name: 'Remove from Favorites' })).toBeVisible()

    // 4. Close detail
    await page.getByRole('button', { name: 'Back to Library' }).click()

    // 5. Verify Heart icon on card
    // The card should now contain a SVG with class fill-red-500 or similar.
    // We can just verify the card contains a heart icon.
    // But better: Filter by Favorites Only

    await page.getByTitle('Sort & Filter').click()
    await page.getByRole('button', { name: 'Favorites Only' }).click()
    await page
      .getByRole('button')
      .filter({ has: page.locator('svg.lucide-x') })
      .click() // Close filter

    // 6. Verify our recipe is still visible
    await expect(page.getByText(title)).toBeVisible()

    // 7. Toggle filter off to be clean? Or just reset.
  })

  test('should allow rating a recipe', async ({ page }) => {
    await page.goto('/protected/recipes')

    // 1. Create or use existing
    await page.getByRole('button', { name: 'Add Recipe' }).click()
    const title = `Rating Test ${Date.now()}`
    await page.getByLabel('Title').fill(title)
    await page.getByLabel('Protein').selectOption('Other')
    await page.getByRole('button', { name: 'Save Recipe' }).click()

    // 2. Open it
    const card = page.getByRole('button').filter({ hasText: title }).first()
    await expect(card).toBeVisible()
    await page.waitForTimeout(1000)
    await card.click()

    // Ensure detail view is open
    await expect(page.getByRole('heading', { name: title })).toBeVisible()

    // 3. Rate it 5 stars
    // The star rating component renders buttons with aria-label="Rate X stars"
    await page.getByRole('button', { name: 'Rate 5 stars' }).click()

    // Allow state to settle
    await page.waitForTimeout(1000)

    // 4. Close detail
    await page.getByRole('button', { name: 'Back to Library' }).click()

    // 5. Verify rating on card
    await expect(card.getByText('5', { exact: true })).toBeVisible()
  })

  test('should update modification date on edit', async ({ page }) => {
    await page.goto('/protected/recipes')
    // 1. Create
    await page.getByRole('button', { name: 'Add Recipe' }).click()
    const title = `Edit Test ${Date.now()}`
    await page.getByLabel('Title').fill(title)
    await page.getByLabel('Protein').selectOption('Chicken')
    await page.getByRole('button', { name: 'Save Recipe' }).click()

    // 2. Open it
    const card = page.getByRole('button').filter({ hasText: title }).first()
    await expect(card).toBeVisible()
    await page.waitForTimeout(1000)
    await card.click()

    // Ensure detail view is open
    await expect(page.getByRole('heading', { name: title })).toBeVisible()

    // 3. Check "Updated" text exists
    const today = new Date().toLocaleDateString()
    await expect(page.getByText(`Updated ${today}`)).toBeVisible()

    // 4. Edit
    // Open More Options and click Edit
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
