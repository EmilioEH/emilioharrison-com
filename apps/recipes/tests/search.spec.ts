import { test, expect, AUTH_COOKIES } from './msw-setup'

test.describe('Fuzzy Search', () => {
  test.use({
    storageState: {
      cookies: [...AUTH_COOKIES],
      origins: [],
    },
  })
  test('finds recipe with typo', async ({ page }) => {
    await page.goto('http://127.0.0.1:9002/protected/recipes')

    // Wait for recipes to load
    await expect(page.getByText('E2E Test Recipe')).toBeVisible({ timeout: 10000 })

    // Search with typo "recpe" (should find "E2E Test Recipe")
    const searchInput = page.getByPlaceholder('Search recipes...')
    await searchInput.fill('recpe')

    await expect(page.getByText('E2E Test Recipe')).toBeVisible()
  })

  test('finds recipe by partial ingredient', async ({ page }) => {
    await page.goto('http://127.0.0.1:9002/protected/recipes')

    // Search for "flour" -> matches "E2E Test Recipe"
    const searchInput = page.getByPlaceholder('Search recipes...')
    await searchInput.fill('flour')

    await expect(page.getByText('E2E Test Recipe')).toBeVisible()
  })

  test('finds recipe by partial title', async ({ page }) => {
    await page.goto('http://127.0.0.1:9002/protected/recipes')

    const searchInput = page.getByPlaceholder('Search recipes...')
    await searchInput.fill('test')

    await expect(page.getByText('E2E Test Recipe')).toBeVisible()
  })
  test('highlights search term in results', async ({ page }) => {
    await page.goto('http://127.0.0.1:9002/protected/recipes')

    // Workaround: Create a recipe manually since mock data seems missing in test env
    // Click Add
    await page.getByRole('button', { name: 'Add' }).click()
    // Fill Title
    await page.getByPlaceholder('Recipe Title').fill('Highlighter Test Recipe')
    // Click Save
    await page.getByRole('button', { name: 'Save Recipe' }).click()

    // Wait for load
    await expect(page.getByText('Highlighter Test Recipe')).toBeVisible()

    // Search for "Highlighter"
    const searchInput = page.getByPlaceholder('Search recipes...')
    await searchInput.fill('Highlighter')

    // Check for highlight class on the "Highlighter" text part
    // The HighlightedText component uses "bg-yellow-200/50" (or similar).
    const highlightedSpan = page
      .locator('span.bg-yellow-200\\/50')
      .getByText('Highlighter', { exact: true })
    await expect(highlightedSpan).toBeVisible()
  })
})
