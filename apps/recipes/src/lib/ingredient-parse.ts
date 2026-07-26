/**
 * Splits a printed ingredient line into the parts the app actually needs: a numeric quantity, a
 * canonical unit, the ingredient itself, and the preparation note.
 *
 * **Why this exists.** Stored ingredients keep the whole measurement as free text in `amount`
 * (`"8 ounces (8 cups)"`, `"from 1 large lemon"`, `"3 small or 2 large"`) and hang qualifiers off
 * the end of `name` (`"kosher salt, divided, plus more as needed"`). Nothing downstream can group,
 * combine or convert text like that, and no amount of layout work makes a ragged column scannable.
 *
 * **What it must never do.** This is transcription, not interpretation — see
 * RECIPE-FIDELITY-AND-MEASURES-PLAN.md. Preparation words (`chopped`, `divided`) move out of the
 * name because they describe what was done to the ingredient. Variety words (`kosher`,
 * `all-purpose`, `granulated`) stay, because they change what the thing *is* and what it weighs.
 * When a line can't be read confidently the parts come back undefined and the original is kept
 * verbatim; a missing quantity is recoverable, a wrong one is not.
 */

import { normalizeUnit } from './units'

/** Single-character fractions as printed in cookbooks. */
const VULGAR: Record<string, number> = {
  '¼': 0.25, '½': 0.5, '¾': 0.75,
  '⅓': 1 / 3, '⅔': 2 / 3,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8,
  '⅙': 1 / 6, '⅚': 5 / 6,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
}
const VULGAR_CLASS = Object.keys(VULGAR).join('')

/** Number words that open a line: "One 14-ounce can of tomatoes". */
const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, a: 1, an: 1,
}

/** Hedges the page prints before the number. They qualify the amount, not the ingredient. */
const HEDGES =
  /^(about|approx\.?|approximately|around|roughly|a?\s*scant|heaping|generous|a little more than a?|a little less than a?|slightly more than a?|up to)\s+/i

/**
 * Reads a leading quantity.
 *
 * Ranges ("3 to 4", "12- to 14-ounce") collapse to the low end, which is what a shopping list
 * should assume; the printed range survives in `original`, so nothing is lost.
 */
function readQuantity(input: string): { value: number; rest: string; hedge?: string } | null {
  let text = input.trim()
  const hedgeMatch = HEDGES.exec(text)
  const hedge = hedgeMatch ? hedgeMatch[0].trim() : undefined
  if (hedgeMatch) text = text.slice(hedgeMatch[0].length).trim()

  const forms = [
    // "1 1/2" and "1½" — an integer with a fraction attached.
    new RegExp(`^(\\d+)\\s*(\\d+)\\s*/\\s*(\\d+)`),
    new RegExp(`^(\\d+)\\s*([${VULGAR_CLASS}])`),
    new RegExp(`^(\\d+)\\s*/\\s*(\\d+)`),
    new RegExp(`^([${VULGAR_CLASS}])`),
    new RegExp(`^(\\d+\\.\\d+)`),
    new RegExp(`^(\\d+)`),
  ]

  let value: number | null = null
  let rest = text

  for (const [index, form] of forms.entries()) {
    const m = form.exec(text)
    if (!m) continue
    if (index === 0) value = Number(m[1]) + Number(m[2]) / Number(m[3])
    else if (index === 1) value = Number(m[1]) + VULGAR[m[2]]
    else if (index === 2) value = Number(m[1]) / Number(m[2])
    else if (index === 3) value = VULGAR[m[1]]
    else value = Number(m[1])
    rest = text.slice(m[0].length)
    break
  }

  if (value === null) {
    const word = /^([A-Za-z]+)\b/.exec(text)
    const asNumber = word ? NUMBER_WORDS[word[1].toLowerCase()] : undefined
    // Only trust a number word when a unit or a parenthetical size follows it, so the "a" in
    // "a grating of nutmeg" doesn't silently become a quantity of 1.
    if (asNumber === undefined) return null
    const after = text.slice(word![0].length).trim()
    if (!/^[(\d]/.test(after) && !normalizeUnit(after.split(/\s+/)[0]).id) return null
    value = asNumber
    rest = after
  }

  if (!Number.isFinite(value) || value < 0) return null

  // "3 to 4 cloves", "12- to 14-ounce", "4-6 pieces" — drop the upper bound, keep the low end.
  // The mixed form ("2¼ to 2½ pounds") has to be tried first, or the bare-integer branch matches
  // the "2" and strands the "½" at the front of the ingredient name.
  const range =
    /^\s*(?:-|–|—|to|or)\s*(?:\d+\s*[¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|\d+\s*\/\s*\d+|\d+(?:\.\d+)?|[¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])\s*/i.exec(
      rest,
    )
  if (range) {
    const afterRange = rest.slice(range[0].length)
    // Only a range if a unit or the ingredient follows — "1 to 1½ inches thick" is a description.
    if (!/^(inch|inches|cm|mm|pound|lb)\b/i.test(afterRange.trim())) rest = afterRange
  }

  return { value, rest, ...(hedge ? { hedge } : {}) }
}

/**
 * Preparation and state. Safe to move out of the name: none of these change what the ingredient
 * is or what a cup of it weighs.
 *
 * Deliberately excluded — `kosher`, `all-purpose`, `granulated`, `unsalted`, `whole`, `light`,
 * `dark`, and every other variety word. Those belong to the ingredient's identity, and the weight
 * table depends on them staying distinct.
 */
const PREP_PATTERN = new RegExp(
  '^(' +
    [
      // past-participle preparations, optionally preceded by a manner adverb
      '(?:very\\s+)?(?:thinly|thickly|finely|coarsely|roughly|lightly|well|freshly)?\\s*' +
        '(?:chopped|minced|diced|sliced|grated|shredded|crushed|cubed|halved|quartered|julienned|' +
        'crumbled|torn|trimmed|peeled|rinsed|drained|seeded|cored|stemmed|pitted|zested|juiced|' +
        'squeezed|softened|melted|chilled|cooled|warmed|toasted|beaten|whisked|sifted|packed|' +
        'thawed|deveined|scrubbed|patted dry|cut into .*|sliced .*|chopped .*|cut in .*)',
      'divided',
      'optional',
      'to taste',
      'as needed',
      'as desired',
      'at room temperature',
      'room temperature',
      'plus more.*',
      'plus extra.*',
      'for (?:serving|garnish|dusting|greasing|brushing|drizzling|frying|topping|the pan|sprinkling).*',
      'if (?:desired|needed|using).*',
      'preferably .*',
      'such as .*',
      'or more.*',
      'drained and rinsed',
      'rinsed and drained',
      'peeled and .*',
      'stems? (?:removed|discarded).*',
      'skin(?:-| )on',
      'bone(?:-| )in',
      'boneless',
      'skinless',
    ].join('|') +
    ')$',
  'i',
)

/**
 * Moves trailing qualifier clauses out of the name.
 *
 * Only clauses that match the preparation vocabulary move, and only from the end — the first
 * clause that isn't recognised stops the scan, so `"chicken, breast side up"` doesn't lose its
 * middle. Anything unrecognised stays in the name where a human can see it.
 */
export function splitNameAndPrep(raw: string): { name: string; prep?: string } {
  const clauses = String(raw ?? '')
    .split(',')
    .map((c) => c.trim())
  if (clauses.length <= 1) return { name: clauses[0] ?? '' }

  const prep: string[] = []
  while (clauses.length > 1) {
    const last = clauses[clauses.length - 1]
    if (!PREP_PATTERN.test(last)) break
    prep.unshift(clauses.pop()!)
  }

  const name = clauses.join(', ').trim()
  // Never hand back an empty name — if everything looked like prep, the split was wrong.
  if (!name) return { name: String(raw ?? '').trim() }
  return prep.length ? { name, prep: prep.join(', ') } : { name }
}

export interface ParsedIngredient {
  /** The printed line, verbatim. Always set — this is the record of what the page said. */
  original: string
  /** Numeric quantity, absent when the line has no readable number ("to taste", "for garnish"). */
  quantity?: number
  /** Canonical unit id from the vocabulary, absent when the unit isn't recognised. */
  unit?: string
  name: string
  prep?: string
  /** A parenthetical the line carried, e.g. the `15-ounce` of `1 (15-ounce) can`. */
  note?: string
}

/**
 * Reads a unit from the front of `text`, trying the two-word form first ("fl oz").
 *
 * The two-word probe skips candidates containing a bracket. `normalizeUnit` strips a trailing
 * parenthetical itself, so "cup (packed)" would otherwise normalise to `cup` and consume the
 * `(packed)` along with it — losing a preparation note the page printed.
 */
function readUnit(text: string): { id: string; rest: string } | null {
  const words = text.trim().split(/\s+/)
  for (const take of [2, 1]) {
    if (words.length < take) continue
    const candidate = words.slice(0, take).join(' ')
    if (take > 1 && /[()]/.test(candidate)) continue
    const normalized = normalizeUnit(candidate)
    if (!normalized.id) continue

    // Size adjectives normalise to a bare count, but the page printed them and they describe the
    // specimen you are meant to buy — "1 medium onion" must not become "1 onion". Record the
    // count, leave the word in the name.
    const rest = SIZE_WORD.test(candidate)
      ? words.join(' ')
      : words.slice(take).join(' ')
    return { id: normalized.id, rest }
  }
  return null
}

const SIZE_WORD = /^(small|medium|large|extra[- ]large|jumbo|baby|medium-large)$/i

/**
 * A package size printed without brackets: "One 14.5-ounce can black beans".
 *
 * The bracketed form ("1 (14.5-ounce) can") is far more common and is handled as a parenthetical;
 * this catches the rest so the size doesn't end up wedged into the ingredient name.
 */
const BARE_PACKAGE_SIZE =
  /^(\d+(?:\.\d+)?(?:\s*-\s*|\s+to\s+|\s*–\s*)?(?:\d+(?:\.\d+)?)?\s*-?\s*(?:ounce|oz|pound|lb|gram|g|kg|ml|liter|litre|l|inch)\b\.?)\s*/i

/** Imprecise amounts the page prints instead of a number. */
const IMPRECISE = /^(a\s+)?(pinch|dash|handful|drizzle|sprinkle|grating|spoonful|few grinds)( of)?\b/i
/**
 * A line that is *only* a qualifier, with no ingredient attached.
 *
 * The `for …` branch is restricted to the known role words rather than `for .*`, so
 * "for dusting confectioners' sugar" is treated as a leading qualifier on a real ingredient
 * instead of being swallowed whole.
 */
const BARE_QUALIFIER =
  /^(to taste|as needed|as desired|optional|to serve|for (?:serving|garnish|garnishing|dusting|greasing|brushing|drizzling|frying|topping|sprinkling|the pan))$/i

/**
 * A qualifier printed *before* the ingredient — "to taste Salt", "for dusting confectioners'
 * sugar". These come from records whose amount slot held the qualifier and got concatenated onto
 * the front of the name, and left in place they push the ingredient out of alphabetical reach and
 * make every name start with the same three words.
 */
const LEADING_QUALIFIER =
  /^(to taste|as needed|as desired|optional|to serve|for (?:serving|garnish|garnishing|dusting|greasing|brushing|drizzling|frying|deep frying|topping|sprinkling|squeezing|the pan)(?:\s+and\s+\w+)*)\s+(?=\S)/i

/**
 * Pulls a leading qualifier off the line.
 *
 * "to taste" and "as needed" describe the amount, so they become the unit. "for garnish" and its
 * relatives describe the role the ingredient plays, so they become prep.
 */
function stripLeadingQualifier(
  text: string,
  preps: string[],
): { rest: string; unit?: string } {
  const match = LEADING_QUALIFIER.exec(text)
  if (!match) return { rest: text }

  const qualifier = match[1].trim()
  const rest = text.slice(match[0].length).trim()
  const unit = normalizeUnit(qualifier)
  if (unit.id) return { rest, unit: unit.id }

  preps.push(qualifier.toLowerCase())
  return { rest }
}

/**
 * Parses one printed ingredient line.
 *
 * Whatever cannot be read confidently is left undefined rather than guessed — an ingredient with
 * no quantity renders as the page wrote it, which is correct; an ingredient with an invented
 * quantity is a silent error in a shopping list.
 */
export function parseIngredientLine(line: string): ParsedIngredient {
  const original = cleanLine(line)
  if (!original) return { original: '', name: '' }

  if (BARE_QUALIFIER.test(original)) return { original, name: original }

  const notes: string[] = []
  const preps: string[] = []

  const leading = stripLeadingQualifier(original, preps)
  let working = leading.rest
  if (leading.unit) {
    working = stripParentheticals(working, notes, preps)
    const { name, prep } = splitNameAndPrep(working)
    const allPrep = [prep, ...preps].filter(Boolean).join(', ')
    return {
      original,
      unit: leading.unit,
      name,
      ...(allPrep ? { prep: allPrep } : {}),
      ...(notes.length ? { note: notes.join('; ') } : {}),
    }
  }

  const imprecise = IMPRECISE.exec(working)
  if (imprecise) {
    const rest = working.slice(imprecise[0].length).trim()
    const unit = normalizeUnit(imprecise[2])
    const { name, prep } = splitNameAndPrep(rest.replace(/^of\s+/i, ''))
    return {
      original,
      ...(unit.id ? { unit: unit.id } : {}),
      name: name || rest,
      ...(prep ? { prep } : {}),
    }
  }

  const quantity = readQuantity(working)
  if (!quantity) {
    const { name, prep } = splitNameAndPrep(stripParentheticals(working, notes, preps))
    const allPrep = [prep, ...preps].filter(Boolean).join(', ')
    return { original, name, ...(allPrep ? { prep: allPrep } : {}), ...(notes.length ? { note: notes.join('; ') } : {}) }
  }
  if (quantity.hedge) notes.push(quantity.hedge)
  working = quantity.rest.trim()

  // A parenthetical can sit either side of the unit — "1 (15-ounce) can tomatoes" and
  // "1/3 cup (85 grams) pecans" are both common — so look again once the unit is consumed.
  working = stripLeadingParenthetical(working, notes, preps)

  // "One 14.5-ounce can black beans" — the size sits between the count and the container.
  const bareSize = BARE_PACKAGE_SIZE.exec(working)
  if (bareSize && readUnit(working.slice(bareSize[0].length))) {
    notes.push(bareSize[1].trim())
    working = working.slice(bareSize[0].length).trim()
  }

  const unit = readUnit(working)
  if (unit) working = unit.rest.trim()

  // "1 clove 1 garlic clove" — the measurement was stored split across both fields, so the count
  // reappears once the unit is consumed. Drop it only when it repeats the quantity already read.
  const repeated = readQuantity(working)
  if (repeated && repeated.value === quantity.value && repeated.rest.trim()) {
    working = repeated.rest.trim()
  }

  working = stripLeadingParenthetical(working, notes, preps)

  working = stripParentheticals(working, notes, preps).replace(/^of\s+/i, '').trim()
  const { name, prep } = splitNameAndPrep(working)
  const allPrep = [prep, ...preps].filter(Boolean).join(', ')

  return {
    original,
    quantity: quantity.value,
    ...(unit ? { unit: unit.id } : {}),
    name,
    ...(allPrep ? { prep: allPrep } : {}),
    ...(notes.length ? { note: notes.join('; ') } : {}),
  }
}

/** Backspace and other control characters survive OCR and print as boxes. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g

function cleanLine(line: string): string {
  return String(line ?? '')
    .replace(CONTROL_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Moves a parenthetical out of the running text.
 *
 * A parenthetical is either preparation (`(packed)`, `(optional)`) — which belongs in prep — or a
 * size, conversion or aside (`(15-ounce)`, `(85 grams)`, `(like Rao's)`) — which belongs in the
 * note. Either way it is recorded, never discarded.
 */
function fileParenthetical(content: string, notes: string[], preps: string[]): void {
  const text = content.trim()
  if (!text) return
  if (PREP_PATTERN.test(text)) preps.push(text)
  else notes.push(text)
}

function stripLeadingParenthetical(text: string, notes: string[], preps: string[]): string {
  const match = /^\(([^)]*)\)\s*/.exec(text)
  if (!match) return text
  fileParenthetical(match[1], notes, preps)
  return text.slice(match[0].length).trim()
}

/** Pulls every remaining parenthetical out of the name so the name is just the ingredient. */
function stripParentheticals(text: string, notes: string[], preps: string[]): string {
  return text
    .replace(/\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g, (_, content: string) => {
      fileParenthetical(content, notes, preps)
      return ' '
    })
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.])/g, '$1')
    .trim()
}

/**
 * Rebuilds the printed line a stored ingredient came from.
 *
 * Stored records disagree about where the measurement lives. Most keep it in `amount`, but ~240
 * repeat it at the front of `name`, and ~728 have an empty `amount` with the whole line — sometimes
 * with the measurement written twice ("¼ cup ¼ cup extra-virgin olive oil") — inside `name`.
 * Concatenating blindly would produce the measurement two or three times over.
 */
export function reconstructIngredientLine(stored: {
  amount?: string
  name?: string
  prep?: string
}): string {
  const amount = String(stored.amount ?? '').replace(/\s+/g, ' ').trim()
  const name = String(stored.name ?? '').replace(/\s+/g, ' ').trim()

  if (!name) return amount
  if (!amount) return dedupeRepeatedPrefix(name)

  // The name already opens with the amount — it is the whole line, not a fragment.
  if (name.toLowerCase().startsWith(amount.toLowerCase())) return dedupeRepeatedPrefix(name)

  return dedupeRepeatedPrefix(`${amount} ${name}`)
}

/**
 * Removes an opening phrase that the line immediately repeats.
 *
 * "¼ cup ¼ cup extra-virgin olive oil" → "¼ cup extra-virgin olive oil".
 * "1 fennel bulb 1 fennel bulb, stalks discarded" → "1 fennel bulb, stalks discarded".
 * "4 (12-ounce) chops 4 (12-ounce) bone-in pork rib" → "4 (12-ounce) bone-in pork rib".
 *
 * Only an exact repeat is removed, and the repeated phrase must contain a digit. Without that
 * condition "2 eggs, 2 yolks" looks like a duplicate of "2" and loses the eggs.
 */
function dedupeRepeatedPrefix(line: string): string {
  const hasDigit = /\d|[¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/

  // The whole opening phrase repeats verbatim.
  for (let cut = Math.floor(line.length / 2); cut >= 2; cut--) {
    const head = line.slice(0, cut).trim()
    if (!head || !hasDigit.test(head)) continue
    const rest = line.slice(cut).trim()
    if (rest.toLowerCase().startsWith(head.toLowerCase())) return rest
  }

  // The first copy picked up a trailing word the second doesn't have ("… chops 4 (12-ounce) …").
  //
  // This pass needs at least two words in the repeated phrase. A single repeated token is not
  // evidence of duplication — "2 eggs, 2 yolks" repeats the 2 and means two different things.
  const words = line.split(/\s+/)
  for (let take = Math.min(6, Math.floor(words.length / 2)); take >= 2; take--) {
    const head = words.slice(0, take).join(' ')
    if (!hasDigit.test(head)) continue
    for (let at = take + 1; at <= take + 3 && at + take <= words.length; at++) {
      if (words.slice(at, at + take).join(' ').toLowerCase() === head.toLowerCase()) {
        return words.slice(at).join(' ')
      }
    }
  }

  return line
}
