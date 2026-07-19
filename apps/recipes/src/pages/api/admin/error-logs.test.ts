import { describe, it, expect, vi, beforeEach } from 'vitest'

const { getCollection, deleteDocument } = vi.hoisted(() => ({
  getCollection: vi.fn(),
  deleteDocument: vi.fn(),
}))
vi.mock('../../../lib/firebase-server', () => ({
  db: { getCollection, deleteDocument },
}))

const { verifyAdmin } = vi.hoisted(() => ({ verifyAdmin: vi.fn() }))
vi.mock('../../../lib/auth-admin', () => ({ verifyAdmin }))

import { GET, DELETE } from './error-logs'

function fakeContext() {
  return {
    request: new Request('http://localhost/api/admin/error-logs'),
    cookies: { get: () => undefined },
  } as unknown as Parameters<typeof GET>[0]
}

function makeEntry(i: number) {
  return {
    id: `e${i}`,
    feature: 'grocery',
    message: `error ${i}`,
    createdAt: new Date(Date.now() - i * 1000).toISOString(),
  }
}

describe('GET /api/admin/error-logs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    deleteDocument.mockResolvedValue(undefined)
  })

  it('returns 403 for non-admins', async () => {
    verifyAdmin.mockResolvedValue(null)
    const res = await GET(fakeContext())
    expect(res.status).toBe(403)
    expect(getCollection).not.toHaveBeenCalled()
  })

  it('returns the logged errors for admins', async () => {
    verifyAdmin.mockResolvedValue({ email: 'admin@example.com' })
    getCollection.mockResolvedValue([makeEntry(1), makeEntry(2)])

    const res = await GET(fakeContext())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.errors).toHaveLength(2)
  })

  it('caps the response at 50 entries', async () => {
    verifyAdmin.mockResolvedValue({ email: 'admin@example.com' })
    getCollection.mockResolvedValue(Array.from({ length: 80 }, (_, i) => makeEntry(i)))

    const res = await GET(fakeContext())
    const body = await res.json()
    expect(body.errors).toHaveLength(50)
  })

  it('returns an empty list when the collection does not exist yet', async () => {
    verifyAdmin.mockResolvedValue({ email: 'admin@example.com' })
    getCollection.mockRejectedValue(new Error('collection not found'))

    const res = await GET(fakeContext())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.errors).toEqual([])
  })
})

describe('DELETE /api/admin/error-logs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    deleteDocument.mockResolvedValue(undefined)
  })

  it('returns 403 for non-admins', async () => {
    verifyAdmin.mockResolvedValue(null)
    const res = await DELETE(fakeContext())
    expect(res.status).toBe(403)
    expect(deleteDocument).not.toHaveBeenCalled()
  })

  it('deletes every logged entry for admins', async () => {
    verifyAdmin.mockResolvedValue({ email: 'admin@example.com' })
    getCollection.mockResolvedValue([makeEntry(1), makeEntry(2), makeEntry(3)])

    const res = await DELETE(fakeContext())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deleted).toBe(3)
    expect(deleteDocument).toHaveBeenCalledTimes(3)
    expect(deleteDocument).toHaveBeenCalledWith('error_logs', 'e1')
  })
})
