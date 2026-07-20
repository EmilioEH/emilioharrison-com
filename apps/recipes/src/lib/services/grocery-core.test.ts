import { describe, it, expect, vi } from 'vitest'
import type { GoogleGenAI } from '@google/genai'
import { computeGroceryList } from './grocery-core'
import type { Recipe } from '../types'

/** Fake Gemini client whose `generateContentStream` yields the given text chunks in the shape
 * `extractGeminiChunkText` expects (candidates[0].content.parts[0].text). */
function fakeGemini(chunks: string[]): GoogleGenAI {
  return {
    models: {
      generateContentStream: vi.fn(async () => ({
        async *[Symbol.asyncIterator]() {
          for (const text of chunks) {
            yield { candidates: [{ content: { parts: [{ text }] } }] }
          }
        },
      })),
    },
  } as unknown as GoogleGenAI
}

const recipes: Recipe[] = [
  {
    id: 'r1',
    title: 'Fish Tacos',
    servings: 2,
    prepTime: 5,
    cookTime: 10,
    ingredients: [{ name: 'lime', amount: '2 tbsp juice' }],
    steps: ['Squeeze.'],
  },
]

describe('computeGroceryList (shared core — no Firestore, no locals)', () => {
  it('returns the parsed ingredients array from the streamed response', async () => {
    const payload = JSON.stringify({
      ingredients: [
        {
          name: 'limes',
          purchaseAmount: 1,
          purchaseUnit: 'whole',
          category: 'Produce',
          sources: [],
        },
      ],
    })
    const gemini = fakeGemini([payload])

    const ingredients = await computeGroceryList(gemini, recipes, { timeoutMs: 25_000 })

    expect(ingredients).toHaveLength(1)
    expect((ingredients[0] as { name: string }).name).toBe('limes')
  })

  it('reports progress as category stages appear in the stream', async () => {
    // Split so a "Produce" category boundary is visible in the accumulated text.
    const chunks = ['{"ingredients":[{"name":"limes","category":', '"Produce"}]}']
    const gemini = fakeGemini(chunks)
    const onProgress = vi.fn()

    await computeGroceryList(gemini, recipes, { timeoutMs: 25_000, onProgress }).catch(() => {
      // The split payload isn't valid JSON on its own; we only care that progress fired.
    })

    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('produce') }),
    )
  })

  it('throws when the model produces no usable ingredients', async () => {
    const gemini = fakeGemini(['not json at all {{{'])
    await expect(computeGroceryList(gemini, recipes, { timeoutMs: 25_000 })).rejects.toThrow()
  })
})
