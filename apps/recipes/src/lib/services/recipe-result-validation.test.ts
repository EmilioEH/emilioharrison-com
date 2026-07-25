import { describe, it, expect } from 'vitest'
import {
  isPlausibleTitle,
  pickPlausibleTitle,
  extractPlausibleTitle,
  isDescriptionEcho,
  stripLeadingDescriptionEcho,
  isObjectIngredient,
  normalizeIngredients,
  normalizeSteps,
} from './recipe-result-validation'

describe('isPlausibleTitle', () => {
  it('accepts a normal dish name', () => {
    expect(isPlausibleTitle('Chicken Thighs with Broccolini')).toBe(true)
  })

  it('rejects the real 3,167-character production title', () => {
    const polluted =
      'Chicken Thighs with Broccolini, Lemon, and Israeli Couscous (Incomplete Recipe Extract from Image Source - Instructions truncated in source image, completing based on common culinary practices for described dish components). Note: Recipe source stops at step 4, remaining steps inferred.'
    expect(isPlausibleTitle(polluted)).toBe(false)
  })

  it('accepts a real long cookbook title verbatim (regression: titles were being shortened)', () => {
    // The printed title of a real recipe in the library, 105 characters. The prompt used to ask
    // for "a short noun phrase, ideally under 60 characters", which instructed the model to
    // rewrite exactly this kind of title.
    const real =
      'Salted Butter and Chocolate Chunk Shortbread, or Why Would I Make Another Chocolate Chip Cookie Ever Again?'
    expect(isPlausibleTitle(real)).toBe(true)
    expect(extractPlausibleTitle(real)).toBe(real)
  })

  it('rejects non-string values', () => {
    expect(isPlausibleTitle(undefined)).toBe(false)
    expect(isPlausibleTitle(42)).toBe(false)
  })
})

describe('pickPlausibleTitle (merge onto an existing recipe)', () => {
  it('uses the AI title when plausible', () => {
    expect(pickPlausibleTitle('Steak Tips with Ras el Hanout', 'Steak Tips')).toBe(
      'Steak Tips with Ras el Hanout',
    )
  })

  it('keeps the original when the AI title is polluted', () => {
    const polluted = 'Poached Chicken and Corn Soup Colombian-Style hybrid inspired by ajiaco featuring a clean, vibrant broth and creamy avocado accents for a comforting meal that is perfect for any night of the week and beyond'
    expect(pickPlausibleTitle(polluted, 'Poached Chicken and Corn Soup')).toBe(
      'Poached Chicken and Corn Soup',
    )
  })
})

describe('extractPlausibleTitle (fresh import — no original to fall back to)', () => {
  it('returns the title unchanged when already plausible', () => {
    expect(extractPlausibleTitle('Buzhenina')).toBe('Buzhenina')
  })

  it('salvages the clean dish name from the real production commentary pattern', () => {
    const polluted =
      'Chicken Thighs with Broccolini, Lemon, and Israeli Couscous (Incomplete Recipe Extract from Image Source - Instructions truncated in source image, completing based on common culinary practices for described dish components). Note: Recipe source stops at step 4, remaining steps inferred.'
    expect(extractPlausibleTitle(polluted)).toBe(
      'Chicken Thighs with Broccolini, Lemon, and Israeli Couscous',
    )
  })

  it('salvages before a "Note:" marker with no parenthesis', () => {
    expect(extractPlausibleTitle('Garlic Roasted Pork Tenderloin Note: image was blurry')).toBe(
      'Garlic Roasted Pork Tenderloin',
    )
  })

  it('gives up (returns undefined) when the title is too long with no marker to truncate at', () => {
    // No "(", "[", or "Note:" for COMMENTARY_START to anchor on, so there's nothing to salvage —
    // unlike the two production cases, which both had a clean prefix before a clear marker.
    expect(extractPlausibleTitle('A '.repeat(120).trim())).toBeUndefined()
    expect(extractPlausibleTitle('')).toBeUndefined()
    expect(extractPlausibleTitle(undefined)).toBeUndefined()
  })

  it('does not flag a real recipe title that legitimately contains parentheses', () => {
    // A real Serious Eats title (this session pulled it directly): the paren comes after real
    // dish-name text, not as a marker introducing commentary with nothing useful before it.
    expect(
      extractPlausibleTitle('Cacio e Pepe (Spaghetti With Black Pepper and Pecorino Romano)'),
    ).toBe('Cacio e Pepe (Spaghetti With Black Pepper and Pecorino Romano)')
  })
})

describe('isDescriptionEcho / stripLeadingDescriptionEcho', () => {
  const blurb =
    'Buzhenina is a simple roasted pork tenderloin stuffed with garlic that is usually served cold.'

  it('detects an exact repeat', () => {
    expect(isDescriptionEcho(blurb, blurb)).toBe(true)
  })

  it('does not flag a short, unrelated step', () => {
    expect(isDescriptionEcho('Preheat the oven to 350F.', blurb)).toBe(false)
  })

  it('strips only leading echoes, leaves real steps alone', () => {
    const steps = [blurb, 'Let the pork come to room temperature.', 'Preheat the oven.']
    expect(stripLeadingDescriptionEcho(steps, blurb)).toEqual([
      'Let the pork come to room temperature.',
      'Preheat the oven.',
    ])
  })

  it('never empties the list even if everything looks description-ish', () => {
    const steps = [blurb]
    expect(stripLeadingDescriptionEcho(steps, blurb)).toEqual([blurb])
  })
})

describe('isObjectIngredient / normalizeIngredients', () => {
  it('accepts an object with a name', () => {
    expect(isObjectIngredient({ name: 'salt', amount: '1 tsp' })).toBe(true)
    expect(isObjectIngredient('1 tsp salt')).toBe(false)
  })

  it('passes through already-well-formed structured ingredients', () => {
    const structured = [{ name: 'flour', amount: '2 cups' }]
    expect(normalizeIngredients(structured)).toEqual(structured)
  })

  it('coerces raw OCR strings to {name} objects using the fallback', () => {
    const result = normalizeIngredients(undefined, ['2 cups flour', '1 tsp salt'])
    expect(result).toEqual([
      { name: '2 cups flour', amount: '' },
      { name: '1 tsp salt', amount: '' },
    ])
  })

  it('returns undefined when there is nothing usable at all', () => {
    expect(normalizeIngredients(undefined, undefined)).toBeUndefined()
    expect(normalizeIngredients([], [])).toBeUndefined()
  })
})

describe('normalizeSteps', () => {
  it('prefers structuredSteps over a steps array polluted with the description', () => {
    const blurb = 'A simple roasted dish.'
    const result = normalizeSteps(
      [{ text: 'Sear the meat.' }, { text: 'Rest and serve.' }],
      [blurb, 'Sear the meat.', 'Rest and serve.'],
      undefined,
      blurb,
    )
    expect(result).toEqual(['Sear the meat.', 'Rest and serve.'])
  })

  it('falls back to plain steps when there is no structuredSteps', () => {
    expect(normalizeSteps(undefined, ['Mix.', 'Bake.'], undefined)).toEqual(['Mix.', 'Bake.'])
  })

  it('falls back to the fallback source as a last resort', () => {
    expect(normalizeSteps(undefined, undefined, ['Raw OCR step.'])).toEqual(['Raw OCR step.'])
  })

  it('returns undefined when every source is empty', () => {
    expect(normalizeSteps(undefined, undefined, undefined)).toBeUndefined()
  })
})
