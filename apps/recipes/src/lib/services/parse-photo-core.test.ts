import { describe, it, expect, vi } from 'vitest'
import {
  buildMessageContent,
  photoFromContentPart,
  transcribePhotos,
  structureRecipeFromOcr,
  parsePhotosToRecipe,
  PhotoParseError,
} from './parse-photo-core'
import { fakeOpenAiClient } from './openrouter-test-fake'

const PHOTO = { mimeType: 'image/jpeg', data: 'ZmFrZQ==' }
const SECOND_PHOTO = { mimeType: 'image/jpeg', data: 'c2Vjb25k' }

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

describe('photoFromContentPart', () => {
  it('extracts the photo bytes from an image contentPart', () => {
    expect(photoFromContentPart({ inlineData: { mimeType: 'image/png', data: 'abc' } })).toEqual({
      mimeType: 'image/png',
      data: 'abc',
    })
  })

  it('returns null for URL/text sources, which must not take the photo path', () => {
    expect(photoFromContentPart({ text: 'some page content' })).toBeNull()
    expect(photoFromContentPart(undefined)).toBeNull()
  })
})

describe('transcribePhotos — one photo', () => {
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

    const result = await transcribePhotos(client, [PHOTO])

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

    await transcribePhotos(client, [PHOTO])

    const withImage = calls.filter((c) => JSON.stringify(c.messages).includes('image_url'))
    expect(withImage).toHaveLength(1)
  })

  it('returns null when ingredient OCR (phase 1) fails, regardless of phase 2', async () => {
    const { client } = fakeOpenAiClient(['not valid json {{{', 'not valid json {{{'])

    expect(await transcribePhotos(client, [PHOTO])).toBeNull()
  })

  it('returns null when given no photos at all', async () => {
    const { client, calls } = fakeOpenAiClient(['{}'])

    expect(await transcribePhotos(client, [])).toBeNull()
    expect(calls).toHaveLength(0)
  })

  it('still returns phase1 with a null phase2 when only instructions OCR fails', async () => {
    const { client } = fakeOpenAiClient([
      JSON.stringify({ ingredients: ['1 cup flour'] }),
      'not valid json {{{',
    ])

    const result = await transcribePhotos(client, [PHOTO])

    expect(result).not.toBeNull()
    expect(result?.phase1.ingredients).toEqual(['1 cup flour'])
    expect(result?.phase2).toBeNull()
  })

  it('does not tell the model the page is part of a spread', async () => {
    // A single photo must get the long-standing prompt verbatim — the continuation wording is
    // only correct when there really are other pages.
    const { client, calls } = fakeOpenAiClient([
      JSON.stringify({ ingredients: ['salt'], steps: ['Season.'] }),
    ])

    await transcribePhotos(client, [PHOTO])

    expect(JSON.stringify(calls[0].messages)).not.toContain('page 1 of')
  })
})

describe('transcribePhotos — a manually grouped spread', () => {
  it('reads each page once and concatenates them in page order', async () => {
    const { client, calls } = fakeOpenAiClient([
      JSON.stringify({
        ingredients: ['1 cup flour', '2 eggs'],
        steps: ['Mix everything.'],
        headnote: 'A family favourite.',
      }),
      JSON.stringify({
        ingredients: ['1 tsp salt'],
        steps: ['Bake for 20 minutes.'],
        headnote: '',
      }),
    ])

    const result = await transcribePhotos(client, [PHOTO, SECOND_PHOTO])

    expect(calls).toHaveLength(2)
    expect(result?.phase1.ingredients).toEqual(['1 cup flour', '2 eggs', '1 tsp salt'])
    expect(result?.phase2?.steps).toEqual(['Mix everything.', 'Bake for 20 minutes.'])
    // One recipe, one headnote — taken from the page that printed it.
    expect(result?.phase2?.headnote).toBe('A family favourite.')
  })

  it('tells the model which page it is looking at, so page 2 is not read as a whole recipe', async () => {
    const { client, calls } = fakeOpenAiClient([
      JSON.stringify({ ingredients: ['1 cup flour'], steps: [] }),
      JSON.stringify({ ingredients: [], steps: ['Bake it.'] }),
    ])

    await transcribePhotos(client, [PHOTO, SECOND_PHOTO])

    expect(JSON.stringify(calls[0].messages)).toContain('page 1 of 2')
    expect(JSON.stringify(calls[1].messages)).toContain('page 2 of 2')
  })

  it('survives a continuation page whose ingredient list is legitimately empty', async () => {
    // The common real layout: ingredients on the left page, method on the right.
    const { client } = fakeOpenAiClient([
      JSON.stringify({ ingredients: ['1 cup flour'], steps: [], headnote: '' }),
      JSON.stringify({ ingredients: [], steps: ['Bake it.'], headnote: '' }),
    ])

    const result = await transcribePhotos(client, [PHOTO, SECOND_PHOTO])

    expect(result?.phase1.ingredients).toEqual(['1 cup flour'])
    expect(result?.phase2?.steps).toEqual(['Bake it.'])
  })

  it('keeps the pages that did read when one page fails outright', async () => {
    const { client } = fakeOpenAiClient([
      JSON.stringify({ ingredients: ['1 cup flour'], steps: ['Mix it.'], headnote: '' }),
      'not valid json {{{',
    ])

    const result = await transcribePhotos(client, [PHOTO, SECOND_PHOTO])

    expect(result?.phase1.ingredients).toEqual(['1 cup flour'])
    expect(result?.phase2?.steps).toEqual(['Mix it.'])
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

    const phases = await transcribePhotos(client, [PHOTO])

    expect(phases).not.toBeNull()
    expect(phases!.phase2?.steps).toEqual(['In a small bowl, stir together the salt and pepper.'])
    // One read plus one retry — still half what the two-call version cost on a normal import.
    expect(calls).toHaveLength(2)
  })

  it('does not retry when the first attempt already produced steps', async () => {
    const { client, calls } = fakeOpenAiClient([
      JSON.stringify({ ingredients: ['4 teaspoons kosher salt'], steps: ['Preheat the oven.'] }),
    ])

    await transcribePhotos(client, [PHOTO])

    expect(calls).toHaveLength(1)
  })

  it('only retries a spread when NO page produced steps', async () => {
    // Ingredients-then-method spreads always have a step-less page; re-reading the whole group
    // for that would double the cost of every normal two-page import.
    const { client, calls } = fakeOpenAiClient([
      JSON.stringify({ ingredients: ['1 cup flour'], steps: [] }),
      JSON.stringify({ ingredients: [], steps: ['Bake it.'] }),
    ])

    await transcribePhotos(client, [PHOTO, SECOND_PHOTO])

    expect(calls).toHaveLength(2)
  })
})

describe('structureRecipeFromOcr', () => {
  it('returns the structured recipe without any streaming wire format on it', async () => {
    const { client, calls } = fakeOpenAiClient([
      JSON.stringify({ title: 'Photo Recipe', servings: 4 }),
    ])

    const recipe = await structureRecipeFromOcr(client, {
      phase1: { ingredients: ['1 cup flour'] },
      phase2: { steps: ['Mix everything.'], headnote: '' },
    })

    expect(recipe?.title).toBe('Photo Recipe')
    expect(recipe?.servings).toBe(4)
    expect(recipe).not.toHaveProperty('_p')
    // Text-only pass: the photo is not sent again.
    expect(JSON.stringify(calls[0].messages)).not.toContain('image_url')
  })

  it('hands the headnote over as the basis for the description, not as a step', async () => {
    const { client, calls } = fakeOpenAiClient([JSON.stringify({ title: 'Buzhenina' })])

    await structureRecipeFromOcr(client, {
      phase1: { ingredients: ['1 pork tenderloin'] },
      phase2: { steps: ['Roast it.'], headnote: 'Buzhenina is usually served cold.' },
    })

    expect(JSON.stringify(calls[0].messages)).toContain('Buzhenina is usually served cold.')
  })

  it('flags partialFailure when the instructions never transcribed', async () => {
    const { client } = fakeOpenAiClient([JSON.stringify({ title: 'Photo Recipe' })])

    const recipe = await structureRecipeFromOcr(client, {
      phase1: { ingredients: ['1 cup flour'] },
      phase2: null,
    })

    expect(recipe?.partialFailure).toBe('instructions')
  })

  it('returns null rather than raw OCR text when the model produces nothing usable', async () => {
    const { client } = fakeOpenAiClient(['not valid json and not repairable {{{'])

    const recipe = await structureRecipeFromOcr(client, {
      phase1: { ingredients: ['1 cup flour'] },
      phase2: { steps: ['Mix everything.'] },
    })

    expect(recipe).toBeNull()
  })

  it('reports the response length as it streams, for callers driving a progress bar', async () => {
    const { client } = fakeOpenAiClient([JSON.stringify({ title: 'Photo Recipe' })])
    const progress: number[] = []

    await structureRecipeFromOcr(
      client,
      { phase1: { ingredients: ['1 cup flour'] }, phase2: null },
      { onProgress: (chars) => progress.push(chars) },
    )

    expect(progress.length).toBeGreaterThan(0)
    expect(progress.at(-1)).toBeGreaterThan(0)
  })
})

describe('parsePhotosToRecipe — the whole pipeline in one call (used by the VM worker)', () => {
  it('transcribes then structures, returning a finished recipe', async () => {
    const { client, calls } = fakeOpenAiClient([
      JSON.stringify({
        ingredients: ['1 cup flour'],
        steps: ['Mix everything.'],
        headnote: 'A family favourite.',
      }),
      JSON.stringify({
        title: 'Photo Recipe',
        servings: 4,
        ingredients: [{ name: 'flour', amount: '1 cup' }],
        structuredSteps: [{ text: 'Mix everything.' }],
      }),
    ])

    const recipe = await parsePhotosToRecipe(client, [PHOTO])

    expect(recipe.title).toBe('Photo Recipe')
    expect(recipe.steps).toEqual(['Mix everything.'])
    // One transcription call plus one structuring call.
    expect(calls).toHaveLength(2)
  })

  it('parses a grouped spread as a single recipe with one structuring pass', async () => {
    const { client, calls } = fakeOpenAiClient([
      JSON.stringify({ ingredients: ['1 cup flour'], steps: [], headnote: '' }),
      JSON.stringify({ ingredients: ['1 tsp salt'], steps: ['Bake it.'], headnote: '' }),
      JSON.stringify({ title: 'Spread Recipe', structuredSteps: [{ text: 'Bake it.' }] }),
    ])

    const recipe = await parsePhotosToRecipe(client, [PHOTO, SECOND_PHOTO])

    expect(recipe.title).toBe('Spread Recipe')
    expect(calls).toHaveLength(3)
    // Both pages' ingredients reached the structuring prompt.
    const structurePrompt = JSON.stringify(calls[2].messages)
    expect(structurePrompt).toContain('1 cup flour')
    expect(structurePrompt).toContain('1 tsp salt')
  })

  it('throws with the transcribe stage when the photo cannot be read', async () => {
    const { client } = fakeOpenAiClient(['not valid json {{{'])

    await expect(parsePhotosToRecipe(client, [PHOTO])).rejects.toMatchObject({
      name: 'PhotoParseError',
      stage: 'transcribe',
    })
  })

  it('throws with the structure stage when only the structuring pass fails', async () => {
    // A caller with no stream to error must never be handed the raw OCR fragments as if they
    // were a recipe — that is the corruption the streaming path fails loudly to avoid.
    const { client } = fakeOpenAiClient([
      JSON.stringify({ ingredients: ['1 cup flour'], steps: ['Mix everything.'] }),
      'not valid json {{{',
    ])

    const error = await parsePhotosToRecipe(client, [PHOTO]).catch((e) => e)

    expect(error).toBeInstanceOf(PhotoParseError)
    expect(error.stage).toBe('structure')
  })
})

describe('reasoning is disabled on every OpenRouter call', () => {
  // Regression guard for the 2026-08-01 import-latency investigation. The model's dynamic
  // reasoning was adding tens of seconds of pre-output latency — enough that OCR runs exceeded
  // OCR_TIMEOUT_MS and structuring runs exceeded STRUCTURE_TIMEOUT_MS, failing the import. The
  // Gemini path has always disabled thinking via `thinkingBudget: 0`; this is the OpenRouter
  // equivalent. If a future refactor drops it, imports get slow again, and the symptom (an
  // intermittent timeout on dense pages) is expensive to re-diagnose.
  const expectReasoningDisabled = (calls: Array<Record<string, unknown>>) => {
    expect(calls.length).toBeGreaterThan(0)
    for (const call of calls) {
      expect(call.reasoning).toEqual({ enabled: false })
    }
  }

  it('disables reasoning on the transcription call', async () => {
    const { client, calls } = fakeOpenAiClient([
      JSON.stringify({
        ingredients: ['4 teaspoons kosher salt'],
        steps: ['Preheat the oven to 350F.'],
      }),
    ])

    await transcribePhotos(client, [PHOTO])

    expectReasoningDisabled(calls)
  })

  it('disables reasoning on the structuring call', async () => {
    const { client, calls } = fakeOpenAiClient([
      JSON.stringify({ title: 'Salted Something', ingredients: [], steps: [] }),
    ])

    await structureRecipeFromOcr(client, {
      phase1: { ingredients: ['4 teaspoons kosher salt'] },
      phase2: { steps: ['Preheat the oven to 350F.'], headnote: '' },
    })

    expectReasoningDisabled(calls)
  })
})

describe('transient transport failures', () => {
  it('retries a phase once and still returns a result', async () => {
    let call = 0
    const create = vi.fn(async () => {
      call += 1
      if (call === 1) {
        throw Object.assign(new Error('This operation was aborted'), { name: 'AbortError' })
      }
      return {
        [Symbol.asyncIterator]: async function* () {
          yield {
            choices: [
              { delta: { content: JSON.stringify({ ingredients: ['salt'], steps: ['Season.'] }) } },
            ],
          }
        },
      }
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = { chat: { completions: { create } } } as any

    const result = await transcribePhotos(client, [PHOTO])

    expect(result?.phase1.ingredients).toEqual(['salt'])
    expect(create).toHaveBeenCalledTimes(2)
  })
})
