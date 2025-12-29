import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'
import { getEnv } from '../../../lib/env'

export const POST: APIRoute = async (context) => {
  const { request, cookies } = context
  const emailCookie = cookies.get('site_email')
  const email = emailCookie?.value

  // Verify Admin Access
  const adminEmailsEnv = getEnv(context, 'ADMIN_EMAILS')
  const adminEmails = adminEmailsEnv.split(',').map((e: string) => e.trim().toLowerCase())

  if (!email || !adminEmails.includes(email.toLowerCase())) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { action, ids } = await request.json()

    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request. "action" and "ids" (array) are required.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    console.log(`Processing bulk action: ${action} for ${ids.length} items`)

    if (action === 'delete') {
      await Promise.all(ids.map((id) => db.deleteDocument('feedback', id)))
    } else if (action === 'fixed' || action === 'wont-fix' || action === 'open') {
      const resolvedAt = action !== 'open' ? new Date().toISOString() : null
      await Promise.all(
        ids.map((id) =>
          db.updateDocument('feedback', id, {
            status: action,
            resolved_at: resolvedAt,
          }),
        ),
      )
    } else {
      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, count: ids.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Bulk Action Error:', err)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
