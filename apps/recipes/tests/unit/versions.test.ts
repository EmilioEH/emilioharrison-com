/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  GET as listVersions,
  POST as createVersion,
} from '../../src/pages/api/recipes/[id]/versions'
import { POST as restoreVersion } from '../../src/pages/api/recipes/[id]/restore'
import { db } from '../../src/lib/firebase-server'

// Mock firebase-server
vi.mock('../../src/lib/firebase-server', () => ({
  db: {
    getSubCollection: vi.fn(),
    addSubDocument: vi.fn(),
    getSubDocument: vi.fn(),
    getDocument: vi.fn(),
    updateDocument: vi.fn(),
  },
}))

describe('Version History API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.getSubCollection).mockResolvedValue([])
    vi.mocked(db.addSubDocument).mockResolvedValue('new-id')
  })

  describe('GET /versions', () => {
    it('should return sorted versions summary', async () => {
      vi.mocked(db.getSubCollection).mockResolvedValue([
        { id: 'v1', timestamp: '2023-01-01', changeType: 'edit', data: {} },
        { id: 'v2', timestamp: '2023-01-02', changeType: 'import', data: {} },
      ] as any)

      const response = await listVersions({ params: { id: 'r1' } } as any)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.versions).toHaveLength(2)
      // verify sorting (desc)
      expect(json.versions[0].id).toBe('v2')
      expect(json.versions[1].id).toBe('v1')
      // verify data is omitted from summary
      expect(json.versions[0].data).toBeUndefined()
    })
  })

  describe('POST /versions', () => {
    it('should create a new snapshot', async () => {
      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          changeType: 'manual-edit',
          data: { title: 'New Title' },
        }),
      })

      const response = await createVersion({ params: { id: 'r1' }, request } as any)
      expect(response.status).toBe(201)
      expect(db.addSubDocument).toHaveBeenCalledWith(
        'recipes',
        'r1',
        'versions',
        expect.any(String),
        expect.objectContaining({
          changeType: 'manual-edit',
          data: { title: 'New Title' },
        }),
      )
    })
  })

  describe('POST /restore', () => {
    it('should restore version and create safety snapshot', async () => {
      // Setup mocks
      vi.mocked(db.getSubDocument).mockResolvedValue({
        id: 'vOld',
        data: { title: 'Old Title' },
      } as any)

      vi.mocked(db.getDocument).mockResolvedValue({
        id: 'r1',
        title: 'Current Title',
      } as any)

      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ versionId: 'vOld' }),
      })

      const response = await restoreVersion({ params: { id: 'r1' }, request } as any)

      expect(response.status).toBe(200)

      // 1. Check safety snapshot created
      expect(db.addSubDocument).toHaveBeenCalledWith(
        'recipes',
        'r1',
        'versions',
        expect.any(String),
        expect.objectContaining({
          changeType: 'restore',
          data: expect.objectContaining({ title: 'Current Title' }), // Snapshot of PREVIOUS state
        }),
      )

      // 2. Check main doc updated
      expect(db.updateDocument).toHaveBeenCalledWith(
        'recipes',
        'r1',
        expect.objectContaining({ title: 'Old Title' }),
      )
    })
  })
})
