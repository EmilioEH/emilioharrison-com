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
  // SIMPLE RECIPE (2-3 steps, no timers)
  {
    id: 'test-recipe-simple',
    createdBy: 'TestUser',
    title: 'Scrambled Eggs',
    servings: 1,
    prepTime: 2,
    cookTime: 5,
    ingredients: [
      { name: 'Eggs', amount: '2 large' },
      { name: 'Butter', amount: '1 tablespoon' },
      { name: 'Salt', amount: 'to taste' },
    ],
    steps: [
      'Crack eggs into a bowl and whisk until well combined.',
      'Melt butter in a non-stick pan over medium-low heat.',
      'Pour in eggs and gently stir until soft curds form. Season with salt.',
    ],
    ingredientGroups: [{ header: 'MAIN', startIndex: 0, endIndex: 2 }],
    structuredSteps: [
      { text: 'Crack eggs into a bowl and whisk until well combined.', title: 'Prep' },
      { text: 'Melt butter in a non-stick pan over medium-low heat.', title: 'Heat Pan' },
      {
        text: 'Pour in eggs and gently stir until soft curds form. Season with salt.',
        title: 'Cook',
      },
    ],
    notes: '',
    description: 'Simple scrambled eggs',
    thisWeek: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    protein: 'Eggs',
    mealType: 'Breakfast',
    difficulty: 'Easy',
    cuisine: 'American',
  },
  // MEDIUM RECIPE (5-7 steps, 1-2 timers)
  {
    id: 'test-recipe-medium',
    createdBy: 'TestUser',
    title: 'Pasta Carbonara',
    servings: 4,
    prepTime: 10,
    cookTime: 15,
    ingredients: [
      { name: 'Spaghetti', amount: '1 pound' },
      { name: 'Bacon', amount: '8 slices', prep: 'chopped' },
      { name: 'Eggs', amount: '4 large' },
      { name: 'Parmesan cheese', amount: '1 cup', prep: 'grated' },
      { name: 'Black pepper', amount: '1 teaspoon' },
      { name: 'Salt', amount: 'to taste' },
    ],
    steps: [
      'Bring a large pot of salted water to a boil.',
      'Add spaghetti and cook for 8-10 minutes until al dente.',
      'While pasta cooks, fry bacon in a large skillet over medium heat until crispy, about 6-8 minutes.',
      'In a bowl, whisk together eggs, parmesan, and black pepper.',
      'Drain pasta, reserving 1 cup pasta water.',
      'Add hot pasta to bacon skillet, remove from heat.',
      'Quickly stir in egg mixture, adding pasta water to create a creamy sauce.',
    ],
    ingredientGroups: [{ header: 'MAIN', startIndex: 0, endIndex: 5 }],
    structuredSteps: [
      { text: 'Bring a large pot of salted water to a boil.', title: 'Boil Water' },
      {
        text: 'Add spaghetti and cook for 8-10 minutes until al dente.',
        title: 'Cook Pasta',
        highlightedText: 'Add spaghetti and cook for **8-10 minutes** until al dente.',
      },
      {
        text: 'While pasta cooks, fry bacon in a large skillet over medium heat until crispy, about 6-8 minutes.',
        title: 'Cook Bacon',
        highlightedText:
          'While pasta cooks, fry bacon in a large skillet over medium heat until crispy, about **6-8 minutes**.',
      },
      { text: 'In a bowl, whisk together eggs, parmesan, and black pepper.', title: 'Mix Sauce' },
      { text: 'Drain pasta, reserving 1 cup pasta water.', title: 'Drain Pasta' },
      { text: 'Add hot pasta to bacon skillet, remove from heat.', title: 'Combine' },
      {
        text: 'Quickly stir in egg mixture, adding pasta water to create a creamy sauce.',
        title: 'Finish',
      },
    ],
    notes: '',
    description: 'Classic Italian pasta carbonara',
    thisWeek: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    protein: 'Pork',
    mealType: 'Dinner',
    difficulty: 'Medium',
    cuisine: 'Italian',
  },
  // COMPLEX RECIPE (7+ steps, multiple timers, substeps)
  {
    id: 'test-recipe-complex',
    createdBy: 'TestUser',
    title: 'Shake Shack Burger',
    servings: 4,
    prepTime: 30,
    cookTime: 25,
    ingredients: [
      // Mushroom Patty
      { name: 'Portobello mushroom caps', amount: '4 large' },
      { name: 'Fontina cheese', amount: '1/4 cup', prep: 'shredded' },
      { name: 'Muenster cheese', amount: '1/4 cup', prep: 'shredded' },
      { name: 'Eggs', amount: '2 large', prep: 'beaten' },
      { name: 'Panko breadcrumbs', amount: '1 cup' },
      { name: 'Flour', amount: '1/2 cup' },
      // Burgers
      { name: 'Ground beef', amount: '1 lb', prep: '80/20 blend' },
      { name: 'American cheese', amount: '4 slices' },
      { name: 'Salt and pepper', amount: 'to taste' },
      // Assembly
      { name: 'Potato buns', amount: '4' },
      { name: 'Butter', amount: '2 tablespoons' },
      { name: 'Green leaf lettuce', amount: '4 leaves' },
      { name: 'Tomato', amount: '1 large', prep: 'sliced' },
      // ShackSauce
      { name: 'Mayonnaise', amount: '1/2 cup' },
      { name: 'Ketchup', amount: '1 tablespoon' },
      { name: 'Dill pickle', amount: '1', prep: 'finely chopped' },
      { name: 'Garlic powder', amount: '1/4 teaspoon' },
      { name: 'Paprika', amount: '1/4 teaspoon' },
    ],
    steps: [
      'Combine shredded Fontina and Muenster cheeses in a small bowl.',
      'Stuff each Portobello mushroom cap with the cheese mixture.',
      'Set up a breading station with flour, beaten egg, and panko breadcrumbs seasoned with salt and black pepper.',
      'Bread each stuffed mushroom: dip in flour, then egg, then panko. Set aside.',
      'Heat oil in a deep pan to 350°F (175°C).',
      'Carefully lower the breaded mushroom patty into the hot oil and fry for 4-6 minutes, or until golden brown and crispy, turning once.',
      'Remove with a slotted spoon and place on a wire rack lined with paper towels to drain excess oil.',
      'In a small bowl, mix mayonnaise, ketchup, chopped pickle, garlic powder, and paprika to make ShackSauce.',
      'Form ground beef into 4 thin patties, slightly larger than the buns (they will shrink). Season both sides generously with salt and black pepper.',
      'Heat a large skillet or griddle over medium-high heat.',
      'Add the beef patties and cook for 2-3 minutes per side, or until desired doneness.',
      'During the last minute of cooking, place an American cheese slice on top of each patty to melt.',
      'While the beef cooks, lightly toast the potato buns in butter on the griddle.',
      'Spread ShackSauce on the bottom bun.',
      'Layer the bottom bun with green leaf lettuce and tomato slices.',
      'Place one cheese-covered beef patty on top of the tomato.',
      "Carefully place the fried 'Shroom Patty on top of the beef patty.",
      'Add the second patty on top (if making a double).',
      'Top with the top bun and serve immediately.',
    ],
    ingredientGroups: [
      { header: 'MUSHROOM PATTY COMPONENTS', startIndex: 0, endIndex: 5 },
      { header: 'BURGERS', startIndex: 6, endIndex: 8 },
      { header: 'ASSEMBLY', startIndex: 9, endIndex: 12 },
      { header: 'SHACKSAUCE', startIndex: 13, endIndex: 17 },
    ],
    structuredSteps: [
      {
        text: 'Combine shredded Fontina and Muenster cheeses in a small bowl.',
        title: 'Prep Mushroom Filling',
        atomicSteps: [
          'Combine shredded Fontina and Muenster cheeses in a small bowl.',
          'Stuff each Portobello mushroom cap with the cheese mixture.',
          'Set up a breading station with flour, beaten egg, and panko breadcrumbs seasoned with salt and black pepper.',
        ],
      },
      {
        text: 'Bread each stuffed mushroom: dip in flour, then egg, then panko. Set aside.',
        title: 'Bread Mushrooms',
      },
      {
        text: 'Heat oil in a deep pan to 350°F (175°C). Carefully lower the breaded mushroom patty into the hot oil and fry for 4-6 minutes, or until golden brown and crispy, turning once.',
        title: 'Fry Mushroom Patties',
        highlightedText:
          'Heat oil in a deep pan to 350°F (175°C). Carefully lower the breaded mushroom patty into the hot oil and fry for **4-6 minutes**, or until golden brown and crispy, turning once.',
      },
      {
        text: 'Remove with a slotted spoon and place on a wire rack lined with paper towels to drain excess oil.',
        title: 'Drain',
      },
      {
        text: 'In a small bowl, mix mayonnaise, ketchup, chopped pickle, garlic powder, and paprika to make ShackSauce.',
        title: 'Make ShackSauce',
      },
      {
        text: 'Form ground beef into 4 thin patties, slightly larger than the buns (they will shrink). Season both sides generously with salt and black pepper. Heat a large skillet or griddle over medium-high heat. Add the beef patties and cook for 2-3 minutes per side, or until desired doneness.',
        title: 'Cook Beef Patties',
        highlightedText:
          'Form ground beef into 4 thin patties, slightly larger than the buns (they will shrink). Season both sides generously with salt and black pepper. Heat a large skillet or griddle over medium-high heat. Add the beef patties and cook for **2-3 minutes** per side, or until desired doneness.',
        atomicSteps: [
          'Form ground beef into 4 thin patties, slightly larger than the buns (they will shrink).',
          'Season both sides generously with salt and black pepper.',
          'Heat a large skillet or griddle over medium-high heat.',
          'Add the beef patties and cook for 2-3 minutes per side, or until desired doneness.',
          'During the last minute of cooking, place an American cheese slice on top of each patty to melt.',
        ],
      },
      {
        text: 'While the beef cooks, lightly toast the potato buns in butter on the griddle.',
        title: 'Toast Buns',
      },
      {
        text: "Spread ShackSauce on the bottom bun. Layer the bottom bun with green leaf lettuce and tomato slices. Place one cheese-covered beef patty on top of the tomato. Carefully place the fried 'Shroom Patty on top of the beef patty.",
        title: 'Assemble Burger',
        atomicSteps: [
          'Spread ShackSauce on the bottom bun.',
          'Layer the bottom bun with green leaf lettuce and tomato slices.',
          'Place one cheese-covered beef patty on top of the tomato.',
          "Carefully place the fried 'Shroom Patty on top of the beef patty.",
          'Add the second patty on top (if making a double).',
          'Top with the top bun and serve immediately.',
        ],
      },
    ],
    notes: '',
    description: "Copycat Shake Shack burger with 'Shroom Patty",
    thisWeek: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    protein: 'Beef',
    mealType: 'Dinner',
    difficulty: 'Hard',
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

    // --- ADMIN FAMILIES API ---
    if (url.includes('/api/admin/families')) {
      if (method === 'DELETE') {
        const body = await route.request().postDataJSON()
        if (body.familyId) {
          // If we had a real mock store, we'd delete it:
          // if (mockFamilyState.family?.id === body.familyId) mockFamilyState.family = null
          // For now just success:
          await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
          return
        }
      }
      // If we fall through, the catch-all might handle it, or we can add GET here too
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
          status: 'pending' as const,
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
          createdBy: 'user-creator',
          createdAt: new Date().toISOString(),
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
