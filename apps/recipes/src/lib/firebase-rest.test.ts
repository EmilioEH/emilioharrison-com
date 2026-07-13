import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FirebaseRestService } from './firebase-rest'

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      importKey: vi.fn().mockResolvedValue({}),
      sign: vi.fn().mockResolvedValue(new ArrayBuffer(10)),
    },
  },
})

describe('FirebaseRestService', () => {
  let service: FirebaseRestService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new FirebaseRestService({
      project_id: 'test-project',
      client_email: 'test@example.com',
      private_key:
        '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDb...\n-----END PRIVATE KEY-----',
      token_uri: 'https://oauth2.googleapis.com/token',
    } as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    // Mock getAccessToken to avoid real auth calls
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(service as any).token = 'mock-token'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(service as any).tokenExpiresAt = Date.now() / 1000 + 3600
  })

  it('should serialize integers as strings for Firestore integerValue', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
    global.fetch = fetchMock

    await service.createDocument('test-collection', 'doc-id', {
      count: 42,
      dimensions: { width: 1920, height: 1080 },
    })

    const callArgs = fetchMock.mock.calls[0]
    const body = JSON.parse(callArgs[1].body)

    expect(body.fields.count).toEqual({ integerValue: '42' })
    expect(body.fields.dimensions.mapValue.fields.width).toEqual({ integerValue: '1920' })
    expect(body.fields.dimensions.mapValue.fields.height).toEqual({ integerValue: '1080' })
  })

  it('should verify exact feedback payload structure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
    global.fetch = fetchMock

    const feedbackPayload = {
      id: '123',
      type: 'bug',
      description: 'test',
      context: {
        url: 'https://example.com',
        windowSize: { width: '1024', height: '768' }, // Strings now
        userAgent: 'Mozilla/5.0 ...',
      },
      logs: [
        { type: 'info', args: ['User logged in'], timestamp: '2023-01-01' },
        { type: 'error', args: ['Failed'], timestamp: '2023-01-01' },
      ],
      timestamp: '2023-01-01',
    }

    await service.createDocument('feedback', '123', feedbackPayload)

    const callArgs = fetchMock.mock.calls[0]
    const body = JSON.parse(callArgs[1].body)

    // Check windowSize strings - should now be stringValue
    const contextFields = body.fields.context.mapValue.fields
    expect(contextFields.windowSize.mapValue.fields.width).toEqual({ stringValue: '1024' })
    expect(contextFields.windowSize.mapValue.fields.height).toEqual({ stringValue: '768' })

    // Check logs serialization
    const logsList = body.fields.logs.arrayValue.values
    expect(logsList).toHaveLength(2)
    expect(logsList[0].mapValue.fields.type).toEqual({ stringValue: 'info' })
  })

  describe('runQuery', () => {
    it('builds a structured query against :runQuery, not a full collection GET', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      })
      global.fetch = fetchMock

      await service.runQuery('recipes', { field: 'createdBy', op: 'IN', value: ['user-1'] })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(
        'https://firestore.googleapis.com/v1/projects/test-project/databases/(default)/documents:runQuery',
      )
      expect(init.method).toBe('POST')

      const body = JSON.parse(init.body)
      expect(body.structuredQuery.from).toEqual([{ collectionId: 'recipes' }])
      expect(body.structuredQuery.where.fieldFilter).toEqual({
        field: { fieldPath: 'createdBy' },
        op: 'IN',
        value: { arrayValue: { values: [{ stringValue: 'user-1' }] } },
      })
    })

    it('encodes an EQUAL/null filter as a unaryFilter (for legacy-recipe backfilled documents)', async () => {
      // Firestore's REST API rejects a plain fieldFilter/EQUAL comparison against null with a
      // 400 — it must be expressed as unaryFilter/IS_NULL instead. This is the one wire-format
      // detail a mocked-fetch test can't verify against real Firestore, but it at least locks in
      // the correct shape so a future refactor can't silently regress it back to fieldFilter.
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
      global.fetch = fetchMock

      await service.runQuery('recipes', { field: 'createdBy', op: 'EQUAL', value: null })

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.structuredQuery.where.unaryFilter).toEqual({
        field: { fieldPath: 'createdBy' },
        op: 'IS_NULL',
      })
      expect(body.structuredQuery.where.fieldFilter).toBeUndefined()
    })

    it('maps Firestore runQuery response documents into plain objects with an id', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            document: {
              name: 'projects/test-project/databases/(default)/documents/recipes/abc',
              fields: { title: { stringValue: 'Tacos' } },
            },
          },
          // Firestore can include result entries with no `document` (e.g. skipped results) —
          // these must be filtered out, not crash the mapping.
          {},
        ],
      })
      global.fetch = fetchMock

      const results = await service.runQuery('recipes', {
        field: 'createdBy',
        op: 'IN',
        value: ['user-1'],
      })

      expect(results).toEqual([{ id: 'abc', title: 'Tacos' }])
    })

    it('throws when the request fails', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        text: async () => 'index not found',
      })
      global.fetch = fetchMock

      await expect(
        service.runQuery('recipes', { field: 'createdBy', op: 'IN', value: ['user-1'] }),
      ).rejects.toThrow('index not found')
    })
  })
})
