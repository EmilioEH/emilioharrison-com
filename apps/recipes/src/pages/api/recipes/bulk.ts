import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'

// Allow-list for bulk updates to prevent accidental destructive changes
const ALLOWED_FIELDS = [
  'mealType',
  'dishType',
  'cuisine',
  'difficulty',
  'protein',
  'isFavorite', // Maybe useful later
  'thisWeek', // Maybe useful later
  'tags', // Future support
]

export const POST: APIRoute = async (context) => {
  const { request, cookies: _cookies } = context
  /*
  // Optional: Add Admin check here if stricly restricted. 
  // For now, mirroring existing recipe strictness (open to app users mostly).
  // If we wanted to restrict:
  const emailCookie = cookies.get('site_email')
  ...
  */

  try {
    const { action, ids, updates } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return new Response(JSON.stringify({ error: 'ids array required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (action !== 'update' || !updates) {
      return new Response(JSON.stringify({ error: 'Invalid action or missing updates' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Sanitize updates
    const safeUpdates: Record<string, string | boolean | string[]> = {}
    for (const key of Object.keys(updates)) {
      if (ALLOWED_FIELDS.includes(key)) {
        safeUpdates[key] = updates[key]
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return new Response(JSON.stringify({ error: 'No valid fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Always touch updatedAt
    safeUpdates.updatedAt = new Date().toISOString()

    console.log(`Bulk updating ${ids.length} recipes with`, safeUpdates)

    // Execute in parallel
    await Promise.all(ids.map((id: string) => db.updateDocument('recipes', id, safeUpdates)))

    return new Response(JSON.stringify({ success: true, count: ids.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Bulk Recipe Update Error:', err)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
