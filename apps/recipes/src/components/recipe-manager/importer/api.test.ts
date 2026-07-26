import { describe, it, expect, vi } from 'vitest'
import { parseRecipe } from './api'

/** Builds a fetch Response whose body is a ReadableStream emitting the given NDJSON chunks,
 * then either closes normally or errors (simulating a dropped connection / stream failure
 * mid-response, as parse-recipe.ts now does when the final structuring phase fails). Uses
 * `pull` (one chunk per call) rather than enqueueing everything in `start` — erroring a stream
 * clears its unread internal queue per spec, so chunks enqueued before an immediate `start`-time
 * error would never actually reach the reader, unlike a real over-the-wire response where each
 * chunk is read before the next arrives. */
function makeStreamResponse(chunks: string[], errorAtEnd?: Error) {
  const encoder = new TextEncoder()
  let index = 0
  const stream = new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]))
        index++
        return
      }
      if (errorAtEnd) {
        controller.error(errorAtEnd)
      } else {
        controller.close()
      }
    },
  })
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('parseRecipe — stream salvage (regression: hollow-recipe corruption bug)', () => {
  it('rejects rather than silently succeeding when structuring never produced a title', async () => {
    // Ingredients + steps OCR'd fine, but the stream errors before structuring (phase 3) ever
    // emits a title — previously this was "salvaged" into a fake success.
    const chunks = [
      JSON.stringify({ _p: 1, ingredients: ['1 cup flour'] }) + '\n',
      JSON.stringify({ _p: 2, steps: ['Mix.'] }) + '\n',
    ]
    global.fetch = vi
      .fn()
      .mockResolvedValue(makeStreamResponse(chunks, new Error('phase 3 failed')))

    await expect(
      parseRecipe({ image: 'data:image/jpeg;base64,ZmFrZQ==' }, '/base/'),
    ).rejects.toThrow()
  })

  it('salvages partial data once a title has been produced, preserving the partialFailure flag', async () => {
    const chunks = [
      JSON.stringify({ _p: 1, ingredients: ['1 cup flour'] }) + '\n',
      JSON.stringify({ _p: 3, title: 'Salvaged Recipe', partialFailure: 'instructions' }) + '\n',
    ]
    global.fetch = vi
      .fn()
      .mockResolvedValue(makeStreamResponse(chunks, new Error('connection dropped')))

    const result = await parseRecipe({ image: 'data:image/jpeg;base64,ZmFrZQ==' }, '/base/')

    expect((result.data as Record<string, unknown>).title).toBe('Salvaged Recipe')
    expect((result.data as Record<string, unknown>).partialFailure).toBe('instructions')
  })

  it('preserves AbortError semantics instead of wrapping cancellation into a generic error', async () => {
    const abortError = Object.assign(new Error('The operation was aborted'), {
      name: 'AbortError',
    })
    global.fetch = vi.fn().mockResolvedValue(makeStreamResponse([], abortError))

    await expect(
      parseRecipe({ image: 'data:image/jpeg;base64,ZmFrZQ==' }, '/base/'),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('returns a full success unchanged when every phase completes normally', async () => {
    const chunks = [
      JSON.stringify({ _p: 1, ingredients: ['1 cup flour'] }) + '\n',
      JSON.stringify({ _p: 2, steps: ['Mix.'] }) + '\n',
      JSON.stringify({ _p: 3, title: 'Complete Recipe', servings: 4 }) + '\n',
    ]
    global.fetch = vi.fn().mockResolvedValue(makeStreamResponse(chunks))

    const result = await parseRecipe({ image: 'data:image/jpeg;base64,ZmFrZQ==' }, '/base/')

    expect((result.data as Record<string, unknown>).title).toBe('Complete Recipe')
    expect((result.data as Record<string, unknown>).partialFailure).toBeUndefined()
  })

  it('skips a line split across chunk boundaries rather than losing the whole phase', async () => {
    // Simulates a chunk boundary landing mid-line — readNdjsonStream buffers until it sees a
    // newline, so this should merge cleanly, not drop or corrupt the phase-3 payload.
    const full = JSON.stringify({ _p: 3, title: 'Chunked Recipe' }) + '\n'
    const chunks = [full.slice(0, 10), full.slice(10)]
    global.fetch = vi.fn().mockResolvedValue(makeStreamResponse(chunks))

    const result = await parseRecipe({ image: 'data:image/jpeg;base64,ZmFrZQ==' }, '/base/')

    expect((result.data as Record<string, unknown>).title).toBe('Chunked Recipe')
  })

  it('reports a progress message for each phase marker as it streams in', async () => {
    const chunks = [
      JSON.stringify({ _p: 1, ingredients: [] }) + '\n',
      JSON.stringify({ _p: 3, title: 'Progress Recipe' }) + '\n',
    ]
    global.fetch = vi.fn().mockResolvedValue(makeStreamResponse(chunks))
    const onProgress = vi.fn()

    await parseRecipe({ image: 'data:image/jpeg;base64,ZmFrZQ==' }, '/base/', undefined, onProgress)

    expect(onProgress).toHaveBeenCalledWith('Read the ingredients... (20%)')
    expect(onProgress).toHaveBeenCalledWith('Finalizing recipe details... (100%)')
  })

  it('reports moving progress while the structuring phase streams', async () => {
    // The bar used to sit at a fixed percentage for the ~60s that phase 3 takes, which looks
    // exactly like a hung import.
    const chunks = [
      JSON.stringify({ _p: 1, ingredients: [] }) + '\n',
      JSON.stringify({ _p: 2, steps: [] }) + '\n',
      JSON.stringify({ _t: 0.1 }) + '\n',
      JSON.stringify({ _t: 0.8 }) + '\n',
      JSON.stringify({ _p: 3, title: 'Progress Recipe' }) + '\n',
    ]
    global.fetch = vi.fn().mockResolvedValue(makeStreamResponse(chunks))
    const onProgress = vi.fn()

    await parseRecipe({ image: 'data:image/jpeg;base64,ZmFrZQ==' }, '/base/', undefined, onProgress)

    const percentages = onProgress.mock.calls
      .map((call) => /\((\d+)%\)/.exec(String(call[0]))?.[1])
      .filter((value): value is string => Boolean(value))
      .map(Number)
    // Strictly increasing — a bar that goes backwards is worse than one that doesn't move.
    expect(percentages).toEqual([...percentages].sort((a, b) => a - b))
    expect(onProgress).toHaveBeenCalledWith('Structuring the recipe... (41%)')
    expect(onProgress).toHaveBeenCalledWith('Structuring the recipe... (83%)')
  })

  it('never merges a progress marker onto the recipe', async () => {
    // `Object.assign` folds in every key it is handed, so a `_t` reaching the merge would write a
    // stray field onto the saved recipe. The import pipeline was stabilised in #65–#68 after a
    // run of exactly this kind of bug.
    const chunks = [
      JSON.stringify({ _t: 0.5 }) + '\n',
      JSON.stringify({ _p: 3, title: 'Clean Recipe' }) + '\n',
    ]
    global.fetch = vi.fn().mockResolvedValue(makeStreamResponse(chunks))

    const result = await parseRecipe({ image: 'data:image/jpeg;base64,ZmFrZQ==' }, '/base/')

    const data = result.data as Record<string, unknown>
    expect(data).not.toHaveProperty('_t')
    expect(data.title).toBe('Clean Recipe')
  })
})

describe('parseRecipe — non-OK response', () => {
  it('throws the server-provided error message', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Too many imports. Please try again later.' }), {
        status: 429,
        statusText: 'Too Many Requests',
      }),
    )

    await expect(parseRecipe({ url: 'https://example.com' }, '/base/')).rejects.toThrow(
      'Too many imports. Please try again later.',
    )
  })

  it('falls back to the raw status line when the error body is not the expected shape', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response('not json', { status: 500, statusText: 'Server Error' }))

    await expect(parseRecipe({ url: 'https://example.com' }, '/base/')).rejects.toThrow(
      'Failed: 500 Server Error',
    )
  })
})

describe('parseRecipe — response metadata', () => {
  it('carries the source URL and candidate images from response headers into the result', async () => {
    const chunks = [JSON.stringify({ _p: 3, title: 'From URL' }) + '\n']
    const res = makeStreamResponse(chunks)
    res.headers.set('X-Source-Url', 'https://example.com/recipe')
    res.headers.set(
      'X-Candidate-Images',
      JSON.stringify([{ url: 'https://example.com/img.jpg', isDefault: true }]),
    )
    global.fetch = vi.fn().mockResolvedValue(res)

    const result = await parseRecipe({ url: 'https://example.com/recipe' }, '/base/')

    expect((result.data as Record<string, unknown>).sourceUrl).toBe('https://example.com/recipe')
    expect(result.candidateImages).toEqual([
      { url: 'https://example.com/img.jpg', isDefault: true },
    ])
  })

  it('ignores an unparseable candidate-images header instead of failing the import', async () => {
    const chunks = [JSON.stringify({ _p: 3, title: 'Bad Header Recipe' }) + '\n']
    const res = makeStreamResponse(chunks)
    res.headers.set('X-Candidate-Images', 'not valid json')
    global.fetch = vi.fn().mockResolvedValue(res)

    const result = await parseRecipe({ url: 'https://example.com' }, '/base/')

    expect((result.data as Record<string, unknown>).title).toBe('Bad Header Recipe')
    expect(result.candidateImages).toBeUndefined()
  })
})

describe('parseRecipe — non-streaming fallback (no res.body)', () => {
  /** A fetch Response-like object with `body: null` — some environments (older Safari, certain
   * proxies) don't expose a streaming body even on a 200, which is what parseRecipe's `!res.body`
   * branch exists for. jsdom's real `Response` always has a body stream, so it can't produce this
   * case; a minimal fake is the only way to actually exercise `parseFromFullText`. */
  function fakeNonStreamingResponse(text: string): Response {
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      body: null,
      headers: new Headers(),
      text: async () => text,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  }

  it('parses NDJSON from the full text body when the environment exposes no stream', async () => {
    const text =
      JSON.stringify({ _p: 1, ingredients: ['flour'] }) +
      '\n' +
      JSON.stringify({ _p: 3, title: 'Full Text Recipe' }) +
      '\n'
    global.fetch = vi.fn().mockResolvedValue(fakeNonStreamingResponse(text))

    const result = await parseRecipe({ url: 'https://example.com' }, '/base/')

    expect((result.data as Record<string, unknown>).title).toBe('Full Text Recipe')
    expect((result.data as Record<string, unknown>).ingredients).toEqual(['flour'])
  })

  it('throws when the full text body is empty/unusable', async () => {
    global.fetch = vi.fn().mockResolvedValue(fakeNonStreamingResponse(''))

    await expect(parseRecipe({ url: 'https://example.com' }, '/base/')).rejects.toThrow(
      /Empty response/,
    )
  })
})
