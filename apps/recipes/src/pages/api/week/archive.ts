import type { APIRoute } from 'astro'
import { FirebaseRestService } from '../../../lib/firebase-rest'
import type { ServiceAccount } from '../../../lib/types'

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json()
    const { weekStart, weekEnd, archivedAt, mealCount, recipes } = data

    if (!weekStart || !recipes) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
    }

    // Construct Service Account from Env
    const serviceAccount: ServiceAccount = {
      project_id: process.env.FIREBASE_PROJECT_ID || '',
      client_email: process.env.FIREBASE_CLIENT_EMAIL || '',
      private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      token_uri: 'https://oauth2.googleapis.com/token',
    }

    const firebase = new FirebaseRestService(serviceAccount)
    const collection = 'weekHistory'

    // Check if authenticating user is authorized?
    // Usually we check session here. For now assuming open or relying on app safeguards.
    // Ideally: const user = await getUser(request); if (!user) ...

    // Use the specific ID format: Monday's date (weekStart)
    const docId = weekStart

    await firebase.setDocument(collection, docId, {
      weekStart,
      weekEnd,
      archivedAt,
      mealCount,
      recipes,
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Archive error:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })
  }
}
