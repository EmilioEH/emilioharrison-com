/**
 * One vocabulary for ingredient units.
 *
 * The library stores **277 distinct unit values** across ~5,250 ingredients, which is roughly
 * eight real units wearing twenty-five spellings (`cup`/`cups`, `tsp`/`teaspoon`/`teaspoons`,
 * `tbsp`/`tablespoon`/`tablespoons`/`Tbsp`, `g`/`gram`/`grams`, …), mixed in with things that
 * aren't units at all (`medium`, `bunch`, `lemon`), things that can't be measured (`pinch`,
 * `to taste`), and values polluted by a removed prompt rule that jammed conversions into the unit
 * field (`cup (226g)`, `cup (approx 4 fl oz / 118ml)`).
 *
 * Nothing here calls a model. Normalisation is deterministic so the same input always produces the
 * same unit — which is the property the old inline-AI approach lacked, and why the same ingredient
 * ended up with different units in different recipes.
 *
 * See RECIPE-FIDELITY-AND-MEASURES-PLAN.md.
 */

/** What kind of quantity a unit expresses. Determines what can be converted into what. */
export type UnitFamily = 'volume' | 'weight' | 'count' | 'imprecise'

export interface CanonicalUnit {
  /** The single spelling everything normalises to. */
  id: string
  family: UnitFamily
  /** How to render it in the UI. */
  label: string
  /** For volume/weight: size in a common base (ml for volume, g for weight). Enables exact
   * conversion *within* a family. Crossing families needs a per-ingredient weight — see the plan. */
  base?: number
  /** Measurement system, so display never jumps between them — 250ml must not become "1 cup". */
  system?: 'us' | 'metric'
  /** Whether display may promote *into* this unit. Excludes units that are valid to read but odd
   * to write in a recipe: nobody measures 2 tbsp of oil as "1 fl oz". */
  promote?: boolean
  /** Plural spelling, when the unit takes one. Abbreviations (tsp, g, oz) do not. */
  plural?: string
}

/** Volume is based in millilitres, weight in grams. US customary, matching the cookbooks in use. */
export const CANONICAL_UNITS: CanonicalUnit[] = [
  { id: 'tsp', family: 'volume', label: 'tsp', base: 4.92892, system: 'us', promote: true },
  { id: 'tbsp', family: 'volume', label: 'tbsp', base: 14.7868, system: 'us', promote: true },
  {
    id: 'cup',
    family: 'volume',
    label: 'cup',
    base: 236.588,
    system: 'us',
    promote: true,
    plural: 'cups',
  },
  { id: 'floz', family: 'volume', label: 'fl oz', base: 29.5735, system: 'us', promote: false },
  {
    id: 'pint',
    family: 'volume',
    label: 'pint',
    base: 473.176,
    system: 'us',
    promote: false,
    plural: 'pints',
  },
  {
    id: 'quart',
    family: 'volume',
    label: 'quart',
    base: 946.353,
    system: 'us',
    promote: false,
    plural: 'quarts',
  },
  {
    id: 'gallon',
    family: 'volume',
    label: 'gallon',
    base: 3785.41,
    system: 'us',
    promote: false,
    plural: 'gallons',
  },
  { id: 'ml', family: 'volume', label: 'ml', base: 1, system: 'metric', promote: true },
  { id: 'l', family: 'volume', label: 'l', base: 1000, system: 'metric', promote: true },

  { id: 'g', family: 'weight', label: 'g', base: 1, system: 'metric', promote: true },
  { id: 'kg', family: 'weight', label: 'kg', base: 1000, system: 'metric', promote: true },
  { id: 'oz', family: 'weight', label: 'oz', base: 28.3495, system: 'us', promote: true },
  { id: 'lb', family: 'weight', label: 'lb', base: 453.592, system: 'us', promote: true },

  { id: 'piece', family: 'count', label: '' },
  { id: 'clove', family: 'count', label: 'clove', plural: 'cloves' },
  { id: 'bunch', family: 'count', label: 'bunch', plural: 'bunches' },
  { id: 'head', family: 'count', label: 'head', plural: 'heads' },
  { id: 'sprig', family: 'count', label: 'sprig', plural: 'sprigs' },
  { id: 'stalk', family: 'count', label: 'stalk', plural: 'stalks' },
  { id: 'slice', family: 'count', label: 'slice', plural: 'slices' },
  { id: 'can', family: 'count', label: 'can', plural: 'cans' },
  { id: 'package', family: 'count', label: 'package', plural: 'packages' },
  { id: 'stick', family: 'count', label: 'stick', plural: 'sticks' },
  // Containers the page counts by. They are not convertible to anything — "1 jar" says nothing
  // about volume — but naming them keeps the word out of the ingredient name.
  { id: 'jar', family: 'count', label: 'jar', plural: 'jars' },
  { id: 'box', family: 'count', label: 'box', plural: 'boxes' },
  { id: 'bag', family: 'count', label: 'bag', plural: 'bags' },
  { id: 'bottle', family: 'count', label: 'bottle', plural: 'bottles' },
  { id: 'container', family: 'count', label: 'container', plural: 'containers' },
  { id: 'tube', family: 'count', label: 'tube', plural: 'tubes' },
  { id: 'loaf', family: 'count', label: 'loaf', plural: 'loaves' },
  { id: 'ear', family: 'count', label: 'ear', plural: 'ears' },
  { id: 'fillet', family: 'count', label: 'fillet', plural: 'fillets' },
  { id: 'leaf', family: 'count', label: 'leaf', plural: 'leaves' },

  { id: 'pinch', family: 'imprecise', label: 'pinch', plural: 'pinches' },
  { id: 'dash', family: 'imprecise', label: 'dash', plural: 'dashes' },
  // Gestural amounts. They carry no number, but they are what the page printed, so they are kept
  // rather than dropped — the alternative is an ingredient that appears to have no amount at all.
  { id: 'drizzle', family: 'imprecise', label: 'drizzle' },
  { id: 'sprinkle', family: 'imprecise', label: 'sprinkle' },
  { id: 'handful', family: 'imprecise', label: 'handful' },
  { id: 'grating', family: 'imprecise', label: 'grating' },
  { id: 'spoonful', family: 'imprecise', label: 'spoonful' },
  { id: 'to_taste', family: 'imprecise', label: 'to taste' },
  { id: 'as_needed', family: 'imprecise', label: 'as needed' },
]

const BY_ID = new Map(CANONICAL_UNITS.map((u) => [u.id, u]))

/** Every spelling seen in the library, mapped to its canonical unit. */
const ALIASES: Record<string, string> = {
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tsps: 'tsp',
  t: 'tsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  tbsps: 'tbsp',
  tbs: 'tbsp',
  T: 'tbsp',
  cups: 'cup',
  c: 'cup',
  'fl oz': 'floz',
  'fluid ounce': 'floz',
  'fluid ounces': 'floz',
  floz: 'floz',
  pints: 'pint',
  pt: 'pint',
  quarts: 'quart',
  qt: 'quart',
  gallons: 'gallon',
  gal: 'gallon',
  milliliter: 'ml',
  milliliters: 'ml',
  millilitre: 'ml',
  mls: 'ml',
  liter: 'l',
  liters: 'l',
  litre: 'l',
  litres: 'l',

  gram: 'g',
  grams: 'g',
  gr: 'g',
  kilogram: 'kg',
  kilograms: 'kg',
  kilo: 'kg',
  ounce: 'oz',
  ounces: 'oz',
  pound: 'lb',
  pounds: 'lb',
  lbs: 'lb',

  cloves: 'clove',
  bunches: 'bunch',
  heads: 'head',
  sprigs: 'sprig',
  stalks: 'stalk',
  slices: 'slice',
  cans: 'can',
  packages: 'package',
  packet: 'package',
  packets: 'package',
  pkg: 'package',
  pack: 'package',
  packs: 'package',
  sticks: 'stick',
  jars: 'jar',
  boxes: 'box',
  bags: 'bag',
  bottles: 'bottle',
  containers: 'container',
  tubes: 'tube',
  loaves: 'loaf',
  ears: 'ear',
  fillets: 'fillet',
  filet: 'fillet',
  filets: 'fillet',
  leaves: 'leaf',

  // Bare counts and size words: the quantity is a count, the size is a description, not a unit.
  piece: 'piece',
  pieces: 'piece',
  whole: 'piece',
  unit: 'piece',
  units: 'piece',
  count: 'piece',
  item: 'piece',
  items: 'piece',
  each: 'piece',
  small: 'piece',
  medium: 'piece',
  large: 'piece',
  'medium-large': 'piece',

  pinches: 'pinch',
  dashes: 'dash',
  drizzles: 'drizzle',
  sprinkles: 'sprinkle',
  handfuls: 'handful',
  gratings: 'grating',
  spoonfuls: 'spoonful',
  'to taste': 'to_taste',
  'as needed': 'as_needed',
  'as desired': 'as_needed',
}

/**
 * Every individual word that belongs to a unit rather than to an ingredient — including the parts
 * of multi-word spellings, so "as desired" contributes both `as` and `desired`.
 *
 * Useful when checking that normalisation didn't drop anything: a word that vanished into a
 * canonical unit hasn't been lost, it has been spelled differently.
 */
export const UNIT_WORDS: ReadonlySet<string> = new Set(
  [
    ...Object.keys(ALIASES),
    ...CANONICAL_UNITS.map((u) => u.id),
    ...CANONICAL_UNITS.map((u) => u.label),
    ...CANONICAL_UNITS.map((u) => u.plural ?? ''),
  ]
    .flatMap((spelling) => spelling.toLowerCase().split(/[\s_]+/))
    .filter(Boolean),
)

/** The spelling to render for a given quantity — "1 cup" but "2 cups". */
export function unitLabel(unitId: string | null | undefined, quantity?: number): string {
  const unit = BY_ID.get(String(unitId ?? ''))
  if (!unit) return ''
  if (quantity !== undefined && quantity > 1 && unit.plural) return unit.plural
  return unit.label
}

/** Strips a parenthetical conversion the removed prompt rule left behind: `cup (226g)` → `cup`.
 * The parenthetical is returned separately so nothing is silently thrown away. */
export function splitUnitNote(raw: string): { unit: string; note: string | null } {
  const text = String(raw || '').trim()
  const match = /^([^(]*)\(([^)]*)\)\s*$/.exec(text)
  if (!match) return { unit: text, note: null }
  const unit = match[1].trim()
  const note = match[2].trim()
  // "1/2 lemon (juiced)" — if nothing precedes the bracket there's no unit to keep.
  return { unit, note: note || null }
}

export interface NormalizedUnit {
  /** Canonical id, or null when the value isn't a recognised unit. */
  id: string | null
  family: UnitFamily | null
  /** Ready to render — '' for bare counts, so "2 onions" doesn't become "2 piece onions". */
  label: string
  /** Anything stripped off, e.g. the `226g` from `cup (226g)`. */
  note: string | null
  /** The input, when it couldn't be matched. Preserved rather than discarded. */
  original: string
}

/**
 * Maps a stored unit string onto the canonical vocabulary.
 *
 * Unrecognised values return `id: null` and keep their original text. That is deliberate: an
 * unknown unit is usually the *ingredient* having landed in the unit slot (`lemon`, `onion`,
 * `eggs` all appear in the library), and guessing at those is how wrong data gets in.
 */
export function normalizeUnit(raw: string | null | undefined): NormalizedUnit {
  const { unit, note } = splitUnitNote(String(raw ?? ''))
  const key = unit.toLowerCase().replace(/\./g, '').trim()

  if (!key) return { id: null, family: null, label: '', note, original: unit }

  const id = BY_ID.has(key) ? key : ALIASES[key] || ALIASES[unit] || null
  if (!id) return { id: null, family: null, label: unit, note, original: unit }

  const canonical = BY_ID.get(id)!
  return { id, family: canonical.family, label: canonical.label, note, original: unit }
}

/** True when two units can be combined exactly — same family, and that family is measurable. */
export function canCombine(a: NormalizedUnit, b: NormalizedUnit): boolean {
  if (!a.id || !b.id || a.family !== b.family) return false
  return a.family === 'volume' || a.family === 'weight' || a.id === b.id
}

/**
 * Converts an amount between two units of the same family. Returns null when that isn't
 * meaningful — different families (a cup of flour and a pound of flour need the ingredient's
 * weight, see the plan), or an imprecise unit that has no number to convert.
 */
export function convert(amount: number, from: string, to: string): number | null {
  const f = BY_ID.get(from)
  const t = BY_ID.get(to)
  if (!f || !t || f.family !== t.family) return null
  if (f.base === undefined || t.base === undefined) return null
  return (amount * f.base) / t.base
}

/** Picks the most readable unit within a family for a given amount — 48 tsp reads better as 1 cup. */
export function bestDisplayUnit(amount: number, unitId: string): { amount: number; unit: string } {
  const u = BY_ID.get(unitId)
  if (!u || u.base === undefined) return { amount, unit: unitId }

  // Same family *and* same measurement system, so 250ml never becomes "1 cup", and only units
  // people actually write in recipes are promotion targets.
  const sameFamily = CANONICAL_UNITS.filter(
    (c) => c.family === u.family && c.base !== undefined && c.system === u.system && c.promote,
  ).sort((a, b) => b.base! - a.base!)

  const inBase = amount * u.base
  // Largest unit that still leaves a quantity of at least 1 — avoids both "0.03 cup" and "48 tsp".
  for (const candidate of sameFamily) {
    const value = inBase / candidate.base!
    if (value >= 1) return { amount: value, unit: candidate.id }
  }
  return { amount, unit: unitId }
}

/** Renders a quantity the way a cookbook prints it: 0.5 → ½, 1.5 → 1½. */
const FRACTION_GLYPHS: Array<[number, string]> = [
  [0.125, '⅛'],
  [0.25, '¼'],
  [1 / 3, '⅓'],
  [0.375, '⅜'],
  [0.5, '½'],
  [0.625, '⅝'],
  [2 / 3, '⅔'],
  [0.75, '¾'],
  [0.875, '⅞'],
]

/**
 * A number as a cook would write it.
 *
 * Lives here rather than in the one component that first needed it, because scaling a recipe for
 * a different number of people has to write the same glyphs into the ingredient's `amount` that
 * the row beside it prints — two copies of this would eventually disagree about ⅔.
 */
export function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return ''
  const whole = Math.floor(value)
  const fraction = value - whole
  if (fraction < 0.001) return String(whole)
  for (const [size, glyph] of FRACTION_GLYPHS) {
    if (Math.abs(fraction - size) < 0.02) return whole ? `${whole}${glyph}` : glyph
  }
  return String(Math.round(value * 100) / 100)
}
