/**
 * Simplified mock setup for Playwright E2E tests.
 * Uses Playwright's native route() with shared mock data.
 */
import { test as base, expect, type Page } from '@playwright/test'
import type { Recipe } from '../src/lib/types'

// Test recipes - centralized mock data
export const TEST_RECIPES: Recipe[] = [
  {
    id: 'test-recipe-001',
    title: 'E2E Test Recipe',
    servings: 2,
    prepTime: 10,
    cookTime: 20,
    ingredients: [
      { name: 'Flour', amount: '1 cup', prep: 'sifted' },
      { name: 'Eggs', amount: '2' },
    ],
    steps: ['Mix ingredients', 'Bake for 20 mins'],
    notes: '',
    description: 'Test recipe for E2E',
    thisWeek: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    protein: 'Chicken',
    mealType: 'Dinner',
    difficulty: 'Easy',
    cuisine: 'American',
  },
]

// Re-export expect
export { expect }

export const AUTH_COOKIES = [
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
  {
    name: 'site_email',
    value: 'emilioeh1991@gmail.com',
    domain: '127.0.0.1',
    path: '/',
    expires: -1,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  },
] as const

// The app uses BASE_URL which resolves to /protected/recipes/
// So API calls go to /protected/recipes/api/...
const API_PATTERN = /\/protected\/recipes\/api\/recipes/

/**
 * Setup API mocking for a page.
 * Call this before navigating to the app.
 */
export async function setupApiMock(page: Page, recipes: Recipe[] = TEST_RECIPES) {
  let mockRecipes = [...recipes]

  // Log all requests to see what URLs are being called
  page.on('request', (request) => {
    console.log(`[REQ] ${request.method()} ${request.url()}`)
  })

  await page.route(API_PATTERN, async (route) => {
    const method = route.request().method()
    console.log(`[MOCK HIT] ${method} ${route.request().url()}`)

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ recipes: mockRecipes }),
      })
    } else if (method === 'POST') {
      const body = await route.request().postDataJSON()
      const newRecipe = { ...body, id: body.id || `recipe-${Date.now()}` }
      mockRecipes.push(newRecipe)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, id: newRecipe.id }),
      })
    } else if (method === 'PUT') {
      const body = await route.request().postDataJSON()
      mockRecipes = mockRecipes.map((r) => (r.id === body.id ? { ...r, ...body } : r))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    }
  })
}

/**
 * Custom test fixture with automatic API mocking.
 */
export const test = base.extend<{
  mockApi: void
}>({
  mockApi: [
    async ({ page }, use) => {
      await setupApiMock(page)
      await use()
    },
    { auto: true },
  ],
})
