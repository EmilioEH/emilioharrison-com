import { db } from '../src/lib/firebase-server'

async function testRestService() {
  console.log('🧪 Testing FirebaseRestService...')
  try {
    const id = `rest-test-${Date.now()}`
    console.log(`📝 Creating doc via REST: ${id}`)

    // Using the same method as the API
    const res = await db.createDocument('feedback', id, {
      description: 'Test from REST Service Script',
      timestamp: new Date().toISOString(),
      type: 'debug-rest',
      status: 'open',
      context: { user: 'Antigravity-REST' },
    })

    console.log('✅ Result:', JSON.stringify(res, null, 2))
  } catch (err: any) {
    console.error('❌ Error:', err)
  }
}

testRestService()
