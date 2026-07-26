/**
 * Normalises every stored ingredient into a numeric quantity, a canonical unit, a clean name and a
 * separate prep note — keeping the printed line verbatim in `original`.
 *
 * Dry run by default; pass --write to update Firestore. Pass --verbose to print every change
 * rather than a sample.
 *
 * Nothing here calls a model. The parse is deterministic (see lib/ingredient-parse.ts), so the
 * same stored line always produces the same result, and a wrong entry is corrected by fixing the
 * parser and re-running rather than by re-asking an AI.
 *
 * **Loss guard.** A record is HELD, not written, whenever a word that was on the page would stop
 * being displayed. `original` means nothing is destroyed in the database either way, but a held
 * record is one a human should look at before the app starts rendering it differently.
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import fs from 'node:fs'
import { parseIngredientLine, reconstructIngredientLine } from '../src/lib/ingredient-parse'
import { normalizeUnit, unitLabel, UNIT_WORDS, CANONICAL_UNITS } from '../src/lib/units'
import type { Ingredient } from '../src/lib/types'

const WRITE = process.argv.includes('--write')
const VERBOSE = process.argv.includes('--verbose')
const ENV_PATH = '/root/.recipe-worker.env'

function initFirestore() {
  const env = fs.readFileSync(ENV_PATH, 'utf8')
  const line = env.split('\n').find((l) => l.startsWith('FIREBASE_SERVICE_ACCOUNT='))
  if (!line) throw new Error(`FIREBASE_SERVICE_ACCOUNT not found in ${ENV_PATH}`)
  let raw = line.slice('FIREBASE_SERVICE_ACCOUNT='.length).trim()
  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"')))
    raw = raw.slice(1, -1)
  const sa = JSON.parse(raw)
  if (!getApps().length)
    initializeApp({
      credential: cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
    })
  return getFirestore()
}

/** Words that carry meaning from the page — excludes numbers, units and filler. */
function contentWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => w.length > 2)
    .filter((w) => !UNIT_WORDS.has(w) && !normalizeUnit(w).id)
    .filter((w) => !['about', 'approx', 'and', 'the', 'for', 'plus', 'more', 'one', 'two'].includes(w))
}

/** Renders the measure a row shows: "1½ cups". Fractions print as the page writes them. */
const FRACTIONS: Array<[number, string]> = [
  [0.125, '⅛'], [0.25, '¼'], [1 / 3, '⅓'], [0.375, '⅜'], [0.5, '½'],
  [0.625, '⅝'], [2 / 3, '⅔'], [0.75, '¾'], [0.875, '⅞'],
]
function formatQuantity(value: number): string {
  const whole = Math.floor(value)
  const frac = value - whole
  if (frac < 0.001) return String(whole)
  for (const [size, glyph] of FRACTIONS) {
    if (Math.abs(frac - size) < 0.02) return whole ? `${whole}${glyph}` : glyph
  }
  return String(Math.round(value * 100) / 100)
}

function formatAmount(quantity: number | undefined, unitId: string | undefined): string {
  const label = unitLabel(unitId, quantity)
  const number = quantity === undefined ? '' : formatQuantity(quantity)
  return [number, label].filter(Boolean).join(' ')
}

interface Change {
  id: string
  title: string
  index: number
  before: { amount: string; name: string; prep?: string }
  after: Ingredient
  line: string
}

async function main() {
  const db = initFirestore()
  const snap = await db.collection('recipes').get()

  const changes: Change[] = []
  const held: Array<{ id: string; title: string; line: string; why: string; after: Ingredient }> = []
  const perRecipe = new Map<string, Ingredient[]>()
  let unchangedRecipes = 0
  let totalIngredients = 0
  let parsedQuantity = 0
  let parsedUnit = 0

  for (const doc of snap.docs) {
    const data = doc.data()
    const stored: Ingredient[] = Array.isArray(data.ingredients) ? data.ingredients : []
    if (!stored.length) continue

    const next: Ingredient[] = []
    let recipeHeld = false
    let recipeChanged = false

    for (const [index, item] of stored.entries()) {
      totalIngredients++
      const line = reconstructIngredientLine(item)
      const parsed = parseIngredientLine(line)

      const after: Ingredient = {
        name: parsed.name,
        amount: formatAmount(parsed.quantity, parsed.unit),
        ...(parsed.quantity !== undefined ? { quantity: parsed.quantity } : {}),
        ...(parsed.unit ? { unit: parsed.unit } : {}),
        ...(parsed.prep ? { prep: parsed.prep } : {}),
        ...(parsed.note ? { note: parsed.note } : {}),
        original: parsed.original,
      }
      // A prep note the record already carried is kept alongside anything the parse found, so a
      // stored note is never dropped — unless it is already said elsewhere, which would render
      // "diced red pepper, diced".
      const carried = String(item.prep ?? '').trim()
      const alreadySaid = `${after.name} ${after.prep ?? ''}`.toLowerCase()
      if (carried && !alreadySaid.includes(carried.toLowerCase())) {
        after.prep = [after.prep, carried].filter(Boolean).join(', ')
      }

      if (parsed.quantity !== undefined) parsedQuantity++
      if (parsed.unit) parsedUnit++

      // --- loss guards -------------------------------------------------------------------
      // Everything the record displayed before must still be displayed after — the stored prep
      // included, since it is shown to the reader but isn't part of the reconstructed line.
      const shown = [after.name, after.prep ?? '', after.note ?? '', after.amount].join(' ')
      const wasShown = `${line} ${String(item.prep ?? '')}`
      const lost = contentWords(wasShown).filter((w) => !contentWords(shown).includes(w))
      let why = ''
      if (!after.name.trim()) why = 'name would be empty'
      else if (lost.length) why = `words dropped from display: ${lost.slice(0, 6).join(', ')}`

      if (why) {
        recipeHeld = true
        held.push({ id: doc.id, title: data.title, line, why, after })
        next.push(item) // keep the record exactly as stored
        continue
      }

      const before = {
        amount: String(item.amount ?? ''),
        name: String(item.name ?? ''),
        ...(item.prep ? { prep: String(item.prep) } : {}),
      }
      if (
        before.amount !== after.amount ||
        before.name !== after.name ||
        (before.prep ?? '') !== (after.prep ?? '')
      ) {
        recipeChanged = true
        changes.push({ id: doc.id, title: data.title, index, before, after, line })
      }
      next.push(after)
    }

    if (recipeChanged || !recipeHeld) perRecipe.set(doc.id, next)
    if (!recipeChanged) unchangedRecipes++
  }

  // --- report ---------------------------------------------------------------------------
  console.log(WRITE ? '=== WRITING ===' : '=== DRY RUN — nothing written ===')
  console.log(`recipes scanned:        ${snap.size}`)
  console.log(`ingredients scanned:    ${totalIngredients}`)
  console.log(
    `  quantity parsed:      ${parsedQuantity} (${((parsedQuantity / totalIngredients) * 100).toFixed(1)}%)`,
  )
  console.log(
    `  unit parsed:          ${parsedUnit} (${((parsedUnit / totalIngredients) * 100).toFixed(1)}%)`,
  )
  console.log(`ingredients changing:   ${changes.length}`)
  console.log(`HELD for review:        ${held.length}`)
  console.log(`recipes unchanged:      ${unchangedRecipes}`)

  const sample = VERBOSE ? changes : changes.filter((_, i) => i % Math.ceil(changes.length / 40) === 0)
  console.log(`\n=== CHANGES (${VERBOSE ? 'all' : `${sample.length} sampled of ${changes.length}`}) ===`)
  for (const c of sample) {
    console.log(`\n  ${c.title?.slice(0, 60)}`)
    console.log(`    line:   ${JSON.stringify(c.line)}`)
    console.log(
      `    before: amount=${JSON.stringify(c.before.amount)} name=${JSON.stringify(c.before.name)}` +
        (c.before.prep ? ` prep=${JSON.stringify(c.before.prep)}` : ''),
    )
    console.log(
      `    after:  amount=${JSON.stringify(c.after.amount)} name=${JSON.stringify(c.after.name)}` +
        (c.after.prep ? ` prep=${JSON.stringify(c.after.prep)}` : '') +
        `  [qty=${c.after.quantity ?? '—'} unit=${c.after.unit ?? '—'}]`,
    )
  }

  console.log(`\n=== HELD (${held.length}) — kept exactly as stored ===`)
  const byReason = new Map<string, number>()
  for (const h of held) {
    const key = h.why.startsWith('words dropped') ? 'words dropped from display' : h.why
    byReason.set(key, (byReason.get(key) ?? 0) + 1)
  }
  for (const [reason, n] of [...byReason].sort((a, b) => b[1] - a[1])) console.log(`  ${n}  ${reason}`)
  for (const h of held.slice(0, VERBOSE ? held.length : 25)) {
    console.log(`\n    ${JSON.stringify(h.line.slice(0, 90))}`)
    console.log(`      -> name=${JSON.stringify(h.after.name)} prep=${JSON.stringify(h.after.prep ?? '')}`)
    console.log(`      ${h.why}`)
  }

  const outPath = '/tmp/claude-0/-root/0eecc1e3-1eda-430b-bf0a-190dc7a10f2b/scratchpad/normalize-report.json'
  fs.writeFileSync(outPath, JSON.stringify({ changes, held }, null, 1))
  console.log(`\nfull report: ${outPath}`)

  if (!WRITE) {
    console.log('\nDry run only. Re-run with --write to apply.')
    process.exit(0)
  }

  let written = 0
  for (const [id, ingredients] of perRecipe) {
    await db.collection('recipes').doc(id).update({ ingredients, updatedAt: new Date().toISOString() })
    written++
  }
  console.log(`\nwrote ${written} recipes`)
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
