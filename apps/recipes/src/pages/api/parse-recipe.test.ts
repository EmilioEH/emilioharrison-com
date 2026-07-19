import { describe, it, expect, vi } from 'vitest'
import {
  buildMessageContent,
  buildTextRecipeStream,
  buildImageRecipeStream,
  runImageOcrPhases,
} from './parse-recipe'

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

describe('buildTextRecipeStream — URL/text sources (single phase, no OCR)', () => {
  it('sends the actual page content to the model and returns a single merged phase', async () => {
    const { client, calls } = fakeOpenAiClient([
      JSON.stringify({ title: 'Real Recipe From URL', ingredients: [], steps: [] }),
    ])

    const stream = buildTextRecipeStream(
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

    const stream = buildTextRecipeStream(client, { text: 'some content' }, 'Instructions')
    const reader = stream.getReader()
    await expect(reader.read()).rejects.toThrow()
  })
})

describe('runImageOcrPhases', () => {
  it('returns both phases on success', async () => {
    const { client, calls } = fakeOpenAiClient([
      JSON.stringify({ ingredients: ['1 cup flour'] }),
      JSON.stringify({ steps: ['Mix everything.'] }),
    ])

    const result = await runImageOcrPhases(client, {
      inlineData: { mimeType: 'image/jpeg', data: 'ZmFrZQ==' },
    })

    expect(result).not.toBeNull()
    expect(result?.phase1.ingredients).toEqual(['1 cup flour'])
    expect(result?.phase2?.steps).toEqual(['Mix everything.'])
    expect(calls).toHaveLength(2)
  })

  it('returns null when ingredient OCR (phase 1) fails, regardless of phase 2', async () => {
    const { client } = fakeOpenAiClient(['not valid json {{{', 'not valid json {{{'])

    const result = await runImageOcrPhases(client, {
      inlineData: { mimeType: 'image/jpeg', data: 'ZmFrZQ==' },
    })

    expect(result).toBeNull()
  })

  it('still returns phase1 with a null phase2 when only instructions OCR fails', async () => {
    const { client } = fakeOpenAiClient([
      JSON.stringify({ ingredients: ['1 cup flour'] }),
      'not valid json {{{',
    ])

    const result = await runImageOcrPhases(client, {
      inlineData: { mimeType: 'image/jpeg', data: 'ZmFrZQ==' },
    })

    expect(result).not.toBeNull()
    expect(result?.phase1.ingredients).toEqual(['1 cup flour'])
    expect(result?.phase2).toBeNull()
  })
})

describe('buildImageRecipeStream — given already-resolved OCR phases', () => {
  it('streams the given phase1/phase2 immediately, then structures and streams phase3', async () => {
    const { client, calls } = fakeOpenAiClient([
      JSON.stringify({ title: 'Photo Recipe', servings: 4 }),
    ])

    const stream = buildImageRecipeStream(
      client,
      { ingredients: ['1 cup flour'] },
      { steps: ['Mix everything.'] },
    )
    const output = await readStream(stream)
    const lines = output
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l))

    expect(lines.map((l) => l._p)).toEqual([1, 2, 3])
    // Only the structuring pass calls the model — phase1/phase2 were already resolved.
    expect(calls).toHaveLength(1)
  })

  it('flags partialFailure when phase2 is null but structuring still succeeds', async () => {
    const { client } = fakeOpenAiClient([JSON.stringify({ title: 'Photo Recipe', servings: 4 })])

    const stream = buildImageRecipeStream(client, { ingredients: ['1 cup flour'] }, null)
    const output = await readStream(stream)
    const lines = output
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l))

    // Only phases 1 and 3 are emitted — there was no phase 2 to send.
    expect(lines.map((l) => l._p)).toEqual([1, 3])
    const finalPhase = lines.find((l) => l._p === 3)
    expect(finalPhase.partialFailure).toBe('instructions')
  })

  it('errors the stream (does not silently close) when the final structuring phase fails', async () => {
    const { client } = fakeOpenAiClient(['not valid json and not repairable {{{'])

    const stream = buildImageRecipeStream(
      client,
      { ingredients: ['1 cup flour'] },
      { steps: ['Mix everything.'] },
    )

    // Phases 1 and 2 stream fine before the failed phase 3 errors the stream.
    await expect(readStream(stream)).rejects.toThrow()
  })
})
