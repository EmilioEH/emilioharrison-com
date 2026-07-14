import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FirebaseRestService } from './firebase-rest'
import { getRequestContext } from './request-context'

vi.mock('./request-context', () => ({
  getRequestContext: vi.fn(() => null),
}))

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      importKey: vi.fn().mockResolvedValue({}),
      sign: vi.fn().mockResolvedValue(new ArrayBuffer(10)),
    },
  },
})

const FAKE_SERVICE_ACCOUNT = {
  project_id: 'test-project',
  client_email: 'test@example.com',
  // Must be valid base64 (no placeholder "..." like the fixture below) — these tests exercise
  // the real getAccessToken() signing path (`atob`), unlike the outer describe block's `service`,
  // which pre-seeds `token`/`tokenExpiresAt` and never reaches this code.
  private_key:
    '-----BEGIN PRIVATE KEY-----\nZHVtbXktcHJpdmF0ZS1rZXktbWF0ZXJpYWwtZm9yLXRlc3RzLTAxMjM0NTY3ODk=\n-----END PRIVATE KEY-----',
  token_uri: 'https://oauth2.googleapis.com/token',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any

/** Minimal in-memory fake of the Cloudflare KV binding, shared across service instances the way
 * a real `SESSION` KV namespace would be shared across Worker isolates. */
function makeFakeKv() {
  const store = new Map<string, string>()
  const ttlByKey = new Map<string, number | undefined>()
  return {
    get: vi.fn(async (key: string, type?: string) => {
      const raw = store.get(key)
      if (raw === undefined) return null
      return type === 'json' ? JSON.parse(raw) : raw
    }),
    put: vi.fn(async (key: string, value: string, options?: { expirationTtl?: number }) => {
      store.set(key, value)
      ttlByKey.set(key, options?.expirationTtl)
    }),
    ttlByKey,
  }
}

function docResponse(id: string) {
  return {
    ok: true,
    json: async () => ({
      name: `projects/test-project/databases/(default)/documents/recipes/${id}`,
      fields: {},
    }),
  }
}

function oauthResponse(accessToken: string) {
  return { ok: true, json: async () => ({ access_token: accessToken, expires_in: 3600 }) }
}

describe('FirebaseRestService', () => {
  let service: FirebaseRestService

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getRequestContext).mockReturnValue(null)
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

  // KV-cached OAuth token (PERFORMANCE-PLAN.md P6+P7). These tests construct *fresh*
  // FirebaseRestService instances (no pre-seeded `token`/`tokenExpiresAt`, unlike `service` in
  // the outer `beforeEach`) so `getAccessToken()`'s real cold-start logic actually runs.
  describe('KV-cached access token', () => {
    it('mints a token and writes it to KV when nothing is cached yet', async () => {
      const fakeKv = makeFakeKv()
      vi.mocked(getRequestContext).mockReturnValue({
        locals: { runtime: { env: { SESSION: fakeKv } } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'freshly-minted-token', expires_in: 3600 }),
        })
        .mockResolvedValueOnce(docResponse('doc1'))
      global.fetch = fetchMock

      const cold = new FirebaseRestService(FAKE_SERVICE_ACCOUNT)
      await cold.getDocument('recipes', 'doc1')

      // First fetch call is the OAuth exchange, Authorization header on the second (Firestore)
      // call proves the newly-minted token was actually used.
      expect(fetchMock.mock.calls[0][0]).toBe('https://oauth2.googleapis.com/token')
      expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer freshly-minted-token')

      expect(fakeKv.put).toHaveBeenCalledTimes(1)
      const [key, value, options] = fakeKv.put.mock.calls[0]
      expect(key).toContain('test-project')
      const stored = JSON.parse(value)
      expect(stored.token).toBe('freshly-minted-token')
      // TTL must be strictly shorter than the token's real 3600s expiry.
      expect(options?.expirationTtl).toBeLessThan(3600)
      expect(options?.expirationTtl).toBe(3300) // 3600 - the 300s safety buffer
    })

    it('reads a cached token from KV instead of minting a new one', async () => {
      const fakeKv = makeFakeKv()
      const now = Math.floor(Date.now() / 1000)
      await fakeKv.put(
        'firestore_access_token:test-project',
        JSON.stringify({ token: 'kv-cached-token', expiresAt: now + 3000 }),
      )
      fakeKv.put.mockClear()

      vi.mocked(getRequestContext).mockReturnValue({
        locals: { runtime: { env: { SESSION: fakeKv } } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

      const fetchMock = vi.fn().mockResolvedValue(docResponse('doc1'))
      global.fetch = fetchMock

      const cold = new FirebaseRestService(FAKE_SERVICE_ACCOUNT)
      await cold.getDocument('recipes', 'doc1')

      // Only the Firestore GET happened — no OAuth exchange — and it used the cached token.
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock.mock.calls[0][0]).not.toBe('https://oauth2.googleapis.com/token')
      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer kv-cached-token')
      expect(fakeKv.put).not.toHaveBeenCalled()
    })

    it('two consecutive requests on cold isolates mint at most one real OAuth token', async () => {
      const fakeKv = makeFakeKv()
      vi.mocked(getRequestContext).mockReturnValue({
        locals: { runtime: { env: { SESSION: fakeKv } } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

      let oauthCalls = 0
      const fetchMock = vi.fn(async (url: string) => {
        if (url === 'https://oauth2.googleapis.com/token') {
          oauthCalls++
          return oauthResponse('shared-token')
        }
        return docResponse('doc1')
      })
      global.fetch = fetchMock as unknown as typeof fetch

      // Two independent instances simulate two separate (cold) Worker isolates that only share
      // the KV namespace, not in-memory state.
      const isolateA = new FirebaseRestService(FAKE_SERVICE_ACCOUNT)
      await isolateA.getDocument('recipes', 'doc1')

      const isolateB = new FirebaseRestService(FAKE_SERVICE_ACCOUNT)
      await isolateB.getDocument('recipes', 'doc1')

      expect(oauthCalls).toBe(1)
      expect(fakeKv.put).toHaveBeenCalledTimes(1)
    })

    it('never logs the token itself', async () => {
      const fakeKv = makeFakeKv()
      vi.mocked(getRequestContext).mockReturnValue({
        locals: { runtime: { env: { SESSION: fakeKv } } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'super-secret-token', expires_in: 3600 }),
        })
        .mockResolvedValueOnce(docResponse('doc1'))
      global.fetch = fetchMock

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const cold = new FirebaseRestService(FAKE_SERVICE_ACCOUNT)
      await cold.getDocument('recipes', 'doc1')

      const allLoggedArgs = [...logSpy.mock.calls, ...warnSpy.mock.calls, ...errorSpy.mock.calls]
        .flat()
        .map((arg) => JSON.stringify(arg))
        .join(' ')
      expect(allLoggedArgs).not.toContain('super-secret-token')

      logSpy.mockRestore()
      warnSpy.mockRestore()
      errorSpy.mockRestore()
    })

    it('falls back to minting normally when there is no KV binding available', async () => {
      vi.mocked(getRequestContext).mockReturnValue(null)

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'no-kv-token', expires_in: 3600 }),
        })
        .mockResolvedValueOnce(docResponse('doc1'))
      global.fetch = fetchMock

      const cold = new FirebaseRestService(FAKE_SERVICE_ACCOUNT)
      const doc = await cold.getDocument('recipes', 'doc1')

      expect(doc).toBeTruthy()
      expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer no-kv-token')
    })
  })
})
