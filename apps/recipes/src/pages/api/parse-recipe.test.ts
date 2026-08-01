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

  it('retries once on a transient transport failure and still returns a result', async () => {
    let call = 0
    const create = vi.fn(async () => {
      call += 1
      if (call === 1) {
        throw Object.assign(new Error('This operation was aborted'), { name: 'AbortError' })
      }
      return {
        [Symbol.asyncIterator]: async function* () {
          yield {
            choices: [{ delta: { content: JSON.stringify({ title: 'Recovered Recipe' }) } }],
          }
        },
      }
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = { chat: { completions: { create } } } as any

    const stream = buildTextRecipeStream(client, { text: 'some content' }, 'Instructions')
    const parsed = JSON.parse((await readStream(stream)).trim())

    expect(parsed.title).toBe('Recovered Recipe')
    expect(create).toHaveBeenCalledTimes(2)
  })

  // This path (URL, JSON-LD, Reddit, pasted text — four of the five import sources) previously
  // applied NO validation at all: normalizeIngredients/normalizeSteps/title-plausibility only ran
  // on the photo-import path. A title-pollution or ingredient-shape bug fixed for photo import
  // could still happen, unfixed, here.
  describe('validation now applies here too (previously only the photo path had it)', () => {
    it('salvages a clean title from AI commentary, same as the photo path does', async () => {
      const polluted =
        'Buzhenina (Incomplete Recipe Extract from Image Source - Instructions truncated). Note: remaining steps inferred.'
      const { client } = fakeOpenAiClient([
        JSON.stringify({ title: polluted, ingredients: [{ name: 'pork', amount: '1' }] }),
      ])

      const stream = buildTextRecipeStream(client, { text: 'x' }, 'Instructions')
      const parsed = JSON.parse((await readStream(stream)).trim())

      expect(parsed.title).toBe('Buzhenina')
    })

    it('coerces raw string ingredients to objects instead of letting them render as "undefined"', async () => {
      const { client } = fakeOpenAiClient([
        JSON.stringify({ title: 'Test Recipe', ingredients: ['2 cups flour', '1 tsp salt'] }),
      ])

      const stream = buildTextRecipeStream(client, { text: 'x' }, 'Instructions')
      const parsed = JSON.parse((await readStream(stream)).trim())

      expect(parsed.ingredients).toEqual([
        { name: '2 cups flour', amount: '' },
        { name: '1 tsp salt', amount: '' },
      ])
    })

    it('strips a leading description echo from steps', async () => {
      const blurb = 'This is a simple weeknight dinner the whole family will enjoy.'
      const { client } = fakeOpenAiClient([
        JSON.stringify({
          title: 'Test Recipe',
          description: blurb,
          steps: [blurb, 'Preheat the oven.', 'Bake for 20 minutes.'],
        }),
      ])

      const stream = buildTextRecipeStream(client, { text: 'x' }, 'Instructions')
      const parsed = JSON.parse((await readStream(stream)).trim())

      expect(parsed.steps).toEqual(['Preheat the oven.', 'Bake for 20 minutes.'])
    })
  })
})

describe('runImageOcrPhases', () => {
  it('reads the page in a SINGLE call and returns both phases', async () => {
    // The image used to be sent twice — once for ingredients, once for instructions. Image input
    // dominates the cost of a vision request, so every import was billed for the photo twice.
    // This asserts the merge: one request, all three pieces.
    const { client, calls } = fakeOpenAiClient([
      JSON.stringify({
        ingredients: ['1 cup flour'],
        steps: ['Mix everything.'],
        headnote: 'A family favourite.',
      }),
    ])

    const result = await runImageOcrPhases(client, {
      inlineData: { mimeType: 'image/jpeg', data: 'ZmFrZQ==' },
    })

    expect(result).not.toBeNull()
    expect(result?.phase1.ingredients).toEqual(['1 cup flour'])
    expect(result?.phase2?.steps).toEqual(['Mix everything.'])
    expect(result?.phase2?.headnote).toBe('A family favourite.')
    expect(calls).toHaveLength(1)
  })

  it('sends the image exactly once, not once per field', async () => {
    const { client, calls } = fakeOpenAiClient([
      JSON.stringify({ ingredients: ['salt'], steps: ['Season.'], headnote: '' }),
    ])

    await runImageOcrPhases(client, { inlineData: { mimeType: 'image/jpeg', data: 'ZmFrZQ==' } })

    const withImage = calls.filter((c) => JSON.stringify(c.messages).includes('image_url'))
    expect(withImage).toHaveLength(1)
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

    // Progress-only lines (`_t`) are interleaved while phase 3 streams; the phase markers
    // themselves must still arrive in order.
    expect(lines.filter((l) => '_p' in l).map((l) => l._p)).toEqual([1, 2, 3])
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
    expect(lines.filter((l) => '_p' in l).map((l) => l._p)).toEqual([1, 3])
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

  // Field report (photo import): ingredients rendered as four literal "undefined" lines, and
  // the recipe's *description* prose appeared in the Instructions box. Both trace back to the
  // merged payload's shape rather than to OCR quality.
  it('emits object-shaped ingredients even when the structuring phase omits them', async () => {
    // Phase 3 legitimately returns everything *except* `ingredients` (observed in the wild —
    // the structuring prompt asks for ~16 fields and the model drops one). Without
    // normalization the client keeps phase 1's raw OCR *strings*, and the editor's
    // `${i.amount} ${i.name}` mapping renders each one as the literal text "undefined".
    const { client } = fakeOpenAiClient([
      JSON.stringify({ title: 'Butzenina', servings: 4, structuredSteps: [{ text: 'Roast it.' }] }),
    ])

    const stream = buildImageRecipeStream(
      client,
      { ingredients: ['1 pork tenderloin', '4 cloves garlic'] },
      { steps: ['Roast it.'] },
    )
    const lines = (await readStream(stream))
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l))
    const final = lines.find((l) => l._p === 3)

    expect(Array.isArray(final.ingredients)).toBe(true)
    for (const ing of final.ingredients) {
      expect(typeof ing).toBe('object')
      expect(typeof ing.name).toBe('string')
      expect(ing.name.length).toBeGreaterThan(0)
    }
    // The OCR'd text must survive the coercion, not be replaced by placeholders.
    expect(JSON.stringify(final.ingredients)).toContain('pork tenderloin')
  })

  it('derives steps from the structured pass so description prose does not stay in instructions', async () => {
    // Phase 2 OCR grabs every paragraph on the card, including the intro blurb. The structuring
    // pass separates that into `description` vs real steps — but phase 3 was never asked for
    // `steps`, so the raw OCR paragraphs (blurb included) always won.
    const blurb = 'Butzenina is a simple roasted pork tenderloin stuffed with garlic.'
    const { client } = fakeOpenAiClient([
      JSON.stringify({
        title: 'Butzenina',
        description: blurb,
        ingredients: [{ name: 'pork tenderloin', amount: '1' }],
        structuredSteps: [
          { text: 'Stuff the tenderloin with garlic.' },
          { text: 'Roast at 350F.' },
        ],
      }),
    ])

    const stream = buildImageRecipeStream(
      client,
      { ingredients: ['1 pork tenderloin'] },
      { steps: [blurb, 'Stuff the tenderloin with garlic.', 'Roast at 350F.'] },
    )
    const lines = (await readStream(stream))
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l))
    const final = lines.find((l) => l._p === 3)

    expect(final.steps).toEqual(['Stuff the tenderloin with garlic.', 'Roast at 350F.'])
    expect(final.steps).not.toContain(blurb)
  })

  it('prefers clean structuredSteps over a steps array polluted with the description', async () => {
    // Reproduces an actual post-deploy production import ("Chicken Thighs with Broccolini"):
    // the model returned BOTH `steps` and `structuredSteps`, but only `steps` had the intro
    // blurb glued on as steps[0]. The first fix preferred `steps`, so the dirty list won.
    const blurb =
      'Familiar flavors with a bit of color and acid make this an easy, delicious, and, dare I say, entertaining weeknight meal.'
    const { client } = fakeOpenAiClient([
      JSON.stringify({
        title: 'Chicken Thighs with Broccolini',
        description: blurb,
        ingredients: [{ name: 'chicken thighs', amount: '4' }],
        steps: [blurb, 'Pat the chicken thighs dry and season.', 'Heat the oil in a skillet.'],
        structuredSteps: [
          { text: 'Pat the chicken thighs dry and season.' },
          { text: 'Heat the oil in a skillet.' },
        ],
      }),
    ])

    const stream = buildImageRecipeStream(
      client,
      { ingredients: ['4 chicken thighs'] },
      {
        steps: [blurb, 'Pat the chicken thighs dry and season.'],
      },
    )
    const lines = (await readStream(stream))
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l))
    const final = lines.find((l) => l._p === 3)

    expect(final.steps).toEqual([
      'Pat the chicken thighs dry and season.',
      'Heat the oil in a skillet.',
    ])
    expect(final.steps[0]).not.toContain('Familiar flavors')
  })

  it('strips a leading description echo even when every list contains it', async () => {
    // Belt and braces: precedence alone can't help when the blurb is in *both* lists.
    const blurb =
      'Butzenina is a simple roasted pork tenderloin stuffed with garlic that is usually served cold.'
    const { client } = fakeOpenAiClient([
      JSON.stringify({
        title: 'Butzenina',
        description: blurb,
        structuredSteps: [{ text: blurb }, { text: 'Stuff the tenderloin with garlic.' }],
      }),
    ])

    const stream = buildImageRecipeStream(client, { ingredients: ['1 pork tenderloin'] }, null)
    const lines = (await readStream(stream))
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l))
    const final = lines.find((l) => l._p === 3)

    expect(final.steps).toEqual(['Stuff the tenderloin with garlic.'])
  })

  it('keeps the list intact when a genuine step merely resembles the description', async () => {
    // Guard against over-stripping: short steps must never be dropped by the echo check.
    const { client } = fakeOpenAiClient([
      JSON.stringify({
        title: 'Toast',
        description: 'Toast is a simple breakfast that is quick to make and endlessly adaptable.',
        structuredSteps: [{ text: 'Toast the bread.' }, { text: 'Butter it.' }],
      }),
    ])

    const stream = buildImageRecipeStream(client, { ingredients: ['1 slice bread'] }, null)
    const lines = (await readStream(stream))
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l))
    const final = lines.find((l) => l._p === 3)

    expect(final.steps).toEqual(['Toast the bread.', 'Butter it.'])
  })

  it('falls back to OCR steps when the structuring pass returns no structuredSteps', async () => {
    const { client } = fakeOpenAiClient([JSON.stringify({ title: 'Photo Recipe', servings: 4 })])

    const stream = buildImageRecipeStream(
      client,
      { ingredients: ['1 cup flour'] },
      { steps: ['Mix everything.', 'Bake it.'] },
    )
    const lines = (await readStream(stream))
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l))
    const final = lines.find((l) => l._p === 3)

    expect(final.steps).toEqual(['Mix everything.', 'Bake it.'])
  })
})

describe('instruction-OCR retry (field report: empty Instructions on a legible photo)', () => {
  it('retries the page read once when the first attempt yields no steps', async () => {
    // Field report: a legible cookbook page came back with an empty Instructions box. The model
    // is inconsistent here rather than the photo being unreadable, so it gets one more attempt.
    const { client, calls } = fakeOpenAiClient([
      JSON.stringify({ ingredients: ['4 teaspoons kosher salt'], steps: [] }),
      JSON.stringify({
        ingredients: ['4 teaspoons kosher salt'],
        steps: ['In a small bowl, stir together the salt and pepper.'],
      }),
    ])

    const phases = await runImageOcrPhases(client, {
      inlineData: { mimeType: 'image/png', data: 'x' },
    })

    expect(phases).not.toBeNull()
    expect(phases!.phase2?.steps).toEqual(['In a small bowl, stir together the salt and pepper.'])
    // One read plus one retry — still half what the two-call version cost on a normal import.
    expect(calls).toHaveLength(2)
  })

  it('does not retry instruction OCR when the first attempt already produced steps', async () => {
    const { client, calls } = fakeOpenAiClient([
      JSON.stringify({ ingredients: ['4 teaspoons kosher salt'] }),
      JSON.stringify({ steps: ['Preheat the oven to 350F.'] }),
    ])

    await runImageOcrPhases(client, { inlineData: { mimeType: 'image/png', data: 'x' } })

    expect(calls).toHaveLength(2)
  })
})

describe('reasoning is disabled on every OpenRouter call', () => {
  // Regression guard for the 2026-08-01 import-latency investigation. The model's dynamic
  // reasoning was adding tens of seconds of pre-output latency — enough that OCR runs exceeded
  // OCR_TIMEOUT_MS and structuring runs exceeded STRUCTURE_TIMEOUT_MS, failing the import — and
  // it also made transcription non-deterministic (one run invented ingredients and merged steps).
  // The Gemini path has always disabled thinking via `thinkingBudget: 0`; this is the OpenRouter
  // equivalent. If a future refactor drops it, imports get slow and unfaithful again, and the
  // symptom (an intermittent timeout on dense pages) is expensive to re-diagnose.
  const expectReasoningDisabled = (calls: Array<Record<string, unknown>>) => {
    expect(calls.length).toBeGreaterThan(0)
    for (const call of calls) {
      expect(call.reasoning).toEqual({ enabled: false })
    }
  }

  it('disables reasoning on the OCR call', async () => {
    const { client, calls } = fakeOpenAiClient([
      JSON.stringify({
        ingredients: ['4 teaspoons kosher salt'],
        steps: ['Preheat the oven to 350F.'],
      }),
    ])

    await runImageOcrPhases(client, { inlineData: { mimeType: 'image/png', data: 'x' } })

    expectReasoningDisabled(calls)
  })

  it('disables reasoning on the structuring call', async () => {
    const { client, calls } = fakeOpenAiClient([
      JSON.stringify({ title: 'Salted Something', ingredients: [], steps: [] }),
    ])

    await readStream(
      buildImageRecipeStream(
        client,
        { ingredients: ['4 teaspoons kosher salt'] },
        { steps: ['Preheat the oven to 350F.'], headnote: '' },
      ),
    )

    expectReasoningDisabled(calls)
  })

  it('disables reasoning on the text/URL import path too', async () => {
    const { client, calls } = fakeOpenAiClient([
      JSON.stringify({ title: 'From A Link', ingredients: [], steps: [] }),
    ])

    await readStream(
      buildTextRecipeStream(client, { text: 'Some pasted recipe text' }, 'Instructions'),
    )

    expectReasoningDisabled(calls)
  })
})
