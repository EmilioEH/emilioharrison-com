import { describe, it, expect } from 'vitest'
import { isGroceryGenerationStuck } from './grocery-stuck-detection'

describe('isGroceryGenerationStuck', () => {
  const now = new Date('2026-01-01T00:01:00.000Z').getTime()

  it('is not stuck when the status is not processing', () => {
    expect(isGroceryGenerationStuck('complete', '2026-01-01T00:00:00.000Z', now, 45_000)).toBe(
      false,
    )
    expect(isGroceryGenerationStuck('error', '2026-01-01T00:00:00.000Z', now, 45_000)).toBe(false)
    expect(isGroceryGenerationStuck(undefined, '2026-01-01T00:00:00.000Z', now, 45_000)).toBe(false)
  })

  it('is not stuck when there is no updatedAt to compare against', () => {
    expect(isGroceryGenerationStuck('processing', undefined, now, 45_000)).toBe(false)
  })

  it('is not stuck while processing within the threshold', () => {
    // now - updatedAt = 30s, threshold 45s
    expect(isGroceryGenerationStuck('processing', '2026-01-01T00:00:30.000Z', now, 45_000)).toBe(
      false,
    )
  })

  it('is stuck once processing has exceeded the threshold', () => {
    // now - updatedAt = 60s, threshold 45s
    expect(isGroceryGenerationStuck('processing', '2026-01-01T00:00:00.000Z', now, 45_000)).toBe(
      true,
    )
  })

  it('regression: a fresh retry (recent updatedAt) is not stuck even though status is still processing', () => {
    // This is the scenario that broke before the fix: a retry writes a brand-new 'processing'
    // doc with updatedAt ~= now. The old effect never re-evaluated staleness against the new
    // updatedAt once isStuck had latched true — this pure function has no memory of a prior
    // state, so it can't repeat that mistake.
    const freshUpdatedAt = new Date(now - 1000).toISOString() // 1s ago
    expect(isGroceryGenerationStuck('processing', freshUpdatedAt, now, 45_000)).toBe(false)
  })

  it('defaults to a threshold above the VM worker budget (120s), not just the Cloudflare one', () => {
    // 90s elapsed — well past the legacy Cloudflare budget, but a healthy VM-worker job can run
    // this long (WORKER_JOB_TIMEOUT_MS 120s, no waitUntil ceiling), so it must NOT be flagged.
    const updatedAt90sAgo = new Date(now - 90_000).toISOString()
    expect(isGroceryGenerationStuck('processing', updatedAt90sAgo, now)).toBe(false)

    // 140s elapsed — beyond even the worker's per-job budget plus margin, so this IS stuck.
    const updatedAt140sAgo = new Date(now - 140_000).toISOString()
    expect(isGroceryGenerationStuck('processing', updatedAt140sAgo, now)).toBe(true)
  })

  it('treats a long-stale pending doc (worker-path: never claimed) as stuck', () => {
    // Worker path only: a doc left `pending` means the VM worker never claimed it (worker down).
    const staleUpdatedAt = new Date(now - 140_000).toISOString()
    expect(isGroceryGenerationStuck('pending', staleUpdatedAt, now)).toBe(true)
    // ...but a freshly-enqueued pending doc (worker claims within ms normally) is not yet stuck.
    const freshUpdatedAt = new Date(now - 1000).toISOString()
    expect(isGroceryGenerationStuck('pending', freshUpdatedAt, now, 45_000)).toBe(false)
  })
})
