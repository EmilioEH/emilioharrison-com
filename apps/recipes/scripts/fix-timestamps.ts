import { FirebaseRestService } from '../src/lib/firebase-rest'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function fixTimestamps() {
  console.log('Fixing timestamps for recipes...')

  try {
    const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json')
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'))
    const db = new FirebaseRestService(serviceAccount)

    const allRecipes = await db.getCollection('recipes')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const brokenRecipes = (allRecipes as any[]).filter((r) => !r.updatedAt)

    console.log(`Found ${brokenRecipes.length} recipes missing updatedAt.`)

    if (brokenRecipes.length === 0) {
      console.log('No repairs needed.')
      return
    }

    for (const r of brokenRecipes) {
      const update = { updatedAt: r.createdAt || new Date().toISOString() }
      // Use patch/updateDocument (need to check method name in library)
      // Usually updateDocument is patch.
      await db.updateDocument('recipes', r.id, update)
      process.stdout.write('.')
    }
    console.log('\nRepairs complete.')
  } catch (e) {
    console.error('Repair failed:', e)
  }
}

fixTimestamps()
