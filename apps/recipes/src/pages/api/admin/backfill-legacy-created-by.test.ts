import { describe, it, expect, vi, beforeEach } from 'vitest'

const { getCollection, updateDocument } = vi.hoisted(() => ({
  getCollection: vi.fn(),
  updateDocument: vi.fn(),
}))

const { verifyAdmin } = vi.hoisted(() => ({
  verifyAdmin: vi.fn(),
}))

vi.mock('../../../lib/firebase-server', () => ({
  db: { getCollection, updateDocument },
}))

vi.mock('../../../lib/auth-admin', () => ({ verifyAdmin }))

import { GET, POST } from './backfill-legacy-created-by'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fakeContext(): any {
  return { request: new Request('http://localhost/api/admin/backfill-legacy-created-by') }
}

describe('GET/POST /api/admin/backfill-legacy-created-by', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET rejects non-admins with 403 and performs no reads', async () => {
    verifyAdmin.mockResolvedValue(null)

    const res = await GET(fakeContext())

    expect(res.status).toBe(403)
    expect(getCollection).not.toHaveBeenCalled()
  })

  it('GET returns dry-run counts for an admin without writing', async () => {
    verifyAdmin.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' })
    getCollection.mockResolvedValue([{ id: '1', createdBy: 'user-1' }, { id: '2' }])

    const res = await GET(fakeContext())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ total: 2, missing: 1, succeeded: 0, failed: 0, dryRun: true })
    expect(updateDocument).not.toHaveBeenCalled()
  })

  it('POST rejects non-admins with 403 and performs no writes', async () => {
    verifyAdmin.mockResolvedValue(null)

    const res = await POST(fakeContext())

    expect(res.status).toBe(403)
    expect(updateDocument).not.toHaveBeenCalled()
  })

  it('POST performs the backfill for an admin and returns the result', async () => {
    verifyAdmin.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' })
    getCollection.mockResolvedValue([{ id: '1', createdBy: 'user-1' }, { id: '2' }])
    updateDocument.mockResolvedValue(undefined)

    const res = await POST(fakeContext())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ total: 2, missing: 1, succeeded: 1, failed: 0, dryRun: false })
    expect(updateDocument).toHaveBeenCalledWith('recipes', '2', { createdBy: null })
  })

  it('POST returns 500 with the error message if the backfill throws', async () => {
    verifyAdmin.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' })
    getCollection.mockRejectedValue(new Error('Firestore unavailable'))

    const res = await POST(fakeContext())
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Firestore unavailable')
  })
})
