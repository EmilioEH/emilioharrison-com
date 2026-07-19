import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { generateContent, initGeminiClient } = vi.hoisted(() => ({
  generateContent: vi.fn(),
  initGeminiClient: vi.fn(),
}))

vi.mock('../api-helpers', () => ({ initGeminiClient }))

import { resolveInput, executeAiParse } from './ai-parser'

const originalFetch = global.fetch

beforeEach(() => {
  vi.clearAllMocks()
  initGeminiClient.mockResolvedValue({
    models: { generateContent },
  })
})

afterEach(() => {
  global.fetch = originalFetch
})

describe('resolveInput — image path resolution', () => {
  it('resolves a same-origin relative sourceImage using the provided origin', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'image/jpeg' },
      arrayBuffer: async () => new TextEncoder().encode('fake-image-bytes').buffer,
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const result = await resolveInput(
      { image: '/protected/recipes/api/uploads/abc123.jpg' },
      'https://emilioharrison.com',
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://emilioharrison.com/protected/recipes/api/uploads/abc123.jpg',
    )
    expect(result.contentPart.inlineData?.mimeType).toBe('image/jpeg')
    // sourceInfo preserves the original (relative) value for round-tripping onto the recipe.
    expect(result.sourceInfo.image).toBe('/protected/recipes/api/uploads/abc123.jpg')
  })

  it('throws a clear error for a relative sourceImage with no origin available', async () => {
    await expect(
      resolveInput({ image: '/protected/recipes/api/uploads/abc123.jpg' }),
    ).rejects.toThrow(/URL path instead of image bytes/)
  })

  it('still handles absolute http(s) image URLs directly', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'image/png' },
      arrayBuffer: async () => new TextEncoder().encode('fake-image-bytes').buffer,
    })
    global.fetch = fetchMock as unknown as typeof fetch

    await resolveInput({ image: 'https://cdn.example.com/photo.png' })

    expect(fetchMock).toHaveBeenCalledWith('https://cdn.example.com/photo.png')
  })

  it('still handles raw base64/data-URI images without touching fetch', async () => {
    const fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch

    const result = await resolveInput({ image: 'data:image/jpeg;base64,ZmFrZQ==' })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.contentPart.inlineData?.data).toBe('ZmFrZQ==')
    expect(result.contentPart.inlineData?.mimeType).toBe('image/jpeg')
  })
})

describe('resolveInput — text content', () => {
  it('carries the actual text content in contentPart.text', async () => {
    const result = await resolveInput({ text: 'Title: Test Recipe\nIngredients:\n- 1 egg' })
    expect(result.contentPart.text).toContain('Test Recipe')
    expect(result.contentPart.text).toContain('1 egg')
  })
})

describe('executeAiParse — forwards content to the model', () => {
  it('includes the recipe text in the request parts (regression: text was previously dropped)', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ title: 'Real Recipe' }) })

    await executeAiParse({}, { text: 'Title: Real Recipe\nIngredients:\n- 2 cups flour' })

    expect(generateContent).toHaveBeenCalledTimes(1)
    const callArgs = generateContent.mock.calls[0][0]
    const parts = callArgs.contents[0].parts
    const combinedText = parts.map((p: { text?: string }) => p.text || '').join('\n')

    expect(combinedText).toContain('Real Recipe')
    expect(combinedText).toContain('2 cups flour')
  })

  it('includes inline image data in the request parts for photo sources', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'image/jpeg' },
      arrayBuffer: async () => new TextEncoder().encode('bytes').buffer,
    }) as unknown as typeof fetch
    generateContent.mockResolvedValue({ text: JSON.stringify({ title: 'Photo Recipe' }) })

    await executeAiParse({}, { image: 'https://cdn.example.com/photo.jpg' })

    const parts = generateContent.mock.calls[0][0].contents[0].parts
    expect(parts.some((p: { inlineData?: unknown }) => p.inlineData)).toBe(true)
  })

  it('threads the origin through to resolve a relative sourceImage', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'image/jpeg' },
      arrayBuffer: async () => new TextEncoder().encode('bytes').buffer,
    })
    global.fetch = fetchMock as unknown as typeof fetch
    generateContent.mockResolvedValue({ text: JSON.stringify({ title: 'Recipe' }) })

    await executeAiParse(
      {},
      { image: '/protected/recipes/api/uploads/xyz.jpg' },
      'https://emilioharrison.com',
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://emilioharrison.com/protected/recipes/api/uploads/xyz.jpg',
    )
  })
})
