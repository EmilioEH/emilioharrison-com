import { describe, it, expect } from 'vitest'
import {
  mergeAiRecipeUpdate,
  snapshotRecipe,
  clampRecipeEnums,
  UnusableAiResultError,
} from './recipe-merge'
import type { Recipe } from '../types'

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r1',
    title: 'Steak Tips with Ras el Hanout',
    servings: 4,
    prepTime: 10,
    cookTime: 15,
    ingredients: [{ name: 'sirloin steak tips', amount: '1.5 lbs' }],
    steps: ['Sear the steak.', 'Cook the couscous.'],
    protein: 'Beef',
    ...overrides,
  }
}

describe('mergeAiRecipeUpdate', () => {
  it('throws UnusableAiResultError when the AI result has no title, ingredients, or steps', () => {
    const original = makeRecipe()
    expect(() => mergeAiRecipeUpdate(original, {})).toThrow(UnusableAiResultError)
    expect(() => mergeAiRecipeUpdate(original, { ingredients: [], steps: [], title: '' })).toThrow(
      UnusableAiResultError,
    )
  })

  it('does not throw and applies a full, plausible AI result', () => {
    const original = makeRecipe()
    const aiResult = {
      title: 'Steak Tips with Ras el Hanout and Couscous',
      ingredients: [{ name: 'sirloin steak tips', amount: '1.5 lbs (680g)' }],
      steps: ['Sear the steak until browned.', 'Cook couscous in the same pan.'],
    }
    const merged = mergeAiRecipeUpdate(original, aiResult)
    expect(merged.title).toBe(aiResult.title)
    expect(merged.ingredients).toEqual(aiResult.ingredients)
    expect(merged.steps).toEqual(aiResult.steps)
  })

  it('never blanks out an existing title when the AI result omits one', () => {
    const original = makeRecipe({ title: 'Real Recipe Title' })
    const merged = mergeAiRecipeUpdate(original, { steps: ['Do the thing.'] })
    expect(merged.title).toBe('Real Recipe Title')
  })

  it('keeps the original ingredients when the AI result returns an empty array', () => {
    const original = makeRecipe()
    const merged = mergeAiRecipeUpdate(original, {
      title: 'Updated Title',
      ingredients: [],
      steps: ['A new step so the result is not wholly empty.'],
    })
    expect(merged.ingredients).toEqual(original.ingredients)
  })

  it('keeps the original steps when the AI result returns an empty array', () => {
    const original = makeRecipe()
    const merged = mergeAiRecipeUpdate(original, {
      title: 'Updated Title',
      ingredients: [{ name: 'new ingredient', amount: '1' }],
      steps: [],
    })
    expect(merged.steps).toEqual(original.steps)
  })

  it('keeps original structuredSteps/ingredientGroups/stepGroups when AI omits them', () => {
    const original = makeRecipe({
      structuredSteps: [{ text: 'Original macro-step', highlightedText: 'Original macro-step' }],
      ingredientGroups: [{ header: 'MAIN', startIndex: 0, endIndex: 0 }],
      stepGroups: [{ header: 'SEAR', startIndex: 0, endIndex: 0 }],
    })
    const merged = mergeAiRecipeUpdate(original, {
      title: 'Updated Title',
      ingredients: original.ingredients,
      steps: original.steps,
    })
    expect(merged.structuredSteps).toEqual(original.structuredSteps)
    expect(merged.ingredientGroups).toEqual(original.ingredientGroups)
    expect(merged.stepGroups).toEqual(original.stepGroups)
  })

  it('preserves sourceUrl/sourceImage/images when the AI result does not provide them', () => {
    const original = makeRecipe({
      sourceUrl: 'https://example.com/recipe',
      sourceImage: '/protected/recipes/api/uploads/abc.jpg',
      images: ['/protected/recipes/api/uploads/abc.jpg'],
    })
    const merged = mergeAiRecipeUpdate(original, {
      title: 'Updated Title',
      ingredients: original.ingredients,
      steps: original.steps,
    })
    expect(merged.sourceUrl).toBe(original.sourceUrl)
    expect(merged.sourceImage).toBe(original.sourceImage)
    expect(merged.images).toEqual(original.images)
  })

  it('bumps updatedAt on every merge', () => {
    const original = makeRecipe({ updatedAt: '2020-01-01T00:00:00.000Z' })
    const merged = mergeAiRecipeUpdate(original, {
      title: 'Updated Title',
      ingredients: original.ingredients,
      steps: original.steps,
    })
    expect(merged.updatedAt).not.toBe('2020-01-01T00:00:00.000Z')
  })
})

describe('clampRecipeEnums', () => {
  it('clamps an unrecognized protein to "Other" rather than saving the hallucinated value', () => {
    const clamped = clampRecipeEnums({ protein: 'Turkey' })
    expect(clamped.protein).toBe('Other')
  })

  it('matches protein case-insensitively and normalizes casing', () => {
    const clamped = clampRecipeEnums({ protein: 'chicken' })
    expect(clamped.protein).toBe('Chicken')
  })

  it('leaves a valid protein untouched', () => {
    const clamped = clampRecipeEnums({ protein: 'Vegan' })
    expect(clamped.protein).toBe('Vegan')
  })

  it('leaves protein unset when the recipe has none', () => {
    const clamped = clampRecipeEnums<Partial<Recipe>>({})
    expect(clamped.protein).toBeUndefined()
  })

  it('clears an unrecognized mealType/dishType instead of mislabeling (no catch-all option)', () => {
    const clamped = clampRecipeEnums({ mealType: 'Late Night Snack Attack', dishType: 'Entree' })
    expect(clamped.mealType).toBeUndefined()
    expect(clamped.dishType).toBeUndefined()
  })

  it('keeps a valid mealType/dishType, matched case-insensitively', () => {
    const clamped = clampRecipeEnums({ mealType: 'dinner', dishType: 'Main' })
    expect(clamped.mealType).toBe('Dinner')
    expect(clamped.dishType).toBe('Main')
  })

  it('normalizes structuredIngredients categories to the fixed grocery category set', () => {
    const clamped = clampRecipeEnums({
      structuredIngredients: [
        {
          original: '1 lb ground turkey',
          name: 'ground turkey',
          amount: 1,
          unit: 'lb',
          category: 'Seafood', // legacy category name (see grocery-logic.ts LEGACY_CATEGORY_MAP)
        },
      ],
    })
    expect(clamped.structuredIngredients?.[0].category).toBe('Meat')
  })

  it('is applied automatically by mergeAiRecipeUpdate', () => {
    const original = makeRecipe({ protein: 'Beef' })
    const merged = mergeAiRecipeUpdate(original, {
      title: 'Updated Title',
      ingredients: original.ingredients,
      steps: original.steps,
      protein: 'Turkey',
    })
    expect(merged.protein).toBe('Other')
  })
})

describe('snapshotRecipe', () => {
  it('captures the AI-mutable fields and a reason/timestamp', () => {
    const original = makeRecipe()
    const snapshot = snapshotRecipe(original, 'refresh')
    expect(snapshot.reason).toBe('refresh')
    expect(typeof snapshot.savedAt).toBe('string')
    expect(snapshot.data.title).toBe(original.title)
    expect(snapshot.data.ingredients).toEqual(original.ingredients)
    expect(snapshot.data.steps).toEqual(original.steps)
    expect(snapshot.data.protein).toBe('Beef')
  })

  it('omits fields that are undefined on the original recipe', () => {
    const original = makeRecipe()
    const snapshot = snapshotRecipe(original, 'enhance')
    expect(snapshot.data).not.toHaveProperty('cuisine')
    expect(snapshot.data).not.toHaveProperty('structuredSteps')
  })

  it('does not capture identity/ownership fields', () => {
    const original = makeRecipe({ createdBy: 'user-1', id: 'r1' })
    const snapshot = snapshotRecipe(original, 'refresh')
    expect(snapshot.data).not.toHaveProperty('id')
    expect(snapshot.data).not.toHaveProperty('createdBy')
  })
})
