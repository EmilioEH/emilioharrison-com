import { describe, it, expect, vi } from 'vitest'
import { isStale, sweepStuckJobs } from './reaper'
import type { WorkerStore } from './types'

describe('isStale', () => {
  const now = new Date('2026-07-20T00:10:00.000Z').getTime()

  it('is not stale within the deadline', () => {
    // claimed 5 min ago, deadline 10 min
    expect(isStale('2026-07-20T00:05:00.000Z', now, 10 * 60_000)).toBe(false)
  })

  it('is stale past the deadline', () => {
    // claimed 15 min ago, deadline 10 min
    expect(isStale('2026-07-19T23:55:00.000Z', now, 10 * 60_000)).toBe(true)
  })

  it('treats a missing or invalid claim timestamp as stale', () => {
    expect(isStale(undefined, now, 10 * 60_000)).toBe(true)
    expect(isStale('not-a-date', now, 10 * 60_000)).toBe(true)
  })
})

describe('sweepStuckJobs', () => {
  it('invokes both reaper queries and does not throw when one fails', async () => {
    const store = {
      reapStuckEnhancements: vi.fn(async () => 2),
      reapStuckGrocery: vi.fn(async () => {
        throw new Error('firestore blip')
      }),
    } as unknown as WorkerStore

    await expect(sweepStuckJobs(store, 600_000, Date.now())).resolves.toBeUndefined()
    expect(store.reapStuckEnhancements).toHaveBeenCalledWith(600_000, expect.any(Number))
  })
})
