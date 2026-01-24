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

    // 4. Mock Get Recipe API (Dynamic Response)
    await page.route('**/api/recipes/new-recipe-id*', async (route) => {
      // If enhance has been called, return the enhanced version
      if (enhanceCalled) {
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
              ingredientGroups: [{ header: 'MAIN', startIndex: 0, endIndex: 0 }],
            },
            success: true,
          },
        })
      } else {
        // Initial state
        await route.fulfill({
          json: {
            recipe: {
              id: 'new-recipe-id',
              title: 'Strict Recipe',
              ingredients: [{ name: 'Simple Ingredient', amount: '1' }],
              steps: ['Just one simple step.'],
              creationMethod: 'ai-parse',
            },
            success: true,
          },
        })
      }
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

    // Verify Enhance was triggered
    await expect.poll(() => enhanceCalled).toBe(true)

    // Go to Detail View
    await page.getByRole('button', { name: 'View Recipe' }).click()
    await expect(page).toHaveURL(/recipe=new-recipe-id/)

    // Wait for React to update with enhanced data from the mock
    // Using a polling expectation is safer than a fixed timeout
    // Wait for Smart View toggle to appear (triggered by SWR revalidation)
    await expect(page.getByText('Smart View')).toBeVisible({ timeout: 10000 })

    // Verify "Smart View" toggle exists
    // await expect(page.getByText('Smart View')).toBeVisible()

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
