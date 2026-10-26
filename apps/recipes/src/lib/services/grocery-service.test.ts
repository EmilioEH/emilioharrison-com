import { describe, it, expect, vi, beforeEach } from 'vitest'
import { triggerGroceryGeneration } from './grocery-service'
import { aiOperationStore, startAiOperation, updateAiOperation } from '../aiOperationStore'

const OP_ID = 'grocery-fam_2026-10-26'

describe('triggerGroceryGeneration', () => {
  beforeEach(() => {
    aiOperationStore.set({ operations: [] })
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 202 }))
  })

  it('does not start a second request while one is running', async () => {
    startAiOperation({ id: OP_ID, feature: 'grocery-list', cancelable: false })

    await triggerGroceryGeneration('2026-10-26', [{ id: 'r1' }], 'fam')

    expect(fetch).not.toHaveBeenCalled()
  })

  // Field report: tapping Retry on the "Failed to generate Smart List" banner did nothing — the
  // failed attempt stayed in the store and counted as "already running".
  it('runs again after a failed attempt, so Retry actually retries', async () => {
    startAiOperation({ id: OP_ID, feature: 'grocery-list', cancelable: false })
    updateAiOperation(OP_ID, { status: 'error', error: 'Failed to start generation' })

    await triggerGroceryGeneration('2026-10-26', [{ id: 'r1' }], 'fam')

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(aiOperationStore.get().operations).toEqual([])
  })

  it('records the server reason when the request is refused', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Failed to start generation: Quota exceeded.' }), {
        status: 500,
      }),
    )

    await triggerGroceryGeneration('2026-10-26', [{ id: 'r1' }], 'fam')

    expect(aiOperationStore.get().operations).toEqual([
      expect.objectContaining({
        id: OP_ID,
        status: 'error',
        error: 'Failed to start generation: Quota exceeded.',
      }),
    ])
  })
})
