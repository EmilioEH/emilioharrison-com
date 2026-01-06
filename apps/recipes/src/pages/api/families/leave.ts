import type { APIRoute } from 'astro'
import { getAuthUser, unauthorizedResponse } from '../../../lib/api-helpers'
import { db } from '../../../lib/firebase-server'

/**
 * POST /api/families/leave
 * Allows a user to leave their current family group.
 */
export const POST: APIRoute = async ({ cookies }) => {
  const userId = getAuthUser(cookies)

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const userDoc = await db.getDocument('users', userId)
    if (!userDoc || !userDoc.familyId) {
      return new Response(JSON.stringify({ success: false, error: 'You are not in a family' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 1. Check if user is the creator
    if (userDoc.role === 'creator') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Family creators cannot leave. You must delete the family instead.',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // 2. Remove user from family members list
    const familyDoc = await db.getDocument('families', userDoc.familyId)
    if (familyDoc) {
      const updatedMembers = (familyDoc.members as string[]).filter((id) => id !== userId)
      await db.updateDocument('families', userDoc.familyId, {
        members: updatedMembers,
      })
    }

    // 3. Update user document to remove family association
    await db.updateDocument('users', userId, {
      familyId: null,
      role: null,
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('Leave Family Error:', e)
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
