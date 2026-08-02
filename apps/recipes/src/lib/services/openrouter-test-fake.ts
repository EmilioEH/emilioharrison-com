/**
 * A minimal fake of the OpenAI-compatible client the OpenRouter pipeline uses, plus a reader for
 * the NDJSON streams built on top of it. Shared by parse-photo-core.test.ts (the pipeline) and
 * api/parse-recipe.test.ts (the streaming wrapper) so the two describe the same client.
 *
 * Test-only, but it lives beside the code it fakes rather than under tests/ because those are the
 * Playwright E2E specs.
 */

/**
 * Yields each response in turn as a single streamed delta chunk, repeating the last one once the
 * list is exhausted (so a test only has to spell out the calls it cares about). Returns the
 * stand-in `client` (deliberately only the surface the pipeline touches, hence `any`) alongside
 * every request body it was sent, in order.
 */
export function fakeOpenAiClient(responses: string[]): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any
  calls: Array<Record<string, unknown>>
} {
  const calls: Array<Record<string, unknown>> = []
  let call = 0

  return {
    client: {
      chat: {
        completions: {
          create: async (request: Record<string, unknown>) => {
            calls.push(request)
            const text = responses[Math.min(call, responses.length - 1)]
            call++
            return {
              [Symbol.asyncIterator]: async function* () {
                yield { choices: [{ delta: { content: text } }] }
              },
            }
          },
        },
      },
    },
    calls,
  }
}

/** Drains an NDJSON ReadableStream to a string. */
export async function readStream(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let out = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    out += decoder.decode(value)
  }
  return out
}

/** Parses an NDJSON stream's output into one object per line. */
export async function readNdjsonLines(
  stream: ReadableStream,
): Promise<Array<Record<string, unknown>>> {
  const output = await readStream(stream)
  return output
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))
}
