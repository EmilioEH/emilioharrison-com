import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:4321'

test.describe('Recipe Visibility (API Integration)', () => {
  const userA = 'UserVisibilityA' + Date.now()
  const userB = 'UserVisibilityB' + Date.now()
  let recipeIdA: string

  test("User B should not see User A's recipe initially", async ({ request }) => {
    // 1. User A creates a recipe
    const createRes = await request.post(`${BASE_URL}/api/recipes`, {
      headers: {
        Cookie: `site_user=${userA}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Secret Recipe A',
        servings: 2,
        prepTime: 10,
        cookTime: 10,
        ingredients: [],
        steps: [],
      },
    })

    expect(createRes.ok()).toBeTruthy()
    const data = await createRes.json()
    recipeIdA = data.id
    expect(recipeIdA).toBeDefined()

    // 2. User A should see it
    const listResA = await request.get(`${BASE_URL}/api/recipes`, {
      headers: { Cookie: `site_user=${userA}` },
    })
    expect(listResA.ok()).toBeTruthy()
    const listA = await listResA.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const foundA = listA.recipes.find((r: any) => r.id === recipeIdA)
    expect(foundA).toBeDefined()
    expect(foundA.createdBy).toBe(userA)

    // 3. User B should NOT see it
    const listResB = await request.get(`${BASE_URL}/api/recipes`, {
      headers: { Cookie: `site_user=${userB}` },
    })
    expect(listResB.ok()).toBeTruthy()
    const listB = await listResB.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const foundB = listB.recipes.find((r: any) => r.id === recipeIdA)
    expect(foundB).toBeUndefined()
  })
})
