import admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
import serviceAccount from '../firebase-service-account.json'

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any),
  })
}

const db = getFirestore()

async function debugFeedback() {
  console.log('🔍 Debugging Feedback Collection...')
  try {
    const snapshot = await db.collection('feedback').get()
    console.log(`📂 Total documents: ${snapshot.size}`)
    snapshot.forEach((doc) => {
      console.log(`- ${doc.id}:`, doc.data())
    })
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

debugFeedback()
