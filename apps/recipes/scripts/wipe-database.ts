import { FirebaseRestService } from '../src/lib/firebase-rest'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function wipeDatabase() {
  console.log('STARTING DATABASE WIPE...')

  try {
    const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json')
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'))
    const db = new FirebaseRestService(serviceAccount)

    const allRecipes = await db.getCollection('recipes')
    console.log(`Found ${allRecipes.length} recipes to delete.`)

    if (allRecipes.length === 0) {
      console.log('Database already empty.')
      return
    }

    let deletedcheck = 0

    // Chunking to avoid overwhelming local network/process if array is huge (not really needed for 200, but good practice)
    const chunks = []
    const chunkSize = 10
    for (let i = 0; i < allRecipes.length; i += chunkSize) {
      chunks.push(allRecipes.slice(i, i + chunkSize))
    }

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (r: any) => {
          await db.deleteDocument('recipes', r.id)
          process.stdout.write('.')
          deletedcheck++
        }),
      )
    }

    console.log(`\n\nDeleted ${deletedcheck} recipes.`)
    console.log('Database Wipe Complete.')
  } catch (e) {
    console.error('Wipe failed:', e)
  }
}

wipeDatabase()
