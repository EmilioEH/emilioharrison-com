/**
 * Backs up the ingredient data this migration touches, before it touches it.
 *
 * Firestore has no undo. Only `ingredients` (and `updatedAt`) are modified by
 * normalize-ingredients.ts, so those plus the document id are a complete restore path — full
 * documents are avoided because base64 `sourceImage` fields make them enormous.
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import fs from 'node:fs'

const env = fs.readFileSync('/root/.recipe-worker.env', 'utf8')
const line = env.split('\n').find((l) => l.startsWith('FIREBASE_SERVICE_ACCOUNT='))
if (!line) throw new Error('FIREBASE_SERVICE_ACCOUNT not found')
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
const snap = await db.collection('recipes').get()

const backup = snap.docs.map((doc) => ({
  id: doc.id,
  title: doc.data().title ?? '',
  ingredients: doc.data().ingredients ?? [],
  updatedAt: doc.data().updatedAt ?? null,
}))

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const path = `/root/backups/ingredients-${stamp}.json`
fs.writeFileSync(path, JSON.stringify(backup, null, 1))

console.log(`backed up ${backup.length} recipes`)
console.log(`ingredients: ${backup.reduce((n, r) => n + r.ingredients.length, 0)}`)
console.log(path)
process.exit(0)
