import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runEnhancementForDoc, runGroceryForDoc } from './jobs'
import type { GoogleGenAI, Recipe, WorkerStore } from './types'

const fakeGemini = {} as GoogleGenAI

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

/** Minimal in-memory WorkerStore stub; each method is a spy so tests assert the call sequence. */
function fakeStore(overrides: Partial<WorkerStore> = {}): WorkerStore {
  return {
    claimEnhancement: vi.fn(async () => makeRecipe()),
    completeEnhancement: vi.fn(async () => {}),
    failEnhancement: vi.fn(async () => {}),
    claimGrocery: vi.fn(async () => [makeRecipe()]),
    writeGroceryProgress: vi.fn(async () => {}),
    completeGrocery: vi.fn(async () => {}),
    failGrocery: vi.fn(async () => {}),
    reapStuckEnhancements: vi.fn(async () => 0),
    reapStuckGrocery: vi.fn(async () => 0),
    ...overrides,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('runEnhancementForDoc', () => {
  it('claims, computes, and persists the enhanced recipe on success', async () => {
    const store = fakeStore()
    const computeEnhanced = vi.fn(async () => makeRecipe({ title: 'Enhanced' }))

    const outcome = await runEnhancementForDoc(
      { store, gemini: fakeGemini, origin: 'https://o', jobTimeoutMs: 120_000, computeEnhanced },
      'r1',
    )

    expect(outcome).toBe('done')
    expect(store.claimEnhancement).toHaveBeenCalledWith('r1')
    expect(computeEnhanced).toHaveBeenCalledWith(
      fakeGemini,
      expect.objectContaining({ id: 'r1' }),
      'https://o',
      { timeoutMs: 120_000 },
    )
    expect(store.completeEnhancement).toHaveBeenCalledWith(
      'r1',
      expect.objectContaining({ title: 'Enhanced' }),
    )
    expect(store.failEnhancement).not.toHaveBeenCalled()
  })

  it('skips (no compute) when the doc is not claimable', async () => {
    const store = fakeStore({ claimEnhancement: vi.fn(async () => null) })
    const computeEnhanced = vi.fn()

    const outcome = await runEnhancementForDoc(
      { store, gemini: fakeGemini, origin: 'o', jobTimeoutMs: 1, computeEnhanced },
      'r1',
    )

    expect(outcome).toBe('skipped')
    expect(computeEnhanced).not.toHaveBeenCalled()
    expect(store.completeEnhancement).not.toHaveBeenCalled()
  })

  it('persists an error status (and does not throw) when compute fails', async () => {
    const store = fakeStore()
    const computeEnhanced = vi.fn(async () => {
      throw new Error('Gemini timed out')
    })

    const outcome = await runEnhancementForDoc(
      { store, gemini: fakeGemini, origin: 'o', jobTimeoutMs: 1, computeEnhanced },
      'r1',
    )

    expect(outcome).toBe('failed')
    expect(store.failEnhancement).toHaveBeenCalledWith('r1', 'Gemini timed out')
    expect(store.completeEnhancement).not.toHaveBeenCalled()
  })
})

describe('runGroceryForDoc', () => {
  it('claims, computes, streams progress, and persists ingredients on success', async () => {
    const store = fakeStore()
    const computeGrocery = vi.fn(async (_g, _r, opts) => {
      await opts.onProgress?.({ progress: 25, message: 'Selecting fresh produce...' })
      return [{ name: 'limes' }]
    })

    const outcome = await runGroceryForDoc(
      { store, gemini: fakeGemini, jobTimeoutMs: 120_000, computeGrocery },
      'fam_2026-07-20',
    )

    expect(outcome).toBe('done')
    expect(store.claimGrocery).toHaveBeenCalledWith('fam_2026-07-20')
    expect(store.writeGroceryProgress).toHaveBeenCalledWith(
      'fam_2026-07-20',
      25,
      'Selecting fresh produce...',
    )
    expect(store.completeGrocery).toHaveBeenCalledWith('fam_2026-07-20', [{ name: 'limes' }])
  })

  it('skips when the doc is not claimable', async () => {
    const store = fakeStore({ claimGrocery: vi.fn(async () => null) })
    const computeGrocery = vi.fn()

    const outcome = await runGroceryForDoc(
      { store, gemini: fakeGemini, jobTimeoutMs: 1, computeGrocery },
      'x',
    )

    expect(outcome).toBe('skipped')
    expect(computeGrocery).not.toHaveBeenCalled()
  })

  it('persists an error status (and does not throw) when compute fails', async () => {
    const store = fakeStore()
    const computeGrocery = vi.fn(async () => {
      throw new Error('AI response was incomplete')
    })

    const outcome = await runGroceryForDoc(
      { store, gemini: fakeGemini, jobTimeoutMs: 1, computeGrocery },
      'x',
    )

    expect(outcome).toBe('failed')
    expect(store.failGrocery).toHaveBeenCalledWith('x', 'AI response was incomplete')
    expect(store.completeGrocery).not.toHaveBeenCalled()
  })
})
