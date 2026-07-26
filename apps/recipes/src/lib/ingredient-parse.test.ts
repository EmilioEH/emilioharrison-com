import { describe, it, expect } from 'vitest'
import {
  parseIngredientLine,
  reconstructIngredientLine,
  splitNameAndPrep,
} from './ingredient-parse'

describe('parseIngredientLine', () => {
  it('reads a plain measurement', () => {
    expect(parseIngredientLine('2 tablespoons olive oil')).toMatchObject({
      quantity: 2,
      unit: 'tbsp',
      name: 'olive oil',
      original: '2 tablespoons olive oil',
    })
  })

  it('reads fractions in every spelling the cookbooks use', () => {
    expect(parseIngredientLine('1/2 cup milk')).toMatchObject({ quantity: 0.5, unit: 'cup' })
    expect(parseIngredientLine('½ cup milk')).toMatchObject({ quantity: 0.5, unit: 'cup' })
    expect(parseIngredientLine('1 1/2 cups milk')).toMatchObject({ quantity: 1.5, unit: 'cup' })
    expect(parseIngredientLine('1½ cups milk')).toMatchObject({ quantity: 1.5, unit: 'cup' })
    expect(parseIngredientLine('2.5 cups milk')).toMatchObject({ quantity: 2.5, unit: 'cup' })
  })

  it('collapses a range to its low end', () => {
    expect(parseIngredientLine('3 to 4 cloves garlic')).toMatchObject({ quantity: 3, unit: 'clove' })
    expect(parseIngredientLine('4-6 chicken thighs')).toMatchObject({ quantity: 4 })
  })

  it('does not mistake a size description for a range', () => {
    // "1 to 1½ inches thick" describes the cut, not how many pork chops to buy.
    const parsed = parseIngredientLine('4 pork chops, 1 to 1½ inches thick')
    expect(parsed.quantity).toBe(4)
    expect(parsed.name).toContain('pork chops')
  })

  it('moves preparation out of the name and leaves the ingredient alone', () => {
    expect(parseIngredientLine('2 cloves garlic, minced')).toMatchObject({
      quantity: 2,
      unit: 'clove',
      name: 'garlic',
      prep: 'minced',
    })
  })

  it('keeps variety words, which change what the ingredient weighs', () => {
    // The weight table depends on these staying distinct — kosher salt is about half the density
    // of table salt, and all-purpose flour is not bread flour.
    expect(parseIngredientLine('1 teaspoon kosher salt').name).toBe('kosher salt')
    expect(parseIngredientLine('2 cups all-purpose flour').name).toBe('all-purpose flour')
    expect(parseIngredientLine('1 cup granulated sugar').name).toBe('granulated sugar')
    expect(parseIngredientLine('4 ounces unsalted butter').name).toBe('unsalted butter')
  })

  it('keeps the size adjective the page printed', () => {
    // "1 medium onion" must not become "1 onion" — the shopper is told which onion to pick up.
    expect(parseIngredientLine('1 medium onion').name).toBe('medium onion')
    expect(parseIngredientLine('1 small red onion').name).toBe('small red onion')
  })

  it('files a bracketed conversion as a note instead of the unit', () => {
    // The removed styling rule jammed these into the unit field: "cup (226g)".
    expect(parseIngredientLine('1 cup (4 oz / 113g) sharp Cheddar cheese')).toMatchObject({
      quantity: 1,
      unit: 'cup',
      name: 'sharp Cheddar cheese',
      note: '4 oz / 113g',
    })
  })

  it('reads a package size in both the bracketed and bare forms', () => {
    expect(parseIngredientLine('1 (15-ounce) can chickpeas')).toMatchObject({
      quantity: 1,
      unit: 'can',
      name: 'chickpeas',
      note: '15-ounce',
    })
    expect(parseIngredientLine('One 14.5-ounce can black beans')).toMatchObject({
      quantity: 1,
      unit: 'can',
      name: 'black beans',
    })
  })

  it('reads a US unit printed with its metric restatement', () => {
    // "½ cup/30 grams flour" — both name the same amount, so the second is a note. Left unhandled
    // this put "cup/30 grams" into the ingredient name and left the row with no unit at all.
    expect(parseIngredientLine('½ cup/30 grams unbleached white flour')).toMatchObject({
      quantity: 0.5,
      unit: 'cup',
      name: 'unbleached white flour',
      note: '30 grams',
    })
    expect(parseIngredientLine('6 cups/1.4 liters chicken stock')).toMatchObject({
      quantity: 6,
      unit: 'cup',
      name: 'chicken stock',
    })
  })

  it('files a bracketed preparation as prep, not as a note', () => {
    expect(parseIngredientLine('½ cup (packed) light brown sugar')).toMatchObject({
      quantity: 0.5,
      unit: 'cup',
      name: 'light brown sugar',
      prep: 'packed',
    })
  })

  it('keeps the hedge the page printed', () => {
    const parsed = parseIngredientLine('Scant 1 cup (120 grams) pecans')
    expect(parsed.quantity).toBe(1)
    expect(parsed.name).toBe('pecans')
    expect(parsed.note).toContain('Scant')
  })

  it('reads imprecise amounts without inventing a number', () => {
    const pinch = parseIngredientLine('Pinch white pepper')
    expect(pinch.unit).toBe('pinch')
    expect(pinch.quantity).toBeUndefined()
    expect(pinch.name).toBe('white pepper')
  })

  it('moves a leading qualifier out of the ingredient name', () => {
    expect(parseIngredientLine('to taste Salt')).toMatchObject({ unit: 'to_taste', name: 'Salt' })
    expect(parseIngredientLine('for dusting confectioners’ sugar')).toMatchObject({
      name: 'confectioners’ sugar',
      prep: 'for dusting',
    })
  })

  it('leaves a line it cannot read confidently without a quantity', () => {
    // A missing quantity is recoverable; an invented one is a silent error in a shopping list.
    const parsed = parseIngredientLine('Guacamole, for serving')
    expect(parsed.quantity).toBeUndefined()
    expect(parsed.name).toBe('Guacamole')
  })

  it('never invents a quantity from an article', () => {
    expect(parseIngredientLine('a grating of fresh nutmeg').quantity).toBeUndefined()
  })

  it('always keeps the printed line verbatim', () => {
    const line = '1 pound Yukon Gold potatoes, unpeeled, halved lengthwise'
    expect(parseIngredientLine(line).original).toBe(line)
  })

  it('strips control characters that survived OCR', () => {
    expect(parseIngredientLine('1 cup \b\b flour').name).toBe('flour')
  })

  it('handles an empty line', () => {
    expect(parseIngredientLine('')).toEqual({ original: '', name: '' })
  })
})

describe('splitNameAndPrep', () => {
  it('stops at the first clause that is not preparation', () => {
    // Scanning from the end must not eat the middle of a name.
    expect(splitNameAndPrep('chicken, breast side up, trimmed')).toEqual({
      name: 'chicken, breast side up',
      prep: 'trimmed',
    })
  })

  it('takes several trailing prep clauses together', () => {
    expect(splitNameAndPrep('kosher salt, divided, plus more as needed')).toEqual({
      name: 'kosher salt',
      prep: 'divided, plus more as needed',
    })
  })

  it('never returns an empty name', () => {
    expect(splitNameAndPrep('divided, minced').name).toBeTruthy()
  })
})

describe('reconstructIngredientLine', () => {
  it('joins the stored amount and name', () => {
    expect(reconstructIngredientLine({ amount: '2 tbsp', name: 'olive oil' })).toBe(
      '2 tbsp olive oil',
    )
  })

  it('does not repeat an amount the name already carries', () => {
    expect(
      reconstructIngredientLine({ amount: '1 pound', name: '1 pound carrots, peeled' }),
    ).toBe('1 pound carrots, peeled')
  })

  it('removes a measurement the stored name wrote twice', () => {
    expect(
      reconstructIngredientLine({ amount: '', name: '¼ cup ¼ cup extra-virgin olive oil' }),
    ).toBe('¼ cup extra-virgin olive oil')
    expect(
      reconstructIngredientLine({ amount: '', name: '1 fennel bulb 1 fennel bulb, stalks discarded' }),
    ).toBe('1 fennel bulb, stalks discarded')
  })

  it('removes a repeat whose first copy picked up an extra word', () => {
    expect(
      reconstructIngredientLine({
        amount: '',
        name: '4 (12-ounce) chops 4 (12-ounce) bone-in pork rib chops',
      }),
    ).toBe('4 (12-ounce) bone-in pork rib chops')
  })

  it('does not treat a genuinely repeated number as a duplicate', () => {
    // "2 eggs, 2 yolks" repeats the 2 but says two different things.
    expect(reconstructIngredientLine({ amount: '', name: '2 eggs, 2 yolks' })).toBe('2 eggs, 2 yolks')
  })
})
