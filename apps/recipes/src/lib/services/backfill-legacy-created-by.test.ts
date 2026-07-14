import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runLegacyCreatedByBackfill } from './backfill-legacy-created-by'
import type { FirebaseRestService } from '../firebase-rest'

describe('runLegacyCreatedByBackfill', () => {
  const getCollection = vi.fn()
  const updateDocument = vi.fn()
  const db = { getCollection, updateDocument } as unknown as FirebaseRestService

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports counts without writing anything in dry-run mode', async () => {
    getCollection.mockResolvedValue([
      { id: '1', createdBy: 'user-1' },
      { id: '2' }, // missing createdBy
      { id: '3', createdBy: null }, // already backfilled — not "missing"
    ])

    const result = await runLegacyCreatedByBackfill(db, { dryRun: true })

    expect(result).toEqual({ total: 3, missing: 1, succeeded: 0, failed: 0, dryRun: true })
    expect(updateDocument).not.toHaveBeenCalled()
  })

  it('backfills only documents with createdBy entirely absent, leaving createdBy: null alone', async () => {
    getCollection.mockResolvedValue([
      { id: '1', createdBy: 'user-1' },
      { id: '2' },
      { id: '3', createdBy: null },
    ])
    updateDocument.mockResolvedValue(undefined)

    const result = await runLegacyCreatedByBackfill(db)

    expect(result).toEqual({ total: 3, missing: 1, succeeded: 1, failed: 0, dryRun: false })
    expect(updateDocument).toHaveBeenCalledTimes(1)
    expect(updateDocument).toHaveBeenCalledWith('recipes', '2', { createdBy: null })
  })

  it('is a no-op when nothing is missing createdBy', async () => {
    getCollection.mockResolvedValue([{ id: '1', createdBy: 'user-1' }])

    const result = await runLegacyCreatedByBackfill(db)

    expect(result).toEqual({ total: 1, missing: 0, succeeded: 0, failed: 0, dryRun: false })
    expect(updateDocument).not.toHaveBeenCalled()
  })

  it('counts individual failures without aborting the rest of the batch', async () => {
    getCollection.mockResolvedValue([{ id: '1' }, { id: '2' }, { id: '3' }])
    updateDocument.mockImplementation(async (_col: string, id: string) => {
      if (id === '2') throw new Error('Firestore write failed')
    })

    const result = await runLegacyCreatedByBackfill(db)

    expect(result.succeeded).toBe(2)
    expect(result.failed).toBe(1)
    expect(updateDocument).toHaveBeenCalledTimes(3)
  })

  it('chunks writes in batches of 10 instead of firing everything at once', async () => {
    const recipes = Array.from({ length: 25 }, (_, i) => ({ id: `r${i}` }))
    getCollection.mockResolvedValue(recipes)

    let maxConcurrent = 0
    let current = 0
    updateDocument.mockImplementation(async () => {
      current++
      maxConcurrent = Math.max(maxConcurrent, current)
      await Promise.resolve()
      current--
    })

    const result = await runLegacyCreatedByBackfill(db)

    expect(result.succeeded).toBe(25)
    expect(maxConcurrent).toBeLessThanOrEqual(10)
  })
})
