import { describe, it, expect, vi } from 'vitest'
import { buildTextRecipeStream, buildImageRecipeStream } from './parse-recipe'
import {
  fakeOpenAiClient,
  readStream,
  readNdjsonLines,
} from '../../lib/services/openrouter-test-fake'

// The pipeline itself (model calls, prompts, validation) is tested in
// lib/services/parse-photo-core.test.ts. What's left here is the NDJSON wire format the browser
// importer consumes: phase ordering, progress markers, and erroring the stream loudly instead of
// closing it with half a recipe.

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

    // Exactly one model call — no OCR pipeline for non-image content.
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

  it('disables reasoning on the text/URL import path too', async () => {
    const { client, calls } = fakeOpenAiClient([
      JSON.stringify({ title: 'From A Link', ingredients: [], steps: [] }),
    ])

    await readStream(buildTextRecipeStream(client, { text: 'Some pasted recipe text' }, 'Instr'))

    expect(calls[0].reasoning).toEqual({ enabled: false })
  })
})

describe('buildImageRecipeStream — given already-resolved OCR phases', () => {
  it('streams the given phase1/phase2 immediately, then structures and streams phase3', async () => {
    const { client, calls } = fakeOpenAiClient([
      JSON.stringify({ title: 'Photo Recipe', servings: 4 }),
    ])

    const lines = await readNdjsonLines(
      buildImageRecipeStream(client, { ingredients: ['1 cup flour'] }, { steps: ['Mix it.'] }),
    )

    // Progress-only lines (`_t`) are interleaved while the structuring pass streams; the phase
    // markers themselves must still arrive in order.
    expect(lines.filter((l) => '_p' in l).map((l) => l._p)).toEqual([1, 2, 3])
    // Only the structuring pass calls the model — phase1/phase2 were already resolved.
    expect(calls).toHaveLength(1)
  })

  it('flags partialFailure when phase2 is null but structuring still succeeds', async () => {
    const { client } = fakeOpenAiClient([JSON.stringify({ title: 'Photo Recipe', servings: 4 })])

    const lines = await readNdjsonLines(
      buildImageRecipeStream(client, { ingredients: ['1 cup flour'] }, null),
    )

    // Only phases 1 and 3 are emitted — there was no phase 2 to send.
    expect(lines.filter((l) => '_p' in l).map((l) => l._p)).toEqual([1, 3])
    expect(lines.find((l) => l._p === 3)?.partialFailure).toBe('instructions')
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
    // The structuring pass legitimately returns everything *except* `ingredients` (observed in
    // the wild — the prompt asks for ~16 fields and the model drops one). Without normalization
    // the client keeps the raw OCR *strings*, and the editor's `${i.amount} ${i.name}` mapping
    // renders each one as the literal text "undefined".
    const { client } = fakeOpenAiClient([
      JSON.stringify({ title: 'Butzenina', servings: 4, structuredSteps: [{ text: 'Roast it.' }] }),
    ])

    const lines = await readNdjsonLines(
      buildImageRecipeStream(
        client,
        { ingredients: ['1 pork tenderloin', '4 cloves garlic'] },
        { steps: ['Roast it.'] },
      ),
    )
    const final = lines.find((l) => l._p === 3) as { ingredients: Array<{ name: string }> }

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
    // Page transcription grabs every paragraph on the card, including the intro blurb. The
    // structuring pass separates that into `description` vs real steps — but it was never asked
    // for `steps`, so the raw OCR paragraphs (blurb included) always won.
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

    const lines = await readNdjsonLines(
      buildImageRecipeStream(
        client,
        { ingredients: ['1 pork tenderloin'] },
        { steps: [blurb, 'Stuff the tenderloin with garlic.', 'Roast at 350F.'] },
      ),
    )
    const final = lines.find((l) => l._p === 3)

    expect(final?.steps).toEqual(['Stuff the tenderloin with garlic.', 'Roast at 350F.'])
    expect(final?.steps).not.toContain(blurb)
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

    const lines = await readNdjsonLines(
      buildImageRecipeStream(
        client,
        { ingredients: ['4 chicken thighs'] },
        { steps: [blurb, 'Pat the chicken thighs dry and season.'] },
      ),
    )
    const final = lines.find((l) => l._p === 3) as { steps: string[] }

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

    const lines = await readNdjsonLines(
      buildImageRecipeStream(client, { ingredients: ['1 pork tenderloin'] }, null),
    )

    expect(lines.find((l) => l._p === 3)?.steps).toEqual(['Stuff the tenderloin with garlic.'])
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

    const lines = await readNdjsonLines(
      buildImageRecipeStream(client, { ingredients: ['1 slice bread'] }, null),
    )

    expect(lines.find((l) => l._p === 3)?.steps).toEqual(['Toast the bread.', 'Butter it.'])
  })

  it('falls back to OCR steps when the structuring pass returns no structuredSteps', async () => {
    const { client } = fakeOpenAiClient([JSON.stringify({ title: 'Photo Recipe', servings: 4 })])

    const lines = await readNdjsonLines(
      buildImageRecipeStream(
        client,
        { ingredients: ['1 cup flour'] },
        { steps: ['Mix everything.', 'Bake it.'] },
      ),
    )

    expect(lines.find((l) => l._p === 3)?.steps).toEqual(['Mix everything.', 'Bake it.'])
  })
})
