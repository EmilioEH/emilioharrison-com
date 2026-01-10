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
    const invites = await db.getCollection('invites')
    return new Response(JSON.stringify({ success: true, invites }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
}

export const POST: APIRoute = async (context) => {
  const { request } = context
  const admin = await verifyAdmin(request, context)

  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
  }

  try {
    // Generate a simple 6-char code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()

    await db.setDocument('invites', code, {
      code,
      createdBy: admin.email,
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
