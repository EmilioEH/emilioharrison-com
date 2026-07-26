/**
 * Turns the raw USDA build output into the committed table.
 *
 * Only rows the build resolved to a cup weight are included, and each carries the USDA record it
 * came from so a wrong entry can be traced and corrected by hand — the table is reviewed and
 * edited like any other source file, not regenerated blindly.
 *
 * usage: generate-weight-table.ts <raw.json> <out.ts>
 */
import fs from 'node:fs'

interface Row {
  key: string
  display: string
  count: number
  gramsPerCup?: number
  matched?: string
  portion?: string
  status: string
}

const rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) as Row[]
const out = process.argv[3]

/** Outside this range the figure is far more likely to be a mismatched record than a real food. */
const PLAUSIBLE_MIN = 5
const PLAUSIBLE_MAX = 500

/**
 * Variety words that change how much a cup weighs.
 *
 * If the ingredient asks for one of these and the matched USDA record doesn't mention it, the
 * record is a different form of the food and its weight does not transfer. Kosher salt is the
 * case that matters most here: USDA has no kosher salt, so every salt in the library matched
 * "Salt, table" at 292 g/cup — and kosher is roughly half that. Applying it would have put a
 * confidently wrong number on the library's second most-used ingredient.
 *
 * A missing weight shows nothing. A wrong one looks authoritative, which is worse.
 */
const DENSITY_WORDS =
  /\b(kosher|flak(?:e|ey|y)|coarse|sea|freeze[- ]dried|whipped|confectioners?|powdered|shaved|self[- ]rising|instant)\b/i

/** Portion labels describing a form the recipe didn't ask for. */
const WRONG_FORM = /\bwhipped\b/

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z]+/g, ' ')
}

function rejectReason(r: Row): string | null {
  if (typeof r.gramsPerCup !== 'number') return 'no weight'
  if (r.gramsPerCup < PLAUSIBLE_MIN || r.gramsPerCup > PLAUSIBLE_MAX) return 'implausible figure'
  if (WRONG_FORM.test(String(r.portion ?? ''))) return `portion is a different form (${r.portion})`

  const got = normalise(String(r.matched ?? ''))
  const missing = (normalise(r.display).match(new RegExp(DENSITY_WORDS.source, 'gi')) ?? []).filter(
    (word) => !got.includes(word.toLowerCase()),
  )
  if (missing.length) return `matched record is not ${missing.join('/')} (${r.matched})`
  return null
}

const evaluated = rows
  .filter((r) => r.status === 'ok')
  .map((r) => ({ row: r, reason: rejectReason(r) }))

const usable = evaluated
  .filter((e) => !e.reason)
  .map((e) => e.row)
  .sort((a, b) => b.count - a.count)

const rejected = evaluated.filter((e) => e.reason)

const lines = usable.map(
  (r) =>
    `  ${JSON.stringify(r.key)}: ${r.gramsPerCup},` +
    ` // ${r.count}× · ${String(r.matched ?? '').replace(/\*\//g, '')}`,
)

fs.writeFileSync(
  out,
  `/**
 * Grams per cup, keyed by \`ingredientKey\` from lib/ingredient-names.ts.
 *
 * GENERATED from USDA FoodData Central by scripts/build-weight-table.ts, then reviewed by hand.
 * Edit entries directly — correcting one here corrects every recipe that uses the ingredient.
 * The comment on each line is how often the library uses it and which USDA record it came from.
 *
 * Ingredients that are always weighed or always counted are deliberately absent: they need no
 * conversion. An ingredient missing from this table simply shows no weight.
 *
 * ${usable.length} entries, covering ${usable.reduce((n, r) => n + r.count, 0)} ingredient uses.
 */
export const GRAMS_PER_CUP: Readonly<Record<string, number>> = {
${lines.join('\n')}
}
`,
  'utf8',
)

console.log(`${rows.length} rows in, ${usable.length} written to ${out}`)
console.log(`  rejected after review: ${rejected.length}`)
rejected
  .sort((a, b) => b.row.count - a.row.count)
  .slice(0, 14)
  .forEach((e) => console.log(`     ${String(e.row.count).padStart(4)}x ${String(e.row.gramsPerCup).padStart(6)}g  ${e.row.display.slice(0, 26).padEnd(26)} ${e.reason}`))
const unresolved = rows.filter((r) => r.status !== 'ok')
console.log(`  no weight found: ${unresolved.length} (they will simply show no conversion)`)
process.exit(0)
