import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { GoogleGenAI } from '@google/genai'
import type { Recipe } from '../types'

const { executeAiParse } = vi.hoisted(() => ({ executeAiParse: vi.fn() }))
vi.mock('./ai-parser', () => ({ executeAiParse }))

import { computeEnhancedRecipe, EnhancementProducedNothingError } from './enhancement-core'
import { UnusableAiResultError } from './recipe-merge'

const fakeGemini = { models: {} } as unknown as GoogleGenAI

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

beforeEach(() => vi.clearAllMocks())

describe('computeEnhancedRecipe (shared core — no Firestore, no locals)', () => {
  it('returns a merged recipe marked complete, with a restore snapshot', async () => {
    executeAiParse.mockResolvedValue({
      title: 'Steak Tips, Enhanced',
      ingredients: [{ name: 'steak', amount: '16 oz (450g)' }],
      steps: ['Sear until deeply browned.'],
      structuredSteps: [
        { title: 'Sear the Beef', text: 'Sear until deeply browned.', tip: 'Dry the surface.' },
      ],
    })

    const result = await computeEnhancedRecipe(fakeGemini, makeRecipe(), 'https://origin', {
      timeoutMs: 25_000,
    })

    expect(result.title).toBe('Steak Tips, Enhanced')
    expect(result.enhancementStatus).toBe('complete')
    expect(result.enhancementError).toBeUndefined()
    expect(result.previousVersion?.reason).toBe('enhance')
  })

  it('passes the injected client, origin, signal, and timeout straight to executeAiParse', async () => {
    executeAiParse.mockResolvedValue({
      title: 'x',
      ingredients: [{ name: 'a', amount: '1' }],
      structuredSteps: [{ text: 'Sear until deeply browned.' }],
    })
    const signal = new AbortController().signal

    await computeEnhancedRecipe(
      fakeGemini,
      makeRecipe({ sourceUrl: 'https://a.com' }),
      'https://o',
      {
        signal,
        timeoutMs: 12_345,
      },
    )

    expect(executeAiParse).toHaveBeenCalledWith(
      fakeGemini,
      expect.objectContaining({ url: 'https://a.com' }),
      'https://o',
      signal,
      12_345,
    )
  })

  it('prefers sourceUrl, then sourceImage, then reconstructed text', async () => {
    executeAiParse.mockResolvedValue({
      title: 'x',
      ingredients: [{ name: 'a', amount: '1' }],
      structuredSteps: [{ text: 'Sear until deeply browned.' }],
    })

    await computeEnhancedRecipe(fakeGemini, makeRecipe({ sourceImage: '/api/uploads/x.jpg' }), 'o')
    expect(executeAiParse).toHaveBeenLastCalledWith(
      fakeGemini,
      expect.objectContaining({ image: '/api/uploads/x.jpg' }),
      'o',
      undefined,
      undefined,
    )

    await computeEnhancedRecipe(fakeGemini, makeRecipe(), 'o')
    expect(executeAiParse).toHaveBeenLastCalledWith(
      fakeGemini,
      expect.objectContaining({ text: expect.stringContaining('Steak Tips') }),
      'o',
      undefined,
      undefined,
    )
  })

  it('propagates UnusableAiResultError when the AI result is too sparse to merge', async () => {
    executeAiParse.mockResolvedValue({})
    await expect(
      computeEnhancedRecipe(fakeGemini, makeRecipe(), 'o', { timeoutMs: 25_000 }),
    ).rejects.toBeInstanceOf(UnusableAiResultError)
  })

  describe('silent no-op detection (field report: "Kenji styling doesn\'t work")', () => {
    // Production case: a reparse returned a plausible recipe with NO structuredSteps.
    // mergeAiRecipeUpdate's "never overwrite a populated array with an empty one" guard then
    // kept the importer's original steps verbatim, and the recipe was still stamped
    // `complete` — so the user saw an un-enhanced recipe reported as successfully enhanced.
    const withoutStructure = {
      title: 'Steak Tips',
      ingredients: [{ name: 'steak', amount: '1 lb' }],
      steps: ['Sear it.'],
    }

    it('retries once when the reparse comes back with no structuredSteps', async () => {
      executeAiParse
        .mockResolvedValueOnce(withoutStructure)
        .mockResolvedValueOnce({ ...withoutStructure, structuredSteps: [{ text: 'Sear it well.' }] })

      const result = await computeEnhancedRecipe(fakeGemini, makeRecipe(), 'o')

      expect(executeAiParse).toHaveBeenCalledTimes(2)
      expect(result.enhancementStatus).toBe('complete')
      expect(result.structuredSteps).toHaveLength(1)
    })

    it('throws rather than reporting a success that changed nothing', async () => {
      executeAiParse.mockResolvedValue(withoutStructure)

      await expect(computeEnhancedRecipe(fakeGemini, makeRecipe(), 'o')).rejects.toBeInstanceOf(
        EnhancementProducedNothingError,
      )
      expect(executeAiParse).toHaveBeenCalledTimes(2)
    })

    it('does not retry when the first reparse already produced enhanced steps', async () => {
      executeAiParse.mockResolvedValue({
        ...withoutStructure,
        structuredSteps: [{ text: 'Sear until deeply browned, about 4 minutes.' }],
      })

      await computeEnhancedRecipe(fakeGemini, makeRecipe(), 'o')

      expect(executeAiParse).toHaveBeenCalledTimes(1)
    })
  })
})
