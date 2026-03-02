import { describe, it, expect } from 'vitest'
import {
  computeStepIngredientMappings,
  hasUsefulStepIngredientMappings,
  areStepIngredientMappingsEqual,
} from './step-ingredient-mapping'

describe('step-ingredient-mapping', () => {
  it('maps ingredient indices from step text deterministically', () => {
    const ingredients = [
      { name: 'broccoli florets', amount: '4 cups' },
      { name: 'soy sauce', amount: '2 tbsp' },
      { name: 'cornstarch', amount: '1 tbsp' },
    ]

    const steps = [
      'Whisk soy sauce and cornstarch in a bowl.',
      'Stir-fry the broccoli florets until bright green.',
    ]

    const mapping = computeStepIngredientMappings(ingredients, steps)

    expect(mapping).toEqual([{ indices: [1, 2] }, { indices: [0] }])
  })

  it('uses structured step text and handles parenthetical ingredient names', () => {
    const ingredients = [
      { name: 'walnuts (toasted)', amount: '1/2 cup' },
      { name: 'honey', amount: '2 tbsp' },
    ]

    const steps = ['Toss sauce together.', 'Add crunch and serve.']
    const structuredSteps = [
      { text: 'Whisk the glaze.', highlightedText: '**Whisk** honey into the sauce.' },
      { text: 'Fold in walnuts before serving.' },
    ]

    const mapping = computeStepIngredientMappings(ingredients, steps, structuredSteps)

    expect(mapping).toEqual([{ indices: [1] }, { indices: [0] }])
  })

  it('reports useful mapping availability and equality correctly', () => {
    const a = [{ indices: [0] }, { indices: [] }]
    const b = [{ indices: [0] }, { indices: [] }]
    const c = [{ indices: [] }, { indices: [] }]

    expect(hasUsefulStepIngredientMappings(a, 2)).toBe(true)
    expect(hasUsefulStepIngredientMappings(c, 2)).toBe(false)
    expect(areStepIngredientMappingsEqual(a, b)).toBe(true)
    expect(areStepIngredientMappingsEqual(a, c)).toBe(false)
  })
})
