import { describe, it, expect, vi } from 'vitest'
import { buildMessageContent, generateRecipeStream } from './parse-recipe'

/** A minimal fake OpenAI client whose streaming chat completion yields the given full text
 * as a single delta chunk, and records every request it was called with. */
function fakeOpenAiClient(responses: string[]) {
  const calls: Array<Record<string, unknown>> = []
  let call = 0
  return {
    client: {
      chat: {
        completions: {
          create: vi.fn(async (request: Record<string, unknown>) => {
            calls.push(request)
            const text = responses[Math.min(call, responses.length - 1)]
            call++
            return {
              [Symbol.asyncIterator]: async function* () {
                yield { choices: [{ delta: { content: text } }] }
              },
            }
          }),
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    calls,
  }
}

async function readStream(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let out = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    out += decoder.decode(value)
  }
  return out
}

describe('buildMessageContent', () => {
  it('attaches text content (regression: text was previously silently dropped)', () => {
    const content = buildMessageContent('Instructions here', { text: 'Actual page HTML/content' })
    const combined = content.map((c) => c.text).join('\n')
    expect(combined).toContain('Instructions here')
    expect(combined).toContain('Actual page HTML/content')
  })

  it('attaches inline image data for photo sources', () => {
    const content = buildMessageContent('Instructions', {
      inlineData: { mimeType: 'image/jpeg', data: 'ZmFrZQ==' },
    })
    expect(content.some((c) => c.type === 'image_url')).toBe(true)
  })

  it('ignores an empty contentPart', () => {
    const content = buildMessageContent('Instructions only', {})
    expect(content).toEqual([{ type: 'text', text: 'Instructions only' }])
  })
})

describe('generateRecipeStream — URL/text sources (single phase, no OCR)', () => {
  it('sends the actual page content to the model and returns a single merged phase', async () => {
    const { client, calls } = fakeOpenAiClient([
      JSON.stringify({ title: 'Real Recipe From URL', ingredients: [], steps: [] }),
    ])

    const stream = await generateRecipeStream(
      client,
      { text: 'Source URL: https://example.com\n\nHTML Content:\n<h1>Real Recipe</h1>' },
      'You are an expert Chef and Data Engineer...',
      'strict',
    )
    const output = await readStream(stream)
    const parsed = JSON.parse(output.trim())

    expect(parsed._p).toBe(3)
    expect(parsed.title).toBe('Real Recipe From URL')

    // Exactly one model call — no 3-phase OCR pipeline for non-image content.
    expect(calls).toHaveLength(1)
    const sentMessages = calls[0].messages as Array<{ content: unknown }>
    const sentText = JSON.stringify(sentMessages)
    expect(sentText).toContain('Real Recipe')
    expect(sentText).toContain('example.com')
  })

  it('errors the stream when the model returns nothing usable', async () => {
    const { client } = fakeOpenAiClient(['not valid json and not repairable {{{'])

    const stream = await generateRecipeStream(client, { text: 'some content' }, 'Instructions')
    const reader = stream.getReader()
    await expect(reader.read()).rejects.toThrow()
  })
})

describe('generateRecipeStream — photo sources (3-phase OCR pipeline, unchanged)', () => {
  it('runs three phases and streams three tagged chunks', async () => {
    const { client, calls } = fakeOpenAiClient([
      JSON.stringify({ ingredients: ['1 cup flour'] }),
      JSON.stringify({ steps: ['Mix everything.'] }),
      JSON.stringify({ title: 'Photo Recipe', servings: 4 }),
    ])

    const stream = await generateRecipeStream(
      client,
      { inlineData: { mimeType: 'image/jpeg', data: 'ZmFrZQ==' } },
      'unused for image mode',
    )
    const output = await readStream(stream)
    const lines = output
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l))

    expect(lines.map((l) => l._p)).toEqual([1, 2, 3])
    expect(calls).toHaveLength(3)
  })
})
