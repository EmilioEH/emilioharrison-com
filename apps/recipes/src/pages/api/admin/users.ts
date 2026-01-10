import type { APIRoute } from 'astro'
import { getEnv, getEmailList } from '../../../lib/env'
import { db } from '../../../lib/firebase-server'

// Helper to check admin status
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const verifyAdmin = async (request: Request, context: any) => {
  // 1. Get ID Token from Header
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const idToken = authHeader.split('Bearer ')[1]
  const apiKey = getEnv(context, 'PUBLIC_FIREBASE_API_KEY')

  const verifyRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    },
  )

  if (!verifyRes.ok) return null
  const data = await verifyRes.json()
  const user = data.users[0]
  const email = user.email

  // 2. Check Allowlist (Super Admins)
  const allowedEmails = getEmailList(context, 'ALLOWED_EMAILS')
  if (allowedEmails.includes(email.toLowerCase())) return user

  return null
}

export const GET: APIRoute = async (context) => {
  const { request } = context
  const admin = await verifyAdmin(request, context)

  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')

    // Firestore REST API filtering is limited without composite indexes.
    // For now, let's fetch 'users' collection.
    // Note: Listing ALL users might be heavy eventually, but for this scale it's fine.
    // Ideally we query where status == 'pending'.

    // db.getCollection doesn't support filtering in the wrapper usually?
    // Let's assume we get all and filter in memory for now OR check wrapper capabilities.
    // The wrapper `firebase-server.ts` likely just wraps fetch.

    const allUsers = await db.getCollection('users')

    let filtered = allUsers
    if (status) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filtered = allUsers.filter((u: any) => u.status === status)
    }

    return new Response(JSON.stringify({ success: true, users: filtered }), { status: 200 })
  } catch {
    // If collection doesn't exist yet, return empty
    return new Response(JSON.stringify({ success: true, users: [] }), { status: 200 })
  }
}

export const PUT: APIRoute = async (context) => {
  const { request } = context
  const admin = await verifyAdmin(request, context)

  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
  }

  try {
    const { userId, status } = await request.json()

    if (!userId || !['approved', 'rejected', 'pending'].includes(status)) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 })
    }

    await db.updateDocument('users', userId, {
      status,
    })

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
}
