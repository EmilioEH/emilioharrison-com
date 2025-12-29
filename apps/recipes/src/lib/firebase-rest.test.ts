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
        windowSize: { width: 1024, height: 768 }, // Integers
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

    // Check windowSize integers
    const contextFields = body.fields.context.mapValue.fields
    expect(contextFields.windowSize.mapValue.fields.width).toEqual({ integerValue: '1024' })
    expect(contextFields.windowSize.mapValue.fields.height).toEqual({ integerValue: '768' })

    // Check logs serialization
    const logsList = body.fields.logs.arrayValue.values
    expect(logsList).toHaveLength(2)
    expect(logsList[0].mapValue.fields.type).toEqual({ stringValue: 'info' })
  })
})
