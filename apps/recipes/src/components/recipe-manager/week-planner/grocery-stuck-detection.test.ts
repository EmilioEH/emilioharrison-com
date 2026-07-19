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

  it('defaults to a threshold comfortably above the server-side Gemini timeout (60s)', () => {
    // 55s elapsed — within the server's own 60s budget, so this must not be considered stuck
    // under the default threshold used in the app.
    const updatedAt55sAgo = new Date(now - 55_000).toISOString()
    expect(isGroceryGenerationStuck('processing', updatedAt55sAgo, now)).toBe(false)
  })
})
