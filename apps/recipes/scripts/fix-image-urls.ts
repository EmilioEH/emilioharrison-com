/**
 * fix-image-urls.ts
 *
 * One-time migration script to fix recipe image URLs that are stored with the
 * wrong path prefix. A previous migration run stored URLs as `/api/uploads/<key>`
 * instead of the correct `/protected/recipes/api/uploads/<key>`, causing those
 * images to 404 in production.
 *
 * Fields checked and patched: `images` (string[]), `sourceImage` (string), `finishedImage` (string)
 *
 * Usage:
 *   # Dry run (default — prints what would change, writes nothing):
 *   npx tsx scripts/fix-image-urls.ts
 *
 *   # Apply changes:
 *   DRY_RUN=false npx tsx scripts/fix-image-urls.ts
 */

import { FirebaseRestService } from '../src/lib/firebase-rest'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DRY_RUN = process.env.DRY_RUN !== 'false'

const BROKEN_PREFIX = '/api/uploads/'
const CORRECT_PREFIX = '/protected/recipes/api/uploads/'

/** Returns the corrected URL, or the original string if it doesn't need fixing. */
const fixUrl = (url: string): string => {
  if (url.startsWith(BROKEN_PREFIX)) {
    return CORRECT_PREFIX + url.slice(BROKEN_PREFIX.length)
  }
  return url
}

async function run() {
  console.log(`\nfix-image-urls — ${DRY_RUN ? 'DRY RUN (no changes will be written)' : 'LIVE RUN'}`)
  console.log('─'.repeat(60))

  const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json')
  if (!fs.existsSync(serviceAccountPath)) {
    console.error(`ERROR: Service account not found at ${serviceAccountPath}`)
    process.exit(1)
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'))
  const db = new FirebaseRestService(serviceAccount)

  console.log('Fetching all recipes...')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRecipes = (await db.getCollection('recipes')) as any[]
  console.log(`Retrieved ${allRecipes.length} recipes total.\n`)

  // Find recipes with any broken URL in images[], sourceImage, or finishedImage
  const affected = allRecipes.filter((r) => {
    const imagesHasBroken =
      Array.isArray(r.images) && r.images.some((u: string) => u.startsWith(BROKEN_PREFIX))
    const sourceImageBroken =
      typeof r.sourceImage === 'string' && r.sourceImage.startsWith(BROKEN_PREFIX)
    const finishedImageBroken =
      typeof r.finishedImage === 'string' && r.finishedImage.startsWith(BROKEN_PREFIX)
    return imagesHasBroken || sourceImageBroken || finishedImageBroken
  })

  if (affected.length === 0) {
    console.log('No recipes with broken image URLs found. Nothing to do.')
    return
  }

  console.log(`Found ${affected.length} recipe(s) with broken image URLs:\n`)

  let fixedCount = 0

  for (const r of affected) {
    const patch: Record<string, unknown> = {}
    const changes: string[] = []

    // Fix images array
    if (Array.isArray(r.images)) {
      const fixedImages = r.images.map((u: string) => fixUrl(u))
      if (fixedImages.some((u: string, i: number) => u !== r.images[i])) {
        patch.images = fixedImages
        const brokenCount = r.images.filter((u: string) => u.startsWith(BROKEN_PREFIX)).length
        changes.push(`  images[]: fixed ${brokenCount} URL(s)`)
        changes.push(`    before: ${r.images.filter((u: string) => u.startsWith(BROKEN_PREFIX)).join(', ')}`)
        changes.push(`    after:  ${fixedImages.filter((u: string) => u.startsWith(CORRECT_PREFIX) && r.images.includes(u.replace(CORRECT_PREFIX, BROKEN_PREFIX))).join(', ')}`)
      }
    }

    // Fix sourceImage
    if (typeof r.sourceImage === 'string' && r.sourceImage.startsWith(BROKEN_PREFIX)) {
      patch.sourceImage = fixUrl(r.sourceImage)
      changes.push(`  sourceImage: ${r.sourceImage} → ${patch.sourceImage}`)
    }

    // Fix finishedImage
    if (typeof r.finishedImage === 'string' && r.finishedImage.startsWith(BROKEN_PREFIX)) {
      patch.finishedImage = fixUrl(r.finishedImage)
      changes.push(`  finishedImage: ${r.finishedImage} → ${patch.finishedImage}`)
    }

    if (Object.keys(patch).length === 0) continue

    console.log(`Recipe: ${r.title || r.id} (id: ${r.id})`)
    changes.forEach((line) => console.log(line))

    if (!DRY_RUN) {
      await db.updateDocument('recipes', r.id, patch)
      process.stdout.write('  ✓ Updated\n')
    } else {
      process.stdout.write('  [DRY RUN] Would update\n')
    }

    console.log()
    fixedCount++
  }

  console.log('─'.repeat(60))
  if (DRY_RUN) {
    console.log(
      `Dry run complete. ${fixedCount} recipe(s) would be updated.`,
    )
    console.log('To apply changes, run: DRY_RUN=false npx tsx scripts/fix-image-urls.ts')
  } else {
    console.log(`Done. ${fixedCount} recipe(s) updated.`)
  }
}

run().catch((e) => {
  console.error('Script failed:', e)
  process.exit(1)
})
