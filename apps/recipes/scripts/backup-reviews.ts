/**
 * Dumps every recipeData document under every family that carries reviews, verbatim, to JSON.
 *
 * Taken before `migrate-reviews.ts --write` so the stamping is genuinely undoable. The migration
 * is additive and idempotent, but "additive" is a claim about the code, and a file on disk is a
 * fact about the data.
 *
 *   npx tsx scripts/backup-reviews.ts <path.json>
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import fs from 'node:fs'

const out = process.argv[2]
if (!out) throw new Error('usage: npx tsx scripts/backup-reviews.ts <path.json>')

const env = fs.readFileSync('/root/.recipe-worker.env', 'utf8')
const line = env.split('\n').find((x) => x.startsWith('FIREBASE_SERVICE_ACCOUNT='))!
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
const db = getFirestore()

const rows: Array<{ familyId: string; recipeId: string; reviews: unknown }> = []
for (const family of (await db.collection('families').get()).docs) {
  const snap = await db.collection('families').doc(family.id).collection('recipeData').get()
  for (const doc of snap.docs) {
    const reviews = doc.data().reviews
    if (Array.isArray(reviews) && reviews.length) {
      rows.push({ familyId: family.id, recipeId: doc.id, reviews })
    }
  }
}

fs.writeFileSync(out, JSON.stringify(rows, null, 2))
console.log(
  `backed up ${rows.reduce((n, r) => n + (r.reviews as unknown[]).length, 0)} reviews across ${rows.length} documents -> ${out}`,
)
