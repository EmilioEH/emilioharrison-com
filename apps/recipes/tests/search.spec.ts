import { test, expect, AUTH_COOKIES, TEST_RECIPES } from './msw-setup'
import type { Recipe } from '../src/lib/types'

test.describe('Fuzzy Search', () => {
  test.use({
    storageState: {
      cookies: [...AUTH_COOKIES],
      origins: [],
    },
  })
  test('finds recipe with typo', async ({ page }) => {
    await page.goto('/protected/recipes')

    // Wait for recipes to load
    await expect(page.getByText('E2E Test Recipe')).toBeVisible({ timeout: 10000 })

    // Search with typo "recpe" (should find "E2E Test Recipe")
    const searchInput = page.getByPlaceholder('Search recipes...')
    await searchInput.fill('recpe')

    await expect(page.getByText('E2E Test Recipe')).toBeVisible()
  })

  test('finds recipe by partial ingredient', async ({ page }) => {
    await page.goto('/protected/recipes')

    // Search for "flour" -> matches "E2E Test Recipe"
    const searchInput = page.getByPlaceholder('Search recipes...')
    await searchInput.fill('flour')

    await expect(page.getByText('E2E Test Recipe')).toBeVisible()
  })

  test('finds recipe by partial title', async ({ page }) => {
    await page.goto('/protected/recipes')

    const searchInput = page.getByPlaceholder('Search recipes...')
    await searchInput.fill('test')

    await expect(page.getByText('E2E Test Recipe')).toBeVisible()
  })
  test('highlights search term in results', async ({ page }) => {
    await page.goto('/protected/recipes')

    // Workaround: Create a recipe manually since mock data seems missing in test env
    // Click Add
    await page.getByRole('button', { name: 'Add' }).click()
    // Fill Title
    await page.getByPlaceholder('Recipe Title').fill('Highlighter Test Recipe')
    // Click Save
    await page.getByRole('button', { name: 'Save Recipe' }).click()
    await expect(page.getByRole('heading', { name: 'Recipe Saved!' })).toBeVisible()
    await page.getByRole('button', { name: 'Back to Library' }).click()

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

  test('stays responsive typing quickly with 500+ recipes (P8)', async ({ page }) => {
    // useFilteredRecipes wraps the search query in useDeferredValue so the input stays snappy
    // while Fuse.js re-searches/re-sorts a large library in the background — verify both halves
    // of that: no dropped keystrokes, and the final result is still correct.
    const bigLibrary: Recipe[] = Array.from({ length: 520 }, (_, i) => ({
      ...TEST_RECIPES[0],
      id: `bulk-recipe-${i}`,
      title: `Bulk Recipe ${i}`,
      ingredients: [{ name: 'Filler', amount: '1' }],
    }))
    bigLibrary.push({
      ...TEST_RECIPES[0],
      id: 'needle-recipe',
      title: 'Needle In A Haystack',
      ingredients: [{ name: 'Filler', amount: '1' }],
    })

    // Registered before goto — the shared bootstrap-composition handler in msw-setup.ts
    // nested-fetches /api/recipes from inside the page, so this override is what it picks up.
    await page.route('**/api/recipes', async (route) => {
      if (route.request().method() !== 'GET') return route.continue()
      await route.fulfill({ json: { recipes: bigLibrary } })
    })

    await page.goto('/protected/recipes')
    await expect(page.getByText('Bulk Recipe 0')).toBeVisible({ timeout: 10000 })

    const searchInput = page.getByPlaceholder('Search recipes...')
    await searchInput.pressSequentially('Needle In A Haystack', { delay: 10 })

    // The input itself must reflect every keystroke immediately regardless of how long the
    // (deferred) filtering takes — this is the "no dropped keystrokes" half of the criterion.
    await expect(searchInput).toHaveValue('Needle In A Haystack')

    // And the filtered result is still correct once the deferred search settles.
    await expect(page.getByText('Needle In A Haystack')).toBeVisible()
    await expect(page.getByText(/^Bulk Recipe \d+$/).first()).not.toBeVisible()
  })
})
