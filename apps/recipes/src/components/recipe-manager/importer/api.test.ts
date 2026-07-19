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
})
