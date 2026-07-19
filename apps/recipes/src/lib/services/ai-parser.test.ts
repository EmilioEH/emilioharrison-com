import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { generateContent, initGeminiClient } = vi.hoisted(() => ({
  generateContent: vi.fn(),
  initGeminiClient: vi.fn(),
}))

vi.mock('../api-helpers', () => ({ initGeminiClient }))

import { resolveInput, executeAiParse, stripHtmlForPrompt } from './ai-parser'

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

describe('resolveInput / processImageInput — SSRF guard', () => {
  it('rejects a URL import pointed at a private IP without ever calling fetch', async () => {
    const fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch

    // eslint-disable-next-line sonarjs/no-clear-text-protocols -- testing SSRF-target rejection
    await expect(resolveInput({ url: 'http://169.254.169.254/latest/meta-data/' })).rejects.toThrow(
      /cannot be fetched/,
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a URL import pointed at localhost', async () => {
    const fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch

    await expect(resolveInput({ url: 'http://localhost:8080/admin' })).rejects.toThrow(
      /cannot be fetched/,
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects an absolute image URL pointed at a private IP without ever calling fetch', async () => {
    const fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch

    // eslint-disable-next-line sonarjs/no-clear-text-protocols -- testing SSRF-target rejection
    await expect(resolveInput({ image: 'http://10.0.0.5/internal-photo.jpg' })).rejects.toThrow(
      /cannot be fetched/,
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('still allows an ordinary public image URL through', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'image/jpeg' },
      arrayBuffer: async () => new TextEncoder().encode('bytes').buffer,
    })
    global.fetch = fetchMock as unknown as typeof fetch

    await resolveInput({ image: 'https://cdn.example.com/photo.jpg' })
    expect(fetchMock).toHaveBeenCalledWith('https://cdn.example.com/photo.jpg')
  })
})

describe('stripHtmlForPrompt', () => {
  it('strips script/style/comment noise while keeping the semantic body content', () => {
    const html = `
      <html>
        <head>
          <title>Best Steak Recipe</title>
          <style>.ad { display: none; }</style>
          <script>window.dataLayer = window.dataLayer || []; trackPageview();</script>
        </head>
        <body>
          <!-- ad slot -->
          <nav>Home / Recipes</nav>
          <h1>Best Steak Recipe</h1>
          <ul><li>1 lb steak</li><li>1 tsp salt</li></ul>
          <script>gtag('event', 'view');</script>
        </body>
      </html>
    `
    const result = stripHtmlForPrompt(html)

    expect(result).toContain('Best Steak Recipe')
    expect(result).toContain('1 lb steak')
    expect(result).not.toContain('trackPageview')
    expect(result).not.toContain('gtag')
    expect(result).not.toContain('display: none')
    expect(result).not.toContain('ad slot')
  })

  it('prepends the page title when present', () => {
    const html = '<html><head><title>Chicken Soup</title></head><body><p>Content</p></body></html>'
    const result = stripHtmlForPrompt(html)
    expect(result).toContain('<title>Chicken Soup</title>')
  })
})

describe('resolveInput — URL content is stripped before prompting', () => {
  it('sends stripped HTML (no scripts) rather than the raw page when there is no JSON-LD', async () => {
    const rawHtml = `
      <html>
        <head><script>trackEverything();</script></head>
        <body><h1>Grandma's Chili</h1><script>moreTracking();</script></body>
      </html>
    `
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => rawHtml,
    }) as unknown as typeof fetch

    const result = await resolveInput({ url: 'https://example.com/chili' })

    expect(result.contentPart.text).toContain("Grandma's Chili")
    expect(result.contentPart.text).not.toContain('trackEverything')
    expect(result.contentPart.text).not.toContain('moreTracking')
  })
})

describe('executeAiParse — response schema', () => {
  it('passes a canonical responseSchema to the Gemini call', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ title: 'Schema Recipe' }) })

    await executeAiParse({}, { text: 'Recipe text content' })

    const config = generateContent.mock.calls[0][0].config
    expect(config.responseSchema).toBeDefined()
    expect(config.responseSchema.properties.ingredients).toBeDefined()
    expect(config.responseSchema.properties.structuredSteps).toBeDefined()
  })

  it('disables Gemini thinking (latency: default dynamic thinking can add tens of seconds)', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ title: 'Fast Recipe' }) })

    await executeAiParse({}, { text: 'Recipe text content' })

    const config = generateContent.mock.calls[0][0].config
    expect(config.thinkingConfig).toEqual({ thinkingBudget: 0 })
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
