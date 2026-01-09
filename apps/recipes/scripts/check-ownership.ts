import { FirebaseRestService } from '../src/lib/firebase-rest.js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function check() {
  console.log('Checking ownership...')

  try {
    const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json')
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'))
    const db = new FirebaseRestService(serviceAccount)

    // 1. Get Target User
    const users = await db.getCollection('users')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const targetUser = (users as any[]).find(
      (u) => u.email?.toLowerCase() === 'emilioeh1991@gmail.com',
    )

    if (targetUser) {
      console.log(`Target User: ${targetUser.email} (ID: ${targetUser.id})`)
    } else {
      console.error('Target user emilioeh1991@gmail.com NOT FOUND')
    }

    // 2. Sample Recipes
    const allRecipes = await db.getCollection('recipes')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const owned = (allRecipes as any[]).filter((r) => r.createdBy === targetUser?.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const legacy = (allRecipes as any[]).filter((r) => !r.createdBy)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const others = (allRecipes as any[]).filter(
      (r) => r.createdBy && r.createdBy !== targetUser?.id,
    )

    console.log(`\nStats:`)
    console.log(`Total Recipes: ${allRecipes.length}`)
    console.log(`Owned by Target: ${owned.length}`)
    console.log(`Legacy (Unowned): ${legacy.length}`)
    console.log(`Owned by Others: ${others.length}`)

    if (others.length > 0) {
      console.log(
        'Sample "Other" owners:',
        others.slice(0, 3).map((r) => r.createdBy),
      )
    }
  } catch (e) {
    console.error('Check failed:', e)
  }
}

check()
