import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runGroceryForDoc } from './jobs'
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
    claimGrocery: vi.fn(async () => [makeRecipe()]),
    writeGroceryProgress: vi.fn(async () => {}),
    completeGrocery: vi.fn(async () => {}),
    failGrocery: vi.fn(async () => {}),
    reapStuckGrocery: vi.fn(async () => 0),
    ...overrides,
  }
}

const fakeLogAiError = vi.fn()

beforeEach(() => vi.clearAllMocks())

describe('runGroceryForDoc', () => {
  it('claims, computes, streams progress, and persists ingredients on success', async () => {
    const store = fakeStore()
    const computeGrocery = vi.fn(async (_g, _r, opts) => {
      await opts.onProgress?.({ progress: 25, message: 'Selecting fresh produce...' })
      return [{ name: 'limes' }]
    })

    const outcome = await runGroceryForDoc(
      {
        store,
        gemini: fakeGemini,
        jobTimeoutMs: 120_000,
        computeGrocery,
        logAiError: fakeLogAiError,
      },
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
    expect(fakeLogAiError).not.toHaveBeenCalled()
  })

  it('skips when the doc is not claimable', async () => {
    const store = fakeStore({ claimGrocery: vi.fn(async () => null) })
    const computeGrocery = vi.fn()

    const outcome = await runGroceryForDoc(
      { store, gemini: fakeGemini, jobTimeoutMs: 1, computeGrocery, logAiError: fakeLogAiError },
      'x',
    )

    expect(outcome).toBe('skipped')
    expect(computeGrocery).not.toHaveBeenCalled()
  })

  it('persists an error status and logs it (and does not throw) when compute fails', async () => {
    const store = fakeStore()
    const computeGrocery = vi.fn(async () => {
      throw new Error('AI response was incomplete')
    })

    const outcome = await runGroceryForDoc(
      { store, gemini: fakeGemini, jobTimeoutMs: 1, computeGrocery, logAiError: fakeLogAiError },
      'x',
    )

    expect(outcome).toBe('failed')
    expect(store.failGrocery).toHaveBeenCalledWith('x', 'AI response was incomplete')
    expect(store.completeGrocery).not.toHaveBeenCalled()
    expect(fakeLogAiError).toHaveBeenCalledWith('grocery', expect.any(Error), {
      context: { listId: 'x' },
    })
  })
})
