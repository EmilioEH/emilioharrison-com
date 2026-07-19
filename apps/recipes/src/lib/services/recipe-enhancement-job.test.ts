import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Recipe } from '../types'

const { getDocument, setDocument, updateDocument } = vi.hoisted(() => ({
  getDocument: vi.fn(),
  setDocument: vi.fn(),
  updateDocument: vi.fn(),
}))
vi.mock('../firebase-server', () => ({
  db: { getDocument, setDocument, updateDocument },
}))

const { executeAiParse } = vi.hoisted(() => ({ executeAiParse: vi.fn() }))
vi.mock('./ai-parser', () => ({ executeAiParse }))

import { runEnhancementJob } from './recipe-enhancement-job'

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r1',
    title: 'Steak Tips',
    servings: 4,
    prepTime: 10,
    cookTime: 15,
    ingredients: [{ name: 'steak', amount: '1 lb' }],
    steps: ['Sear it.'],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  updateDocument.mockResolvedValue({})
})

describe('runEnhancementJob', () => {
  it('marks processing, then complete, and returns the merged recipe on success', async () => {
    const recipe = makeRecipe()
    executeAiParse.mockResolvedValue({
      title: 'Steak Tips, Enhanced',
      ingredients: [{ name: 'steak', amount: '16 oz (450g)' }],
      steps: ['Sear until deeply browned, about 4 minutes.'],
    })

    const result = await runEnhancementJob({}, recipe, 'https://example.com')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.recipe.title).toBe('Steak Tips, Enhanced')
      expect(result.recipe.enhancementStatus).toBe('complete')
    }

    const statuses = updateDocument.mock.calls
      .filter((c) => c[0] === 'recipes' && c[1] === 'r1')
      .map((c) => c[2].enhancementStatus)
    expect(statuses).toEqual(['processing', 'complete'])
  })

  it('persists error status and returns a failure result when the AI call throws', async () => {
    const recipe = makeRecipe()
    executeAiParse.mockRejectedValue(new Error('Gemini timed out'))

    const result = await runEnhancementJob({}, recipe, 'https://example.com')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Gemini timed out')
      expect(result.status).toBe(500)
    }

    const errorCall = updateDocument.mock.calls.find(
      (c) => c[0] === 'recipes' && c[2].enhancementStatus === 'error',
    )
    expect(errorCall).toBeDefined()
    expect(errorCall![2].enhancementError).toBe('Gemini timed out')
  })

  it('returns a 422 result (and persists error status) when the AI result is unusable', async () => {
    const recipe = makeRecipe()
    executeAiParse.mockResolvedValue({}) // no title, ingredients, or steps

    const result = await runEnhancementJob({}, recipe, 'https://example.com')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.status).toBe(422)
    }
  })

  it('prefers sourceUrl, then sourceImage, then reconstructed text, in that order', async () => {
    executeAiParse.mockResolvedValue({ title: 'x', ingredients: [{ name: 'a', amount: '1' }] })

    await runEnhancementJob({}, makeRecipe({ sourceUrl: 'https://a.com' }), 'https://origin')
    expect(executeAiParse).toHaveBeenLastCalledWith(
      {},
      expect.objectContaining({ url: 'https://a.com' }),
      'https://origin',
      undefined,
    )

    await runEnhancementJob({}, makeRecipe({ sourceImage: '/api/uploads/x.jpg' }), 'https://origin')
    expect(executeAiParse).toHaveBeenLastCalledWith(
      {},
      expect.objectContaining({ image: '/api/uploads/x.jpg' }),
      'https://origin',
      undefined,
    )

    await runEnhancementJob({}, makeRecipe(), 'https://origin')
    expect(executeAiParse).toHaveBeenLastCalledWith(
      {},
      expect.objectContaining({ text: expect.stringContaining('Steak Tips') }),
      'https://origin',
      undefined,
    )
  })

  it('never throws even if the Firestore status write itself fails', async () => {
    const recipe = makeRecipe()
    executeAiParse.mockRejectedValue(new Error('boom'))
    updateDocument.mockRejectedValue(new Error('Firestore is down'))

    await expect(runEnhancementJob({}, recipe, 'https://example.com')).resolves.toMatchObject({
      success: false,
    })
  })
})
