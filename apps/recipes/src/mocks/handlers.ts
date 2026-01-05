import { http, HttpResponse } from 'msw'
import { getMockRecipes, addMockRecipe, setMockRecipes } from './data'
import type { Recipe } from '../lib/types'

/**
 * Centralized MSW handlers for all API endpoints.
 * These handlers match the actual API paths used by the app.
 */

// The app uses BASE_URL which resolves to /protected/recipes/
// So API calls go to /protected/recipes/api/...
const API_BASE = '/protected/recipes/api'

export const handlers = [
  // GET /api/recipes - Fetch all recipes
  http.get(`${API_BASE}/recipes`, () => {
    return HttpResponse.json({ recipes: getMockRecipes() })
  }),

  // POST /api/recipes - Create a new recipe
  http.post(`${API_BASE}/recipes`, async ({ request }) => {
    const body = (await request.json()) as Partial<Recipe>
    const newRecipe: Recipe = {
      id: body.id || `recipe-${Date.now()}`,
      title: body.title || 'Untitled',
      servings: body.servings || 1,
      prepTime: body.prepTime || 0,
      cookTime: body.cookTime || 0,
      ingredients: body.ingredients || [],
      steps: body.steps || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...body,
    } as Recipe
    addMockRecipe(newRecipe)
    return HttpResponse.json({ success: true, id: newRecipe.id })
  }),

  // PUT /api/recipes - Update a recipe
  http.put(`${API_BASE}/recipes`, async ({ request }) => {
    const body = (await request.json()) as Recipe
    const recipes = getMockRecipes()
    const updated = recipes.map((r) => (r.id === body.id ? { ...r, ...body } : r))
    setMockRecipes(updated)
    return HttpResponse.json({ success: true })
  }),

  // DELETE /api/recipes - Delete a recipe
  http.delete(`${API_BASE}/recipes`, async ({ request }) => {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (id) {
      const recipes = getMockRecipes().filter((r) => r.id !== id)
      setMockRecipes(recipes)
    }
    return HttpResponse.json({ success: true })
  }),

  // GET /api/feedback - Fetch feedback (stub)
  http.get(`${API_BASE}/feedback`, () => {
    return HttpResponse.json({ feedback: [] })
  }),

  // POST /api/feedback - Submit feedback (stub)
  http.post(`${API_BASE}/feedback`, () => {
    return HttpResponse.json({ success: true, id: `feedback-${Date.now()}` })
  }),

  // POST /api/parse-recipe - AI recipe parsing (stub)
  http.post(`${API_BASE}/parse-recipe`, () => {
    return HttpResponse.json({
      title: 'Parsed Recipe',
      servings: 4,
      prepTime: 10,
      cookTime: 20,
      ingredients: [{ name: 'Ingredient', amount: '1 cup' }],
      steps: ['Step 1', 'Step 2'],
    })
  }),

  // POST /api/grocery-estimate - Grocery cost estimation (stub)
  http.post(`${API_BASE}/grocery-estimate`, () => {
    return HttpResponse.json({
      totalEstimate: 25.99,
      breakdown: [],
    })
  }),
]
