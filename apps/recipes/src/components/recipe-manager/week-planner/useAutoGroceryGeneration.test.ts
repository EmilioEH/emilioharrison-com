import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

const { triggerGroceryGeneration } = vi.hoisted(() => ({ triggerGroceryGeneration: vi.fn() }))
vi.mock('../../../lib/services/grocery-service', () => ({ triggerGroceryGeneration }))

import { useAutoGroceryGeneration } from './useAutoGroceryGeneration'

const base = {
  active: true,
  signedIn: true,
  familyReady: true,
  scopeId: 'fam',
  listId: 'fam_2026-10-26',
  weekStart: '2026-10-26',
  recipes: [{ id: 'r1' }],
  scope: [{ id: 'r1' }],
  list: null,
  resolved: true,
  readError: false,
  processing: false,
  stuck: false,
  failed: false,
}

describe('useAutoGroceryGeneration', () => {
  beforeEach(() => triggerGroceryGeneration.mockClear())

  it('generates a week that has no list yet', () => {
    renderHook(() => useAutoGroceryGeneration(base))
    expect(triggerGroceryGeneration).toHaveBeenCalledTimes(1)
  })

  // Retry is allowed to re-run a failed request, so the automatic path must not: otherwise every
  // failure would fire the next attempt by itself, against an endpoint that is refusing.
  it('leaves a failed list for the Retry button rather than re-firing on its own', () => {
    renderHook(() => useAutoGroceryGeneration({ ...base, failed: true }))
    expect(triggerGroceryGeneration).not.toHaveBeenCalled()
  })
})
