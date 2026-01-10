import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'
import { verifyAdmin } from '../../../lib/auth-admin'
import { getAuthUser, unauthorizedResponse } from '../../../lib/api-helpers'

export const GET: APIRoute = async (context) => {
  const { request } = context
  const admin = await verifyAdmin(request, context)

  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
  }

  try {
    const invites = await db.getCollection('invites')
    return new Response(JSON.stringify({ success: true, invites }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
}

export const POST: APIRoute = async (context) => {
  const { cookies } = context

  // Allow any authorized user to generate a code
  const userId = getAuthUser(cookies)
  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const user = await db.getDocument('users', userId)
    if (!user) {
      return unauthorizedResponse()
    }

    // Generate a simple 6-char code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()

    await db.setDocument('invites', code, {
      code,
      createdBy: user.email || 'Unknown',
      createdByUserId: userId,
      createdByName: user.displayName || 'User',
      createdAt: new Date().toISOString(),
    })

    return new Response(JSON.stringify({ success: true, code }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
}

export const DELETE: APIRoute = async (context) => {
  const { request } = context
  const admin = await verifyAdmin(request, context)

  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
  }

  try {
    const { code } = await request.json()
    await db.deleteDocument('invites', code)
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
}
