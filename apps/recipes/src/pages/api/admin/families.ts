import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'
import type { Family } from '../../../lib/types'
import { verifyAdmin } from '../../../lib/auth-admin'

/**
 * GET /api/admin/families
 * Get all families (Admin only)
 */
export const GET: APIRoute = async (context) => {
  const { request } = context
  const admin = await verifyAdmin(request, context)

  if (!admin) {
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
