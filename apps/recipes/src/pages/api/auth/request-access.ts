import type { APIRoute } from 'astro'
import { getEnv } from '../../../lib/env'
import { db } from '../../../lib/firebase-server'

export const POST: APIRoute = async (context) => {
  const { request } = context
  try {
    const { idToken } = await request.json()

    if (!idToken) {
      return new Response(JSON.stringify({ error: 'Missing ID token' }), { status: 400 })
    }

    // Verify the token
    const apiKey = getEnv(context, 'PUBLIC_FIREBASE_API_KEY')
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      },
    )

    if (!verifyRes.ok) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 })
    }

    const data = await verifyRes.json()
    const user = data.users[0]
    const userId = user.localId
    const email = user.email
    const name = user.displayName || email || 'Chef'

    // Create or update user document with 'pending' status
    // Only if status is NOT already 'approved' or 'rejected'
    const existingUser = await db.getDocument('users', userId).catch(() => null)

    if (
      existingUser &&
      (existingUser.status === 'approved' || existingUser.status === 'rejected')
    ) {
      return new Response(JSON.stringify({ success: true, status: existingUser.status }), {
        status: 200,
      })
    }

    await db.setDocument('users', userId, {
      id: userId,
      email,
      displayName: name,
      joinedAt: existingUser?.joinedAt || new Date().toISOString(),
      status: 'pending',
    })

    return new Response(JSON.stringify({ success: true, status: 'pending' }), { status: 200 })
  } catch (error) {
    console.error('Request Access Error:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })
  }
}
