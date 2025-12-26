import { test, expect } from '@playwright/test'

test.describe('Recipe Manager', () => {
  // Bypass authentication for all tests in this file
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
            recipes: [],
          },
        })
      } else {
        await route.fulfill({ json: { success: true } })
      }
    })
  })

  test('should allow creating and viewing a recipe in accordion groups', async ({ page }) => {
    // 1. Go to the recipe manager
    await page.goto('/protected/recipes')

    // Check we are not redirected to login
    await expect(page).toHaveURL(/\/protected\/recipes/)
    await expect(page.getByText('CHEFBOARD')).toBeVisible()

    // 2. Add a new recipe with a protein
    await page.getByRole('button', { name: 'Add Recipe' }).click()

    const testTitle = `ZESTY_BEEF_STEW_${Date.now()}`
    await page.getByLabel('Title').fill(testTitle)
    await page.getByLabel('Ingredients (One per line)').fill('1 lb Beef')
    await page.getByLabel('Instructions (One per line)').fill('Stew beef')

    // Select protein
    await page.getByLabel('Protein').selectOption('Beef')

    await page.getByRole('button', { name: 'Save Recipe' }).click()

    // 3. Verify it appears in the list inside the Beef accordion
    // The accordion header contains a heading with 'Beef' and a count.
    // Find the specific recipe card by its unique title heading
    const recipeCard = page
      .getByRole('button')
      .filter({ has: page.getByRole('heading', { name: testTitle, exact: true }) })

    // Ensure it's visible (should be open by default now)
    await expect(recipeCard).toBeVisible()

    // Give it a moment to be really stable
    await page.waitForTimeout(500)

    // 4. Click into it to verify details
    await recipeCard.click()

    // Wait for detail view entrance animation
    await page.waitForTimeout(500)

    // Wait for Detail View content to be stable
    // Use regex to allow for the count suffix like "(1)"
    await expect(page.getByRole('heading', { name: /^Ingredients/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: testTitle, exact: true })).toBeVisible()

    // Close detail view (Back to Library)
    await page.getByRole('button', { name: 'Back to Library' }).click()

    // Verify we are back in the library and the accordion is still there
    await expect(
      page
        .getByRole('button')
        .filter({ has: page.getByRole('heading', { name: 'Beef', exact: true }) }),
    ).toBeVisible()
    await expect(
      page
        .getByRole('button')
        .filter({ has: page.getByRole('heading', { name: testTitle, exact: true }) }),
    ).toBeVisible()

    // Test sorting change
    await page.getByRole('button', { name: 'Sort & Filter' }).click()
    await page.getByRole('button', { name: 'Alphabetical' }).click()
    await page.locator('button:has(svg.lucide-x)').click()

    // After sorting alpha, it should be grouped by first letter
    const firstLetter = testTitle.charAt(0).toUpperCase()
    await expect(
      page
        .getByRole('button')
        .filter({ has: page.getByRole('heading', { name: firstLetter, exact: true }) }),
    ).toBeVisible()
  })
})
