import { describe, it, expect } from 'vitest'
import { normalizeUnit, splitUnitNote, canCombine, convert, bestDisplayUnit } from './units'

describe('normalizeUnit', () => {
  // Every spelling below is a real value stored in the library today.
  it.each([
    ['cup', 'cup'], ['cups', 'cup'], ['Cup', 'cup'],
    ['tsp', 'tsp'], ['teaspoon', 'tsp'], ['teaspoons', 'tsp'],
    ['tbsp', 'tbsp'], ['Tbsp', 'tbsp'], ['tablespoon', 'tbsp'], ['tablespoons', 'tbsp'],
    ['g', 'g'], ['gram', 'g'], ['grams', 'g'],
    ['oz', 'oz'], ['ounce', 'oz'], ['ounces', 'oz'],
    ['lb', 'lb'], ['pound', 'lb'], ['pounds', 'lb'],
    ['ml', 'ml'], ['mL', 'ml'], ['milliliter', 'ml'],
    ['clove', 'clove'], ['cloves', 'clove'],
  ])('maps %s to %s', (input, expected) => {
    expect(normalizeUnit(input).id).toBe(expected)
  })

  it('treats size words as a bare count, not a unit', () => {
    // "1 medium onion" — medium describes the onion, it does not measure it.
    for (const w of ['medium', 'large', 'small', 'whole', 'count', 'unit']) {
      const u = normalizeUnit(w)
      expect(u.id).toBe('piece')
      expect(u.family).toBe('count')
      expect(u.label).toBe('') // so it renders "1 onion", not "1 piece onion"
    }
  })

  it('recognises imprecise amounts without inventing a quantity', () => {
    expect(normalizeUnit('pinch').family).toBe('imprecise')
    expect(normalizeUnit('to taste').id).toBe('to_taste')
    expect(normalizeUnit('as needed').id).toBe('as_needed')
  })

  it('keeps an unrecognised value instead of guessing', () => {
    // These are real stored units — the *ingredient* landed in the unit slot. Guessing here is
    // how wrong data gets in, so they stay unmatched and visible.
    for (const w of ['lemon', 'onion', 'eggs', 'radish']) {
      const u = normalizeUnit(w)
      expect(u.id).toBeNull()
      expect(u.original).toBe(w)
    }
  })

  it('handles empty and missing input', () => {
    expect(normalizeUnit('').id).toBeNull()
    expect(normalizeUnit(undefined).id).toBeNull()
    expect(normalizeUnit(null).id).toBeNull()
  })
})

describe('splitUnitNote — pollution left by the removed prompt rule', () => {
  it.each([
    ['cup (226g)', 'cup', '226g'],
    ['tbsp (14g)', 'tbsp', '14g'],
    ['cup (approx 4 fl oz / 118ml)', 'cup', 'approx 4 fl oz / 118ml'],
    ['cup (2 sticks/226g)', 'cup', '2 sticks/226g'],
  ])('splits %s', (raw, unit, note) => {
    expect(splitUnitNote(raw)).toEqual({ unit, note })
  })

  it('normalises the unit out of a polluted value', () => {
    const u = normalizeUnit('cup (226g)')
    expect(u.id).toBe('cup')
    expect(u.note).toBe('226g')
  })

  it('leaves a clean unit untouched', () => {
    expect(splitUnitNote('tbsp')).toEqual({ unit: 'tbsp', note: null })
  })
})

describe('convert', () => {
  it('converts exactly within volume', () => {
    expect(convert(3, 'tsp', 'tbsp')).toBeCloseTo(1, 5)
    expect(convert(16, 'tbsp', 'cup')).toBeCloseTo(1, 4)
    expect(convert(1, 'cup', 'ml')).toBeCloseTo(236.588, 2)
  })

  it('converts exactly within weight', () => {
    expect(convert(1, 'lb', 'g')).toBeCloseTo(453.592, 2)
    expect(convert(16, 'oz', 'lb')).toBeCloseTo(1, 4)
  })

  it('refuses to cross families — that needs the ingredient, not just the unit', () => {
    // A cup of flour and a cup of sugar weigh differently; only a per-ingredient weight can say.
    expect(convert(1, 'cup', 'g')).toBeNull()
    expect(convert(1, 'lb', 'cup')).toBeNull()
  })

  it('refuses to convert counts or imprecise amounts', () => {
    expect(convert(1, 'clove', 'head')).toBeNull()
    expect(convert(1, 'pinch', 'tsp')).toBeNull()
  })
})

describe('canCombine', () => {
  it('combines different units of the same measurable family', () => {
    expect(canCombine(normalizeUnit('tbsp'), normalizeUnit('cup'))).toBe(true)
    expect(canCombine(normalizeUnit('g'), normalizeUnit('lb'))).toBe(true)
  })

  it('combines identical counts only', () => {
    expect(canCombine(normalizeUnit('clove'), normalizeUnit('cloves'))).toBe(true)
    // 6 cloves + 1 head is the case that needs the grocery AI, not arithmetic.
    expect(canCombine(normalizeUnit('clove'), normalizeUnit('head'))).toBe(false)
  })

  it('never combines across families or unknowns', () => {
    expect(canCombine(normalizeUnit('cup'), normalizeUnit('g'))).toBe(false)
    expect(canCombine(normalizeUnit('pinch'), normalizeUnit('tsp'))).toBe(false)
    expect(canCombine(normalizeUnit('lemon'), normalizeUnit('lemon'))).toBe(false)
  })
})

describe('bestDisplayUnit', () => {
  it('scales up to the most readable unit', () => {
    // 18 tsp is 6 tbsp — the readable form. Promoting all the way to cup would give 0.375, which
    // is worse, so the ladder stops at the largest unit that still leaves a quantity of >= 1.
    const r = bestDisplayUnit(18, 'tsp')
    expect(r.unit).toBe('tbsp')
    expect(r.amount).toBeCloseTo(6, 2)
  })

  it('promotes to cup once there is enough of it', () => {
    const r = bestDisplayUnit(48, 'tsp')
    expect(r.unit).toBe('cup')
    expect(r.amount).toBeCloseTo(1, 2)
  })

  it('never crosses measurement systems', () => {
    // 250ml is about 1.06 cups, but a metric recipe should stay metric.
    expect(bestDisplayUnit(250, 'ml').unit).toBe('ml')
    expect(bestDisplayUnit(1500, 'ml').unit).toBe('l')
  })

  it('leaves an already-sensible amount alone', () => {
    expect(bestDisplayUnit(2, 'tbsp').unit).toBe('tbsp')
  })

  it('does not scale counts or imprecise units', () => {
    expect(bestDisplayUnit(6, 'clove').unit).toBe('clove')
    expect(bestDisplayUnit(1, 'pinch').unit).toBe('pinch')
  })
})
