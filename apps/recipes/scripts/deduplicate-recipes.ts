import { FirebaseRestService } from '../src/lib/firebase-rest'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const DRY_RUN = process.env.DRY_RUN !== 'false' // Default to TRUE for safety

async function deduplicate() {
  console.log('Starting Recipe Deduplication...')
  console.log(`Dry Run: ${DRY_RUN}`)

  try {
    const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json')
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(`Service account not found at: ${serviceAccountPath}`)
    }
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'))
    const db = new FirebaseRestService(serviceAccount)

    console.log('Fetching all recipes...')
    const allRecipes = await db.getCollection('recipes')
    console.log(`Total recipes: ${allRecipes.length}`)

    // Group by Title
    const titleMap = new Map<string, any[]>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allRecipes.forEach((r: any) => {
      const title = (r.title || '').trim()
      if (!title) return

      if (!titleMap.has(title)) {
        titleMap.set(title, [])
      }
      titleMap.get(title)?.push(r)
    })

    let deleteCount = 0
    let keptCount = 0

    for (const [title, recipes] of titleMap.entries()) {
      if (recipes.length < 2) continue

      // Logic: specific preference for 'ai-parse'
      // Sort: 'ai-parse' first, then by createdAt desc (newest first)
      const sorted = recipes.sort((a, b) => {
        const aIsAI = a.creationMethod === 'ai-parse'
        const bIsAI = b.creationMethod === 'ai-parse'
        if (aIsAI && !bIsAI) return -1
        if (!aIsAI && bIsAI) return 1

        // If both same method, newest first
        const da = new Date(a.createdAt || 0).getTime()
        const db = new Date(b.createdAt || 0).getTime()
        return db - da
      })

      const toKeep = sorted[0]
      const toDelete = sorted.slice(1)

      console.log(`\nDuplicate: "${title}" (${recipes.length} copies)`)
      console.log(
        `   KEEP: ID=${toKeep.id} Method=${toKeep.creationMethod} Created=${toKeep.createdAt}`,
      )

      for (const r of toDelete) {
        console.log(`   DELETE: ID=${r.id} Method=${r.creationMethod} Created=${r.createdAt}`)
        if (!DRY_RUN) {
          await db.deleteDocument('recipes', r.id)
          process.stdout.write('x')
        }
        deleteCount++
      }
      keptCount++
    }

    console.log('\n\n--- Summary ---')
    console.log(`Processed groups: ${titleMap.size}`)
    console.log(`Kept recipes: ${keptCount} (duplicate sets resolved)`)
    console.log(`Recipes to delete: ${deleteCount}`)

    if (DRY_RUN) {
      console.log('\nRun with DRY_RUN=false to execute deletion.')
    } else {
      console.log('\nDeletion Complete.')
    }
  } catch (e) {
    console.error('Deduplication failed:', e)
  }
}

deduplicate()
