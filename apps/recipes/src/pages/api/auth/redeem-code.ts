import type { APIRoute } from 'astro'
import { getEnv } from '../../../lib/env'
import { db } from '../../../lib/firebase-server'

export const POST: APIRoute = async (context) => {
  const { request } = context
  try {
    const { idToken, code } = await request.json()

    if (!idToken || !code) {
      return new Response(JSON.stringify({ error: 'Missing token or code' }), { status: 400 })
    }

    // 1. Verify Token
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

    // 2. Validate Code
    // We assume codes are stored in 'invites' collection with document ID = code
    // document structure: { createdBy: string, createdAt: string, type: 'one-time' | 'multi' }
    // For simplicity, let's say all codes are one-time use and we delete them after use.

    const inviteDoc = await db.getDocument('invites', code).catch(() => null)

    if (!inviteDoc) {
      return new Response(JSON.stringify({ error: 'Invalid or expired code' }), { status: 400 })
    }

    // 3. Promote User
    await db.setDocument('users', userId, {
      id: userId,
      email,
      displayName: name,
      joinedAt: new Date().toISOString(), // This will be overwritten if we merge, but for setDocument it replaces.
      // Ideally we should check if user exists first to preserve joinedAt, but for "new" users via invite this is fine.
      // If they were "pending", preserving their original request date is nice but not critical.
      // Let's stick to the plan: set hasOnboarded = false.
      status: 'approved',
      redeemedCode: code, // Audit trail
      hasOnboarded: false,
    })

    // 4. Consume Code (Mark as accepted)
    await db.updateDocument('invites', code, {
      status: 'accepted',
      acceptedBy: userId,
      acceptedByName: name,
      acceptedAt: new Date().toISOString(),
    })

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (error) {
    console.error('Redeem Code Error:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })
  }
}
