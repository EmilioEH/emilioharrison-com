/**
 * Independent read-only audit of the live ingredient data.
 *
 * Deliberately does not reuse the migration's own report — a migration reporting on itself only
 * proves it is self-consistent. This checks the shapes that would actually be wrong on screen.
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import fs from 'node:fs'
import { normalizeUnit } from '../src/lib/units'
import type { Ingredient } from '../src/lib/types'

const env = fs.readFileSync('/root/.recipe-worker.env', 'utf8')
const l = env.split('\n').find((x) => x.startsWith('FIREBASE_SERVICE_ACCOUNT='))!
let raw = l.slice('FIREBASE_SERVICE_ACCOUNT='.length).trim()
if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"')))
  raw = raw.slice(1, -1)
const sa = JSON.parse(raw)
if (!getApps().length)
  initializeApp({
    credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }),
  })
const db = getFirestore()

const backupPath = process.argv[2]
const backup = backupPath
  ? new Map(JSON.parse(fs.readFileSync(backupPath, 'utf8')).map((r: { id: string }) => [r.id, r]))
  : null

const snap = await db.collection('recipes').get()

let total = 0
const problems: Record<string, string[]> = {
  'empty name': [],
  'name is only a measure': [],
  'name still starts with a digit': [],
  'quantity present but not finite': [],
  'unit not in the vocabulary': [],
  'missing original': [],
  'ingredient count changed vs backup': [],
}

for (const doc of snap.docs) {
  const title = String(doc.data().title ?? '').slice(0, 40)
  const ings: Ingredient[] = doc.data().ingredients ?? []

  if (backup) {
    const before = backup.get(doc.id) as { ingredients?: unknown[] } | undefined
    if (before?.ingredients && before.ingredients.length !== ings.length) {
      problems['ingredient count changed vs backup'].push(
        `${title}: ${before.ingredients.length} -> ${ings.length}`,
      )
    }
  }

  for (const ing of ings) {
    total++
    const name = String(ing.name ?? '').trim()
    if (!name) problems['empty name'].push(`${title}: ${JSON.stringify(ing)}`)
    else {
      const family = normalizeUnit(name).family
      if (family === 'volume' || family === 'weight')
        problems['name is only a measure'].push(`${title}: ${JSON.stringify(name)}`)
      if (/^\d/.test(name)) problems['name still starts with a digit'].push(`${title}: ${JSON.stringify(name)}`)
    }
    if (ing.quantity !== undefined && !Number.isFinite(ing.quantity))
      problems['quantity present but not finite'].push(`${title}: ${ing.quantity}`)
    if (ing.unit && !normalizeUnit(ing.unit).id)
      problems['unit not in the vocabulary'].push(`${title}: ${JSON.stringify(ing.unit)}`)
    if (!String(ing.original ?? '').trim()) problems['missing original'].push(`${title}: ${JSON.stringify(ing)}`)
  }
}

console.log(`recipes: ${snap.size}   ingredients: ${total}\n`)
let clean = true
for (const [label, hits] of Object.entries(problems)) {
  const mark = hits.length === 0 ? 'ok  ' : 'FAIL'
  if (hits.length) clean = false
  console.log(`${mark}  ${String(hits.length).padStart(4)}  ${label}`)
  hits.slice(0, 5).forEach((h) => console.log(`             ${h}`))
}

const withQty = snap.docs.flatMap((d) => (d.data().ingredients ?? []) as Ingredient[])
console.log(
  `\ncoverage: ${withQty.filter((i) => typeof i.quantity === 'number').length}/${total} have a quantity, ` +
    `${withQty.filter((i) => i.unit).length}/${total} have a unit`,
)
console.log(clean ? '\nno structural problems found' : '\nproblems found — see above')
process.exit(0)
