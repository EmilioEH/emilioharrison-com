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
  // Stateful storage for family data (persists across navigation)
  const recipeFamilyData: Record<
    string,
    {
      id: string
      weekPlan?: {
        isPlanned: boolean
        assignedDate?: string
        addedBy?: string
        addedByName?: string
      }
    }
  > = {}

  // Global fetch mock via init script to handle any variations in URL
  await page.addInitScript(() => {
    ;(window as unknown as { isPlaywright: boolean }).isPlaywright = true
    // Removed old families/current mock to use page.route
  })

  interface MockFamilyState {
    family: {
      id: string
      name: string
      members: string[]
      createdBy: string
      createdAt: string
    } | null
    members: Array<{
      id: string
      email?: string
      displayName?: string
      familyId?: string
      role: 'creator' | 'admin' | 'user'
      joinedAt?: string
    }>
    outgoingInvites: Array<{
      id: string
      email: string
      familyId?: string
      invitedBy?: string
      status: 'pending'
      token?: string
      createdAt?: string
    }>
    incomingInvites: Array<{
      id: string
      familyId: string
      familyName: string
      invitedBy: string
      invitedByName?: string
      email?: string
      status?: 'pending'
      role?: 'admin' | 'user'
      token?: string
    }>
    // For joining
    token: string | null
  }

  // State for Family (Mutable)
  let mockFamilyState: MockFamilyState = {
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
    outgoingInvites: [],
    incomingInvites: [],
    token: null,
  }

  // Recipes API Mock remains via page.route as it often needs state (mockRecipes)
  await page.route('**/api/**', async (route) => {
    const method = route.request().method()
    const url = route.request().url()
    // console.log(`[MSW] Route matched: ${method} ${url}`)

    // --- TEST HELPERS ---
    if (url.includes('/api/test/reset-family')) {
      if (method === 'POST') {
        const body = await route.request().postDataJSON()
        if (body.reset === true) {
          // Null state
          mockFamilyState = {
            family: null,
            members: [],
            incomingInvites: [],
            outgoingInvites: [],
            token: null,
          }
        } else if (body.scenario === 'pending-invite') {
          mockFamilyState = {
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
              },
            ],
            outgoingInvites: [],
            token: null,
          }
        } else if (body.family) {
          mockFamilyState = body as MockFamilyState
        }
        await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
        return
      }
    }

    // --- FAMILIES API ---
    if (url.includes('/families/current')) {
      if (method === 'GET') {
        // Check if we need to simulate pending invite scenario based on window.__TEST_SCENARIO__?
        // We can't access window here.
        // But we can rely on mockFamilyState being set by the test helper.

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            ...mockFamilyState,
            currentUserId: 'TestUser', // Simplified
          }),
        })
        return
      }

      if (method === 'POST') {
        const body = await route.request().postDataJSON()
        // Create Family
        mockFamilyState.family = {
          id: `family-${Date.now()}`,
          name: body.name || 'New Family',
          members: ['TestUser'],
          createdBy: 'TestUser',
          createdAt: new Date().toISOString(),
        }
        mockFamilyState.members = [
          {
            id: 'TestUser',
            email: 'emilioeh1991@gmail.com',
            role: 'creator',
            familyId: mockFamilyState.family.id,
          },
        ]
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true, family: mockFamilyState.family }),
        })
        return
      }

      if (method === 'PATCH') {
        const body = await route.request().postDataJSON()
        if (mockFamilyState.family) {
          mockFamilyState.family.name = body.name
          await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
        } else {
          await route.fulfill({
            status: 400,
            body: JSON.stringify({ success: false, error: 'No family' }),
          })
        }
        return
      }

      if (method === 'DELETE') {
        mockFamilyState.family = null
        mockFamilyState.members = []
        await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
        return
      }
    }

    // Invite Logic Mock
    if (url.includes('/families/invite')) {
      if (method === 'POST') {
        const body = await route.request().postDataJSON()
        // Add outgoing invite
        const newInvite = {
          id: `invite-${Date.now()}`,
          email: body.email,
          status: 'pending',
          createdAt: new Date().toISOString(),
        }
        mockFamilyState.outgoingInvites = [...(mockFamilyState.outgoingInvites || []), newInvite]
        await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
        return
      }
    }

    // Join Logic Mock
    if (url.includes('/families/join')) {
      if (method === 'POST') {
        // Assume join success to 'The Harrison Family' (hardcoded for pending scenario)
        // or whatever family is implied
        mockFamilyState.family = {
          id: 'family-abc',
          name: 'The Harrison Family',
          members: ['user-creator', 'TestUser'],
        }
        mockFamilyState.members = [
          { id: 'user-creator', role: 'creator' },
          { id: 'TestUser', role: 'user' },
        ]
        mockFamilyState.incomingInvites = []
        await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
        return
      }
    }

    // Leave Logic Mock
    if (url.includes('/families/leave')) {
      mockFamilyState.family = null
      mockFamilyState.members = []
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
      return
    }

    //...handle /family-data
    if (url.includes('/family-data')) {
      const recipeId = url.split('/recipes/')[1]?.split('/')[0] || ''
      const familyData = recipeFamilyData[recipeId] || {
        id: recipeId,
        notes: [],
        ratings: [],
        weekPlan: { isPlanned: false },
        cookingHistory: [],
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          ...familyData,
        }),
      })
      return
    }

    // Week Plan specific mock
    if (url.includes('/week-plan')) {
      const isDelete = method === 'DELETE'
      const isPost = method === 'POST'

      if (isPost) {
        const body = await route.request().postDataJSON()
        // Fixed ID extraction to handle full URL path
        const match = url.match(/\/api\/recipes\/([^/]+)\/week-plan/)
        const recipeId = match ? match[1] : 'unknown'

        const responseData = {
          success: true,
          data: {
            id: recipeId,
            weekPlan: {
              isPlanned: true,
              assignedDate: body.assignedDate,
              addedBy: 'TestUser',
              addedByName: 'Test User',
            },
          },
        }

        // Store family data so it persists across navigation
        recipeFamilyData[recipeId] = {
          id: recipeId,
          weekPlan: responseData.data.weekPlan,
        }

        // Return proper FamilyRecipeData structure required by the store
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(responseData),
        })
        return
      }

      if (isDelete) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
        return
      }
    }

    // Week Planned Mock
    if (url.includes('week/planned')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, planned: [] }),
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
