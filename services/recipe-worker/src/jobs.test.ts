import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runGroceryForDoc, runImportForDoc } from './jobs'
import type { GoogleGenAI, OpenAI, Recipe, WorkerStore, FetchPhotos, ParsePhotos } from './types'

const fakeGemini = {} as GoogleGenAI
const fakeOpenAi = {} as OpenAI

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
    claimGrocery: vi.fn(async () => ({
      recipes: [makeRecipe()],
      sourceRecipeIds: ['r1'],
    })),
    writeGroceryProgress: vi.fn(async () => {}),
    completeGrocery: vi.fn(async () => {}),
    failGrocery: vi.fn(async () => {}),
    reapStuckGrocery: vi.fn(async () => 0),
    claimImport: vi.fn(async () => ({
      batchId: 'b1',
      createdBy: 'u1',
      photoKeys: ['u1-123-abc.jpeg'],
    })),
    completeImport: vi.fn(async () => {}),
    failImport: vi.fn(async () => {}),
    reapStuckImports: vi.fn(async () => 0),
    ...overrides,
  }
}

/** Deps for runImportForDoc, with the storage read and the parse pipeline both stubbed. */
function importDeps(
  overrides: {
    store?: WorkerStore
    fetchPhotos?: FetchPhotos
    parsePhotos?: ParsePhotos
    importJobTimeoutMs?: number
  } = {},
) {
  return {
    store: overrides.store ?? fakeStore(),
    openai: fakeOpenAi,
    fetchPhotos:
      overrides.fetchPhotos ??
      vi.fn(async (_keys: string[]) => [{ mimeType: 'image/jpeg', data: 'Zm9v' }]),
    parsePhotos:
      overrides.parsePhotos ??
      vi.fn(async () => ({ title: 'Empanadas', servings: 4 }) as Record<string, unknown>),
    importJobTimeoutMs: overrides.importJobTimeoutMs ?? 300_000,
    logAiError: fakeLogAiError,
  }
}

const fakeLogAiError = vi.fn()

beforeEach(() => vi.clearAllMocks())

describe('runGroceryForDoc', () => {
  it('claims, computes, streams progress, and persists ingredients on success', async () => {
    const store = fakeStore()
    const computeGrocery = vi.fn(async (_g, _r, opts) => {
      await opts.onProgress?.({
        progress: 25,
        message: 'Selecting fresh produce...',
      })
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
    expect(store.completeGrocery).toHaveBeenCalledWith(
      'fam_2026-07-20',
      [{ name: 'limes' }],
      ['r1'],
    )
    expect(fakeLogAiError).not.toHaveBeenCalled()
  })

  it('skips when the doc is not claimable', async () => {
    const store = fakeStore({ claimGrocery: vi.fn(async () => null) })
    const computeGrocery = vi.fn()

    const outcome = await runGroceryForDoc(
      {
        store,
        gemini: fakeGemini,
        jobTimeoutMs: 1,
        computeGrocery,
        logAiError: fakeLogAiError,
      },
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
      {
        store,
        gemini: fakeGemini,
        jobTimeoutMs: 1,
        computeGrocery,
        logAiError: fakeLogAiError,
      },
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

describe('runImportForDoc', () => {
  it('claims, reads the photos, parses, and stores the result on the job', async () => {
    const deps = importDeps()

    const outcome = await runImportForDoc(deps, 'job1')

    expect(outcome).toBe('done')
    expect(deps.store.claimImport).toHaveBeenCalledWith('job1')
    expect(deps.fetchPhotos).toHaveBeenCalledWith(['u1-123-abc.jpeg'])
    expect(deps.store.completeImport).toHaveBeenCalledWith('job1', {
      parsedRecipe: { title: 'Empanadas', servings: 4 },
    })
  })

  it('never writes to the recipe library — the result stays on the job until reviewed', async () => {
    // The whole point of the two-collection design: unreviewed transcription must not reach the
    // library, since nothing cleans up after a bad read any more.
    const deps = importDeps()

    await runImportForDoc(deps, 'job1')

    const written = (deps.store.completeImport as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(written.parsedRecipe.title).toBe('Empanadas')
    expect(written.parsedRecipe.id).toBeUndefined()
  })

  it('lifts partialFailure onto the job instead of into the saved recipe', async () => {
    const deps = importDeps({
      parsePhotos: vi.fn(async () => ({
        title: 'Half Read',
        partialFailure: 'instructions',
      })),
    })

    await runImportForDoc(deps, 'job1')

    expect(deps.store.completeImport).toHaveBeenCalledWith('job1', {
      parsedRecipe: { title: 'Half Read' },
      partialFailure: 'instructions',
    })
  })

  it('passes every photo of a grouped spread through in page order', async () => {
    const store = fakeStore({
      claimImport: vi.fn(async () => ({
        batchId: 'b1',
        createdBy: 'u1',
        photoKeys: ['page1.jpeg', 'page2.jpeg'],
      })),
    })
    const fetchPhotos = vi.fn(async () => [
      { mimeType: 'image/jpeg', data: 'cDE=' },
      { mimeType: 'image/jpeg', data: 'cDI=' },
    ])
    const deps = importDeps({ store, fetchPhotos })

    await runImportForDoc(deps, 'job1')

    expect(fetchPhotos).toHaveBeenCalledWith(['page1.jpeg', 'page2.jpeg'])
    expect(deps.parsePhotos).toHaveBeenCalledWith(
      fakeOpenAi,
      [
        { mimeType: 'image/jpeg', data: 'cDE=' },
        { mimeType: 'image/jpeg', data: 'cDI=' },
      ],
      expect.anything(),
    )
  })

  it('skips a job someone else already claimed', async () => {
    const deps = importDeps({
      store: fakeStore({ claimImport: vi.fn(async () => null) }),
    })

    expect(await runImportForDoc(deps, 'job1')).toBe('skipped')
    expect(deps.fetchPhotos).not.toHaveBeenCalled()
  })

  it('retries the parse once — per-job failure is normal here, not exceptional', async () => {
    let call = 0
    const parsePhotos = vi.fn(async () => {
      call += 1
      if (call === 1) throw new Error('Failed to structure the recipe from this photo.')
      return { title: 'Recovered On Retry' }
    })
    const deps = importDeps({ parsePhotos })

    const outcome = await runImportForDoc(deps, 'job1')

    expect(outcome).toBe('done')
    expect(parsePhotos).toHaveBeenCalledTimes(2)
    expect(deps.store.completeImport).toHaveBeenCalledWith('job1', {
      parsedRecipe: { title: 'Recovered On Retry' },
    })
  })

  it('fails loudly on the job after the retry is also spent', async () => {
    const parsePhotos = vi.fn(async () => {
      throw new Error('Failed to parse recipe from image')
    })
    const deps = importDeps({ parsePhotos })

    const outcome = await runImportForDoc(deps, 'job1')

    expect(outcome).toBe('failed')
    expect(parsePhotos).toHaveBeenCalledTimes(2)
    expect(deps.store.failImport).toHaveBeenCalledWith('job1', 'Failed to parse recipe from image')
    expect(deps.store.completeImport).not.toHaveBeenCalled()
    expect(fakeLogAiError).toHaveBeenCalledWith('photo-import', expect.any(Error), {
      userId: 'u1',
      context: { jobId: 'job1', batchId: 'b1', photos: '1' },
    })
  })

  it('does not burn the retry once the job budget has already expired', async () => {
    const parsePhotos = vi.fn(async (_client, _photos, opts: { externalSignal?: AbortSignal }) => {
      await new Promise((resolve) => setTimeout(resolve, 30))
      throw new Error(opts.externalSignal?.aborted ? 'aborted' : 'slow failure')
    })
    const deps = importDeps({ parsePhotos, importJobTimeoutMs: 10 })

    const outcome = await runImportForDoc(deps, 'job1')

    expect(outcome).toBe('failed')
    expect(parsePhotos).toHaveBeenCalledTimes(1)
  })

  it('reports a missing photo as the job failure rather than blaming the model', async () => {
    const fetchPhotos = vi.fn(async () => {
      throw new Error('Photo is no longer in storage (u1-123-abc.jpeg)')
    })
    const deps = importDeps({ fetchPhotos })

    const outcome = await runImportForDoc(deps, 'job1')

    expect(outcome).toBe('failed')
    expect(deps.parsePhotos).not.toHaveBeenCalled()
    expect(deps.store.failImport).toHaveBeenCalledWith(
      'job1',
      'Photo is no longer in storage (u1-123-abc.jpeg)',
    )
  })

  it('does not throw when the failure write itself fails', async () => {
    const store = fakeStore({
      failImport: vi.fn(async () => {
        throw new Error('Firestore unavailable')
      }),
    })
    const deps = importDeps({
      store,
      parsePhotos: vi.fn(async () => {
        throw new Error('nope')
      }),
    })

    await expect(runImportForDoc(deps, 'job1')).resolves.toBe('failed')
  })
})
