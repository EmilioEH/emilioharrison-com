import { expect } from '@playwright/test'
import { test } from './msw-setup'

test.describe('Recipe Overview Layout', () => {
  const overviewRecipe = {
    id: 'layout-recipe-001',
    createdBy: 'TestUser',
    title: 'Scanability Test Recipe',
    servings: 4,
    prepTime: 15,
    cookTime: 25,
    description: 'Recipe used to validate overview layout hierarchy.',
    ingredients: [
      { name: 'olive oil', amount: '2 tbsp' },
      { name: 'yellow onion', amount: '1', prep: 'diced' },
      { name: 'garlic cloves', amount: '3', prep: 'minced' },
      { name: 'crushed tomatoes', amount: '1 can' },
      { name: 'basil', amount: '1/4 cup', prep: 'torn' },
    ],
    steps: [
      'Heat oil and soften onion.',
      'Add garlic and stir for 30 seconds.',
      'Add tomatoes and simmer for 15 minutes.',
      'Fold in basil and season to taste.',
    ],
    ingredientGroups: [
      { header: 'BASE', startIndex: 0, endIndex: 2 },
      { header: 'SAUCE', startIndex: 3, endIndex: 4 },
    ],
    structuredSteps: [
      {
        title: 'Prep Aromatics',
        text: 'Heat olive oil, then cook onion until translucent.',
        highlightedText: '**Heat** olive oil, then cook onion until translucent.',
      },
      {
        title: 'Bloom Garlic',
        text: 'Add garlic and stir until fragrant.',
        highlightedText: '**Add** garlic and stir until fragrant.',
      },
      {
        title: 'Simmer Sauce',
        text: 'Pour in tomatoes and simmer until slightly reduced.',
        highlightedText: '**Simmer** with tomatoes for flavor concentration.',
        tip: 'Keep heat medium-low to avoid scorching.',
      },
      {
        title: 'Finish',
        text: 'Add basil, taste, and adjust seasoning.',
        highlightedText: '**Finish** with basil and seasoning.',
      },
    ],
    stepGroups: [
      { header: 'BUILD FLAVOR', startIndex: 0, endIndex: 1 },
      { header: 'FINISH SAUCE', startIndex: 2, endIndex: 3 },
    ],
    stepIngredients: [{ indices: [0, 1] }, { indices: [2] }, { indices: [3] }, { indices: [4] }],
    notes: '',
    thisWeek: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    protein: 'Vegetarian',
    mealType: 'Dinner',
    difficulty: 'Easy',
    cuisine: 'Italian',
  }

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/recipes*', async (route) => {
      const url = route.request().url()

      if (url.match(/\/api\/recipes\/layout-recipe-001$/)) {
        await route.fulfill({ json: { success: true, recipe: overviewRecipe } })
        return
      }

      if (route.request().method() === 'GET') {
        await route.fulfill({ json: { recipes: [overviewRecipe] } })
        return
      }

      await route.fulfill({ json: { success: true } })
    })

    await page.route('**/api/recipes/*/family-data', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            ratings: [],
            reviews: [],
            notes: [],
          },
        },
      })
    })

    await page.route('**/api/estimate-cost', async (route) => {
      await route.fulfill({ json: { totalCost: 18.75 } })
    })
  })

  test('improves scanability in smart view and keeps landmarks in original mode', async ({
    page,
  }) => {
    await page.goto('/protected/recipes')

    const recipeCard = page.getByRole('button').filter({ hasText: 'Scanability Test Recipe' })
    await expect(recipeCard).toBeVisible()
    await recipeCard.click()

    await expect(page.getByRole('heading', { name: 'Scanability Test Recipe' })).toBeVisible()

    // Ensure Smart View is active for grouped rendering assertions.
    await page.getByRole('button', { name: 'Smart View' }).click()

    await expect(page.getByTestId('overview-ingredients-section')).toBeVisible()
    await expect(page.getByTestId('ingredients-group-header').first()).toContainText('BASE')

    // Qty, unit and name should be in separate columns for quick scanning.
    await expect(page.getByTestId('ingredient-amount').first()).toHaveText('2')
    await expect(page.getByTestId('ingredient-unit').first()).toHaveText('tbsp')
    await expect(page.getByTestId('ingredient-name').first()).toContainText('olive oil')

    await expect(page.getByTestId('overview-instructions-section')).toBeVisible()
    await expect(page.getByTestId('instructions-group-header').first()).toContainText(
      'BUILD FLAVOR',
    )

    // Smart View grouped steps should still show per-step toggles and titles.
    await expect(page.getByTestId('instruction-step-toggle').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /1\.\s+Prep Aromatics/i })).toBeVisible()

    // Switching to Original keeps per-step landmarks while removing grouped headers.
    await page.getByRole('button', { name: 'Original' }).click()
    await expect(page.getByTestId('instruction-step-toggle').first()).toBeVisible()
    await expect(page.getByTestId('instructions-group-header')).toHaveCount(0)
  })
})
