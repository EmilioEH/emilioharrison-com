/**
 * Read-only census of every review in the live data, before anything is migrated.
 *
 * The two rating surfaces — the week review (four taps) and the recipe page (five stars) — both
 * write `source: 'quick'`, so a stored `4` means "Good" from one and "four stars out of five"
 * from the other, and nothing on the record says which. Any mapping to the new verdicts has to be
 * chosen from what is actually there, not from what the schema permits: if the pile is small
 * enough, the honest answer is to map it by hand.
 *
 * Prints counts only. Writes nothing. Run:
 *   npx tsx scripts/audit-reviews.ts
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import fs from 'node:fs'
import type { Review, UserRating } from '../src/lib/types'

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

const bump = (counter: Record<string, number>, key: string) => {
  counter[key] = (counter[key] ?? 0) + 1
}

const bySource: Record<string, number> = {}
const byRating: Record<string, number> = {}
const bySourceAndRating: Record<string, number> = {}
const withComment: Record<string, number> = {}
const withPhoto: Record<string, number> = {}
const withDifficulty: Record<string, number> = {}
const alreadyHasOutcome: Record<string, number> = {}

let families = 0
let recipeDataDocs = 0
let totalReviews = 0
let legacyRatings = 0
let docsWithWeekPlan = 0

/** Every review, so a small pile can simply be printed and read. */
const rows: Array<{
  family: string
  recipeId: string
  user: string
  rating: unknown
  source: unknown
  outcome: unknown
  comment: boolean
  photo: boolean
  createdAt: unknown
}> = []

const familySnap = await db.collection('families').get()
for (const family of familySnap.docs) {
  families++
  const dataSnap = await db.collection('families').doc(family.id).collection('recipeData').get()

  for (const doc of dataSnap.docs) {
    recipeDataDocs++
    const data = doc.data() as {
      reviews?: Review[]
      ratings?: UserRating[]
      weekPlan?: unknown
    }

    if (data.weekPlan) docsWithWeekPlan++
    if (Array.isArray(data.ratings)) legacyRatings += data.ratings.length

    for (const review of data.reviews ?? []) {
      totalReviews++
      const source = String(review.source ?? '(none)')
      const rating = String(review.rating ?? '(none)')
      const outcome = String((review as { outcome?: string }).outcome ?? '(none)')

      bump(bySource, source)
      bump(byRating, rating)
      bump(bySourceAndRating, `${source} / ${rating}`)
      bump(alreadyHasOutcome, outcome)
      if (review.comment) bump(withComment, source)
      if (review.photoUrl) bump(withPhoto, source)
      if (review.difficulty) bump(withDifficulty, source)

      rows.push({
        family: family.id,
        recipeId: doc.id,
        user: review.userName ?? review.userId ?? '(unknown)',
        rating: review.rating,
        source: review.source,
        outcome: (review as { outcome?: string }).outcome,
        comment: Boolean(review.comment),
        photo: Boolean(review.photoUrl),
        createdAt: review.createdAt,
      })
    }
  }
}

const show = (title: string, counter: Record<string, number>) => {
  console.log(`\n${title}`)
  const entries = Object.entries(counter).sort((a, b) => b[1] - a[1])
  if (!entries.length) console.log('  (none)')
  for (const [key, count] of entries) console.log(`  ${key.padEnd(28)} ${count}`)
}

console.log('=== Review census ===')
console.log(`families                 ${families}`)
console.log(`recipeData documents     ${recipeDataDocs}`)
console.log(`  ...with a weekPlan     ${docsWithWeekPlan}`)
console.log(`reviews                  ${totalReviews}`)
console.log(`legacy ratings[] entries ${legacyRatings}`)

show('By source', bySource)
show('By rating', byRating)
show('By source and rating', bySourceAndRating)
show('Carrying a comment (by source)', withComment)
show('Carrying a photo (by source)', withPhoto)
show('Carrying a difficulty (by source)', withDifficulty)
show('Already carrying an outcome', alreadyHasOutcome)

// Small enough to read in full is the outcome worth hoping for: it means the mapping can be
// decided by looking rather than by inferring a rule from a shape that cannot distinguish the
// two entry points.
if (rows.length && rows.length <= 60) {
  console.log('\n=== Every review, in full ===')
  for (const row of rows) {
    console.log(
      `  ${String(row.createdAt).slice(0, 10)}  rating=${String(row.rating).padEnd(6)}` +
        `source=${String(row.source).padEnd(9)}outcome=${String(row.outcome).padEnd(9)}` +
        `${row.comment ? 'comment ' : ''}${row.photo ? 'photo ' : ''}` +
        `${row.user} — ${row.recipeId}`,
    )
  }
} else if (rows.length) {
  console.log(`\n(${rows.length} reviews — too many to print; rely on the counts above)`)
}
