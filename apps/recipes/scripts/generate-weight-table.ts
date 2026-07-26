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
  status: string
}

const rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) as Row[]
const out = process.argv[3]

/** Outside this range the figure is far more likely to be a mismatched record than a real food. */
const PLAUSIBLE_MIN = 5
const PLAUSIBLE_MAX = 500

const usable = rows
  .filter((r) => r.status === 'ok' && typeof r.gramsPerCup === 'number')
  .filter((r) => r.gramsPerCup! >= PLAUSIBLE_MIN && r.gramsPerCup! <= PLAUSIBLE_MAX)
  .sort((a, b) => b.count - a.count)

const rejected = rows.filter((r) => r.status === 'ok' && !usable.includes(r))

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
console.log(`  rejected as implausible (<${PLAUSIBLE_MIN}g or >${PLAUSIBLE_MAX}g per cup): ${rejected.length}`)
rejected.slice(0, 10).forEach((r) => console.log(`     ${r.gramsPerCup}g  ${r.display} <- ${r.matched}`))
const unresolved = rows.filter((r) => r.status !== 'ok')
console.log(`  no weight found: ${unresolved.length} (they will simply show no conversion)`)
process.exit(0)
