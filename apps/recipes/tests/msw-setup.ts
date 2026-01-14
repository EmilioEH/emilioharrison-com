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
    createdBy: 'TestUser',
    title: 'E2E Test Recipe',
    servings: 2,
    prepTime: 10,
    cookTime: 20,
    ingredients: [
      { name: 'Flour', amount: '1 cup', prep: 'sifted' },
      { name: 'Eggs', amount: '2' },
    ],
    steps: ['Mix ingredients', 'Bake for 20 mins'],
    ingredientGroups: [{ header: 'MAIN', startIndex: 0, endIndex: 1 }],
    structuredSteps: [
      { text: 'Mix ingredients', title: 'Mix', highlightedText: '**Mix** ingredients' },
      { text: 'Bake for 20 mins', title: 'Bake', highlightedText: '**Bake** for 20 mins' },
    ],
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
  {
    name: 'skip_family_setup',
    value: 'true',
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

/**
 * Setup API mocking for a page.
 * Call this before navigating to the app.
 */
export async function setupApiMock(page: Page, recipes: Recipe[] = TEST_RECIPES) {
  let mockRecipes = [...recipes]

  // Global fetch mock via init script to handle any variations in URL
  await page.addInitScript(() => {
    ;(window as unknown as { isPlaywright: boolean }).isPlaywright = true
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as { url: string }).url
      if (
        typeof url === 'string' &&
        url.includes('families/current') &&
        !url.includes('familyId=')
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const scenario = (window as any).__TEST_SCENARIO__

        if (scenario === 'pending-invite') {
          return new Response(
            JSON.stringify({
              success: true,
              family: null,
              members: [],
              incomingInvites: [
                {
                  id: 'invite-123',
                  email: 'emilioeh1991@gmail.com',
                  familyId: 'family-abc',
                  familyName: 'The Harrison Family',
                  invitedBy: 'user-creator',
                  invitedByName: 'Emilio',
                  status: 'pending',
                  createdAt: new Date().toISOString(),
                },
              ],
              outgoingInvites: [],
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }

        return new Response(
          JSON.stringify({
            success: true,
            family: {
              id: 'test-family-id',
              name: 'Test Family',
              members: ['TestUser'],
              createdBy: 'TestUser',
              createdAt: new Date().toISOString(),
            },
            members: [
              {
                id: 'TestUser',
                email: 'emilioeh1991@gmail.com',
                displayName: 'Emilio',
                familyId: 'test-family-id',
                role: 'creator',
                joinedAt: new Date().toISOString(),
              },
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }
      if (typeof url === 'string' && url.includes('week/planned')) {
        return new Response(JSON.stringify({ success: true, planned: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return originalFetch(...args)
    }
  })

  // Recipes API Mock remains via page.route as it often needs state (mockRecipes)
  await page.route('**/api/recipes*', async (route) => {
    const method = route.request().method()
    const url = route.request().url()

    // Skip family-data which is more specialized
    if (url.includes('/family-data')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          id: url.split('/').slice(-2, -1)[0],
          notes: [],
          ratings: [],
          weekPlan: { isPlanned: false },
          cookingHistory: [],
        }),
      })
      return
    }

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
    async ({ page, context }, use) => {
      await context.addCookies([...AUTH_COOKIES])
      await setupApiMock(page)
      await use()
    },
    { auto: true },
  ],
})
