import type { Recipe } from '../lib/types'

/**
 * Shared mock data for E2E tests.
 * Tests can import this to reference expected values.
 */

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
  {
    id: 'test-recipe-002',
    title: 'Another Test Recipe',
    servings: 4,
    prepTime: 15,
    cookTime: 30,
    ingredients: [
      { name: 'Chicken', amount: '1 lb' },
      { name: 'Salt', amount: '1 tsp' },
    ],
    steps: ['Season chicken', 'Cook chicken', 'Serve'],
    notes: '',
    description: 'Another test recipe',
    thisWeek: true,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    protein: 'Chicken',
    mealType: 'Dinner',
    difficulty: 'Medium',
    cuisine: 'American',
  },
]

// In-memory state for tests that modify data
let mockRecipes = [...TEST_RECIPES]

export const getMockRecipes = () => mockRecipes
export const setMockRecipes = (recipes: Recipe[]) => {
  mockRecipes = recipes
}
export const resetMockRecipes = () => {
  mockRecipes = [...TEST_RECIPES]
}
export const addMockRecipe = (recipe: Recipe) => {
  mockRecipes.push(recipe)
}
