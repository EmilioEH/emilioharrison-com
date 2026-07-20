import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { GoogleGenAI } from '@google/genai'
import type { Recipe } from '../types'

const { executeAiParse } = vi.hoisted(() => ({ executeAiParse: vi.fn() }))
vi.mock('./ai-parser', () => ({ executeAiParse }))

import { computeEnhancedRecipe } from './enhancement-core'
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
    executeAiParse.mockResolvedValue({ title: 'x', ingredients: [{ name: 'a', amount: '1' }] })
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
    executeAiParse.mockResolvedValue({ title: 'x', ingredients: [{ name: 'a', amount: '1' }] })

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
})
