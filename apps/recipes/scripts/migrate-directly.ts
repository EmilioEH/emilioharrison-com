import { FirebaseRestService } from '../src/lib/firebase-rest.js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function migrate() {
  console.log('Starting migration (Standalone Mode)...')

  try {
    // 1. Initialize DB Manually
    const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json')
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(`Service account not found at: ${serviceAccountPath}`)
    }

    // Read and parse service account
    const serviceAccountRaw = fs.readFileSync(serviceAccountPath, 'utf-8')
    const serviceAccount = JSON.parse(serviceAccountRaw)

    // Instantiate Service directly
    const db = new FirebaseRestService(serviceAccount)

    const targetEmail = 'emilioeh1991@gmail.com'

    // 2. Find User
    const users = await db.getCollection('users')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const targetUser = (users as any[]).find(
      (u) => u.email?.toLowerCase() === targetEmail.toLowerCase(),
    )

    if (!targetUser) {
      console.error(`User ${targetEmail} not found!`)
      process.exit(1)
    }

    console.log(
      `Found Target User: ${targetUser.email} (ID: ${targetUser.id}, Family: ${targetUser.familyId})`,
    )

    // 3. Find Legacy Recipes
    const allRecipes = await db.getCollection('recipes')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const legacyRecipes = (allRecipes as any[]).filter((r) => !r.createdBy)

    console.log(`Found ${legacyRecipes.length} legacy recipes out of ${allRecipes.length} total.`)

    if (legacyRecipes.length === 0) {
      console.log('Nothing to migrate.')
      return
    }

    // 4. Update
    let count = 0
    const chunkSize = 5
    for (let i = 0; i < legacyRecipes.length; i += chunkSize) {
      const chunk = legacyRecipes.slice(i, i + chunkSize)
      await Promise.all(
        chunk.map((r) => {
          console.log(`Migrating: "${r.title}"...`)
          return db.updateDocument('recipes', r.id, {
            createdBy: targetUser.id,
            familyId: targetUser.familyId || null,
          })
        }),
      )
      count += chunk.length
    }

    console.log(`Successfully migrated ${count} recipes.`)
  } catch (e) {
    console.error('Migration failed:', e)
    process.exit(1)
  }
}

migrate()
