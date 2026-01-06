import type { APIRoute } from 'astro'
import { getAuthUser, unauthorizedResponse } from '../../../lib/api-helpers'
import { db } from '../../../lib/firebase-server'
import { getEmailList } from '../../../lib/env'
import type { Family } from '../../../lib/types'

/**
 * GET /api/admin/families
 * Get all families (Admin only)
 */
export const GET: APIRoute = async (context) => {
  const { cookies } = context
  const userId = getAuthUser(cookies)

  if (!userId) {
    return unauthorizedResponse()
  }

  // 1. Admin Verification
  const emailCookie = cookies.get('site_email')
  const email = emailCookie?.value
  const adminEmails = getEmailList(context, 'ADMIN_EMAILS')

  if (!email || adminEmails.length === 0 || !adminEmails.includes(email.toLowerCase())) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // 2. Fetch all families
    // Note: In a real app with thousands of families, this would need pagination.
    // Assuming manageable scale for now or that db.getCollection handles limits responsibly.
    const allFamilies = await db.getCollection('families')

    // Map to a summary format if needed, or return full objects
    // Adding member count for convenience
    const summaries = allFamilies.map((f: unknown) => {
      const family = f as Family
      return {
        ...family,
        memberCount: family.members?.length || 0,
      }
    })

    return new Response(JSON.stringify({ success: true, families: summaries }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('Admin GET Families Error:', e)
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
