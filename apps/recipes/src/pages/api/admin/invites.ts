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
    const invites = await db.getCollection('pending_invites')
    return new Response(JSON.stringify({ success: true, invites }), { status: 200 })
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
    const { inviteId } = await request.json()
    if (!inviteId) {
      return new Response(JSON.stringify({ error: 'Missing inviteId' }), { status: 400 })
    }

    await db.deleteDocument('pending_invites', inviteId)
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
}
