/**
 * Stamps `outcome` onto every stored review, from its 1-5 rating.
 *
 * The mapping is the one the audit justified — see `scripts/REVIEW-AUDIT-2026-08-02.md`, which was
 * read before this was written. Its finding is what makes a rule safe here: every rating value
 * present in the live data maps to the same verdict whether it came from the week review's four
 * taps or the recipe page's five stars, so the two surfaces (indistinguishable on the record,
 * both having written `source: 'quick'`) do not need to be told apart.
 *
 * Idempotent: a review that already carries a verdict is left exactly as it is, so this can be
 * re-run safely and will not overwrite an answer a cook has given since. `rating` is deliberately
 * left in place — it stays written for one release so a rollback has something to read.
 *
 *   npx tsx scripts/migrate-reviews.ts            # dry run, prints what it would do
 *   npx tsx scripts/migrate-reviews.ts --write    # actually writes
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import fs from 'node:fs'
import { verdictForRating } from '../src/lib/week-review'
import type { Review } from '../src/lib/types'

const WRITE = process.argv.includes('--write')

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

let docsScanned = 0
let docsChanged = 0
let reviewsStamped = 0
let reviewsAlreadyDone = 0
let reviewsUnmappable = 0
const tally: Record<string, number> = {}

const familySnap = await db.collection('families').get()
for (const family of familySnap.docs) {
  const dataSnap = await db.collection('families').doc(family.id).collection('recipeData').get()

  for (const doc of dataSnap.docs) {
    docsScanned++
    const reviews = (doc.data().reviews ?? []) as Review[]
    if (!reviews.length) continue

    let changed = false
    const updated = reviews.map((review) => {
      if (review.outcome) {
        reviewsAlreadyDone++
        return review
      }
      if (typeof review.rating !== 'number' || !Number.isFinite(review.rating)) {
        // Nothing to derive a verdict from. Left alone rather than guessed at — the readers all
        // fall back gracefully, and inventing an opinion is worse than having none.
        reviewsUnmappable++
        console.warn(`  ! ${doc.id}: review ${review.id} has no usable rating; left as-is`)
        return review
      }

      const outcome = verdictForRating(review.rating)
      tally[`${review.rating} -> ${outcome}`] = (tally[`${review.rating} -> ${outcome}`] ?? 0) + 1
      reviewsStamped++
      changed = true
      return { ...review, outcome }
    })

    if (!changed) continue
    docsChanged++
    if (WRITE) {
      await doc.ref.update({ reviews: updated })
    }
  }
}

console.log(`\n${WRITE ? 'WROTE' : 'DRY RUN — nothing written'}`)
console.log(`recipeData documents scanned   ${docsScanned}`)
console.log(`documents ${WRITE ? 'updated' : 'that would change'}       ${docsChanged}`)
console.log(`reviews stamped                ${reviewsStamped}`)
console.log(`reviews already carrying one   ${reviewsAlreadyDone}`)
console.log(`reviews left alone (no rating) ${reviewsUnmappable}`)

console.log('\nMapping applied')
for (const [key, count] of Object.entries(tally).sort()) console.log(`  ${key.padEnd(20)} ${count}`)

if (!WRITE) console.log('\nRe-run with --write to apply.')
