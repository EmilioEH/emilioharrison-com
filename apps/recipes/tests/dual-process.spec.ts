import { expect } from '@playwright/test'
import { test } from './msw-setup'

test.describe('Dual-Process Recipe Import', () => {
  test('should import strict, trigger background enhance, and allow toggling', async ({ page }) => {
    // 1. Mock Parse API (Strict Mode)
    await page.route('**/api/parse-recipe', async (route) => {
      // Check if strict mode was requested
      const request = route.request()
      const postData = request.postDataJSON()

      if (postData.style === 'strict') {
        await route.fulfill({
          json: {
            title: 'Strict Recipe',
            ingredients: [{ name: 'Simple Ingredient', amount: '1' }],
            steps: ['Just one simple step.'],
            creationMethod: 'ai-parse',
          },
        })
      } else {
        await route.continue() // Fallback
      }
    })

    // 2. Mock Enhance API (Background)
    let enhanceCalled = false
    await page.route('**/api/recipes/*/enhance', async (route) => {
      enhanceCalled = true
      await route.fulfill({
        json: {
          success: true,
          data: {
            ingredientGroups: [],
            structuredSteps: [
              { text: 'Just one simple step.', highlightedText: '**Just** one simple step.' },
            ],
          },
          cached: false,
        },
      })
    })

    // 3. Mock Create Recipe API to return an ID
    await page.route('**/api/recipes', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          json: { id: 'new-recipe-id', success: true },
        })
      } else {
        await route.continue()
      }
    })

    // 4. Mock Get Recipe API (for redirect)
    await page.route('**/api/recipes/new-recipe-id', async (route) => {
      await route.fulfill({
        json: {
          recipe: {
            id: 'new-recipe-id',
            title: 'Strict Recipe',
            ingredients: [{ name: 'Simple Ingredient', amount: '1' }],
            steps: ['Just one simple step.'],
            creationMethod: 'ai-parse',
            // Initially no enhanced data
          },
        },
      })
    })

    // Navigate to add recipe
    await page.goto('/')
    await page.getByRole('button', { name: 'Add Recipe' }).click()

    // Fill URL (simpler than photo)
    await page.getByRole('button', { name: 'URL' }).click()
    await page.getByLabel('Paste Recipe Link').fill('https://example.com/pancakes')
    await page.getByRole('button', { name: 'Process Recipe' }).click()

    // Expect form to fill
    await expect(page.locator('input[value="Strict Recipe"]')).toBeVisible()

    // Save
    await page.getByRole('button', { name: 'Save Recipe' }).click()

    // Verify redirected to Library (or Detail?) -> logic says Library
    // Wait for route change
    // await expect(page).toHaveURL(/\/library/); // logic sets view='library'

    // Verify Enhance was triggered
    // Since it's fire-and-forget, we might not see the request finish before test ends unless we wait.
    await expect.poll(() => enhanceCalled).toBe(true)

    // Now Mock the "Get Recipe" to return ENHANCED data (simulating background update finished)
    await page.route('**/api/recipes/new-recipe-id*', async (route) => {
      const url = route.request().url()
      if (url.includes('family-data')) {
        await route.fulfill({ json: { success: false } }) // prevent error
        return
      }
      await route.fulfill({
        json: {
          recipe: {
            id: 'new-recipe-id',
            title: 'Strict Recipe',
            ingredients: [{ name: 'Simple Ingredient', amount: '1' }],
            steps: ['Just one simple step.'],
            creationMethod: 'ai-parse',
            // ADD ENHANCED DATA
            structuredSteps: [
              { text: 'Just one simple step.', highlightedText: '**Just** one simple step.' },
            ],
            ingredientGroups: [],
          },
        },
      })
    })

    // Go to Detail View
    // Since we are in Library (virtual view), we click the recipe
    await page.getByText('Strict Recipe').click()

    // Verify "Smart View" toggle exists
    await expect(page.getByText('Smart View')).toBeVisible()

    // Verify default is 'Original' (no bold text) -> Actually logic says default is 'Enhanced' if available?
    // Code: `useState(hasEnhancedContent ? 'enhanced' : 'original')`
    // So it should default to Enhanced.

    // Check for bold text (from highlightedText)
    // The structuredStep has markdown. InstructionCard renders markdown?
    // Need to verify standard instruction card contains the bold element.
    await expect(page.locator('strong', { hasText: 'Just' })).toBeVisible()

    // Toggle to Original
    await page.getByText('Original').click()
    // Verify bold is gone (or simple text is shown)
    // original text "Just one simple step."
    // It shouldn't be bolded.
    await expect(page.locator('strong', { hasText: 'Just' })).not.toBeVisible()
  })
})
