import { describe, it, expect, vi, beforeEach } from 'vitest'

const { setDocument } = vi.hoisted(() => ({ setDocument: vi.fn() }))
vi.mock('../firebase-server', () => ({ db: { setDocument } }))

import { logAiError } from './ai-error-log'

describe('logAiError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setDocument.mockResolvedValue({})
  })

  it('persists feature, message, context, and userId to the error_logs collection', () => {
    logAiError('grocery', new Error('Gemini timed out'), {
      userId: 'user-1',
      context: { listId: 'fam1_2026-07-20' },
    })

    expect(setDocument).toHaveBeenCalledTimes(1)
    const [collection, id, entry] = setDocument.mock.calls[0]
    expect(collection).toBe('error_logs')
    expect(id).toBe(entry.id)
    expect(entry.feature).toBe('grocery')
    expect(entry.message).toBe('Gemini timed out')
    expect(entry.context).toEqual({ listId: 'fam1_2026-07-20' })
    expect(entry.userId).toBe('user-1')
    expect(typeof entry.createdAt).toBe('string')
  })

  it('stringifies non-Error values', () => {
    logAiError('photo-import', 'plain string failure')
    expect(setDocument.mock.calls[0][2].message).toBe('plain string failure')
  })

  it('omits context/userId fields entirely when not provided (Firestore-friendly, no undefineds)', () => {
    logAiError('refresh', new Error('boom'))
    const entry = setDocument.mock.calls[0][2]
    expect('context' in entry).toBe(false)
    expect('userId' in entry).toBe(false)
  })

  it('never throws or rejects, even when the Firestore write fails', async () => {
    setDocument.mockRejectedValue(new Error('Firestore is down'))
    expect(() => logAiError('enhancement', new Error('original failure'))).not.toThrow()
    // Let the rejected fire-and-forget write settle — an unhandled rejection here would fail
    // the test run.
    await new Promise((r) => setTimeout(r, 0))
  })
})
