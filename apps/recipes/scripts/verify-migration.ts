import { FirebaseRestService } from '../src/lib/firebase-rest'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function verify() {
  console.log('Verifying Migration Results...')

  try {
    const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json')
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'))
    const db = new FirebaseRestService(serviceAccount)

    const allRecipes = await db.getCollection('recipes')
    console.log(`Total Recipes in DB: ${allRecipes.length}`)

    if (allRecipes.length === 0) {
      console.log('Database is empty.')
      return
    }

    console.log('\nLatest Recipes Ownership Check:')
    // Sort by createdAt desc
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allRecipes.sort((a: any, b: any) => {
      const da = new Date(a.createdAt || 0).getTime()
      const db = new Date(b.createdAt || 0).getTime()
      return db - da
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allRecipes.slice(0, 5).forEach((r: any) => {
      console.log(`- ${r.title}`)
      console.log(`  ID: ${r.id}`)
      console.log(`  CreatedBy: ${r.createdBy}`)
      console.log(`  FamilyId: ${r.familyId}`)
      console.log(`  UpdatedAt: ${r.updatedAt}`)
      console.log(`  Images: ${JSON.stringify(r.images)}`)
    })
  } catch (e) {
    console.error('Verification failed:', e)
  }
}

verify()
