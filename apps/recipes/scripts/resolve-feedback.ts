import admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'

import type { ServiceAccount } from 'firebase-admin'

// JSON import
import serviceAccount from '../firebase-service-account.json'

const id = process.argv[2]
const status = process.argv[3] || 'fixed'

if (!id) {
  console.error('Usage: npx tsx scripts/resolve-feedback.ts <id> [status=fixed]')
  console.error('Example: npx tsx scripts/resolve-feedback.ts 123-abc fixed')
  process.exit(1)
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as ServiceAccount),
  })
}

const db = getFirestore()

async function resolveFeedback() {
  console.log(`Resolving feedback ${id} as '${status}' (Firestore)...`)

  const resolvedAt = status !== 'open' ? new Date().toISOString() : null

  try {
    const docRef = db.collection('feedback').doc(id)
    const doc = await docRef.get()

    if (!doc.exists) {
      console.error('❌ Feedback not found.')
      process.exit(1)
    }

    await docRef.update({
      status,
      resolved_at: resolvedAt,
    })

    console.log('✅ Feedback updated.')
  } catch (e) {
    console.error('❌ Failed to update feedback:', e)
    process.exit(1)
  }
}

resolveFeedback()
