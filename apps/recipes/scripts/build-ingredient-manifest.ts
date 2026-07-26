/**
 * Phase 4: collapses the library's ingredient names into one entry per real ingredient.
 *
 * Only ingredients that actually appear with a *volume* unit need a weight — anything always
 * weighed or always counted converts for free, or not at all. So the manifest records how each
 * ingredient is measured, and marks the ones the weight table has to cover.
 *
 * Writes JSON to the path given as the first argument.
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import fs from 'node:fs'
import { ingredientKey } from '../src/lib/ingredient-names'
import { normalizeUnit } from '../src/lib/units'
import type { Ingredient } from '../src/lib/types'

const env = fs.readFileSync('/root/.recipe-worker.env', 'utf8')
const l = env.split('\n').find((x) => x.startsWith('FIREBASE_SERVICE_ACCOUNT='))!
let raw = l.slice('FIREBASE_SERVICE_ACCOUNT='.length).trim()
if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"')))
  raw = raw.slice(1, -1)
const sa = JSON.parse(raw)
if (!getApps().length)
  initializeApp({ credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }) })
const db = getFirestore()

interface Entry {
  key: string
  display: string
  variants: Map<string, number>
  count: number
  families: Map<string, number>
}

const entries = new Map<string, Entry>()
const snap = await db.collection('recipes').get()

for (const doc of snap.docs) {
  for (const ing of (doc.data().ingredients ?? []) as Ingredient[]) {
    const name = String(ing.name ?? '').trim()
    const key = ingredientKey(name)
    if (!key) continue

    const entry = entries.get(key) ?? {
      key, display: name, variants: new Map(), count: 0, families: new Map(),
    }
    entry.count++
    entry.variants.set(name, (entry.variants.get(name) ?? 0) + 1)
    const family = ing.unit ? (normalizeUnit(ing.unit).family ?? 'unknown') : 'none'
    entry.families.set(family, (entry.families.get(family) ?? 0) + 1)
    entries.set(key, entry)
  }
}

const manifest = [...entries.values()]
  .map((e) => {
    const variants = [...e.variants.entries()].sort((a, b) => b[1] - a[1])
    const families = Object.fromEntries([...e.families.entries()].sort((a, b) => b[1] - a[1]))
    return {
      key: e.key,
      // The most common spelling, so the manifest reads like something a person wrote.
      display: variants[0][0],
      count: e.count,
      variants: variants.map(([v]) => v),
      families,
      // Only a volume measurement needs a per-ingredient weight to become grams.
      needsWeight: (families.volume ?? 0) > 0,
    }
  })
  .sort((a, b) => b.count - a.count)

const needing = manifest.filter((m) => m.needsWeight)
fs.writeFileSync(process.argv[2], JSON.stringify(manifest, null, 1))

console.log(`distinct ingredient names collapsed to ${manifest.length} entries`)
console.log(`  measured by volume at least once (need a weight): ${needing.length}`)
console.log(`  never measured by volume (no weight needed):      ${manifest.length - needing.length}`)
console.log(`\ntop of the list:`)
manifest.slice(0, 15).forEach((m) => {
  const fams = Object.entries(m.families).map(([f, n]) => `${f}:${n}`).join(' ')
  console.log(`  ${String(m.count).padStart(4)}  ${m.display.slice(0, 34).padEnd(34)} ${m.needsWeight ? 'WEIGHT' : '      '}  ${fams}`)
})
console.log(`\nbiggest collapses:`)
;[...manifest].sort((a, b) => b.variants.length - a.variants.length).slice(0, 8)
  .forEach((m) => console.log(`  ${m.display.slice(0, 26).padEnd(26)} <- ${m.variants.length} spellings: ${m.variants.slice(0, 4).join(' | ')}`))
console.log(`\nwritten to ${process.argv[2]}`)
process.exit(0)
