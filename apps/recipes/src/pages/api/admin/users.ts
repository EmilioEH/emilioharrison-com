import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'
import { verifyAdmin } from '../../../lib/auth-admin'

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
