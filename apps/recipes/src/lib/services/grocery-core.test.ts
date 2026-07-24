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

/** Fake Gemini client that returns a different full-text response on each successive call —
 * for exercising the retry-on-empty-result path (each attempt is a fresh `generateContentStream`
 * call, so this simulates "first attempt came back empty, second attempt worked"). */
function fakeGeminiSequence(responses: string[]): GoogleGenAI {
  let call = 0
  return {
    models: {
      generateContentStream: vi.fn(async () => {
        const text = responses[Math.min(call, responses.length - 1)]
        call += 1
        return {
          async *[Symbol.asyncIterator]() {
            yield { candidates: [{ content: { parts: [{ text }] } }] }
          },
        }
      }),
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

  it('retries once when the model returns a schema-valid but empty list for non-empty input', async () => {
    const empty = JSON.stringify({ ingredients: [] })
    const real = JSON.stringify({
      ingredients: [
        { name: 'lime', purchaseAmount: 2, purchaseUnit: 'whole', category: 'Produce', sources: [] },
      ],
    })
    const gemini = fakeGeminiSequence([empty, real])

    const ingredients = await computeGroceryList(gemini, recipes, { timeoutMs: 25_000 })

    expect(gemini.models.generateContentStream).toHaveBeenCalledTimes(2)
    expect(ingredients).toHaveLength(1)
  })

  it('throws (not a silent empty success) when every retry attempt comes back empty', async () => {
    const empty = JSON.stringify({ ingredients: [] })
    const gemini = fakeGeminiSequence([empty, empty])

    await expect(computeGroceryList(gemini, recipes, { timeoutMs: 25_000 })).rejects.toThrow(
      /empty ingredient list/,
    )
    expect(gemini.models.generateContentStream).toHaveBeenCalledTimes(2)
  })

  it('does not retry (and returns []) when the input recipes genuinely have no ingredients', async () => {
    const empty = JSON.stringify({ ingredients: [] })
    const gemini = fakeGeminiSequence([empty])
    const emptyRecipes: Recipe[] = [
      { id: 'r2', title: 'Just Water', servings: 1, prepTime: 0, cookTime: 0, ingredients: [], steps: [] },
    ]

    const ingredients = await computeGroceryList(gemini, emptyRecipes, { timeoutMs: 25_000 })

    expect(ingredients).toEqual([])
    expect(gemini.models.generateContentStream).toHaveBeenCalledTimes(1)
  })
})
