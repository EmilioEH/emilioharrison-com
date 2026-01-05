import type { APIRoute } from 'astro'
import { getAuthUser, unauthorizedResponse } from '../../../lib/api-helpers'
import { db } from '../../../lib/firebase-server'

/**
 * PATCH /api/families/members
 * Update a family member's role
 */
export const PATCH: APIRoute = async ({ request, cookies }) => {
  const userId = getAuthUser(cookies)

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const requesterDoc = await db.getDocument('users', userId)
    if (!requesterDoc || !requesterDoc.familyId) {
      return new Response(JSON.stringify({ success: false, error: 'No family found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Permission Check: only creator or admin
    if (requesterDoc.role !== 'creator' && requesterDoc.role !== 'admin') {
      return new Response(JSON.stringify({ success: false, error: 'Insufficient permissions' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { targetUserId, role } = await request.json()
    if (!targetUserId || !role) {
      return new Response(
        JSON.stringify({ success: false, error: 'targetUserId and role are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Security: can't change creator's role
    const targetUserDoc = await db.getDocument('users', targetUserId)
    if (!targetUserDoc || targetUserDoc.familyId !== requesterDoc.familyId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Member not found in your family' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    if (targetUserDoc.role === 'creator') {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot change role of family creator' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    await db.updateDocument('users', targetUserId, { role })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('PATCH Member Error:', e)
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

/**
 * DELETE /api/families/members
 * Remove a member from the family
 */
export const DELETE: APIRoute = async ({ request, cookies }) => {
  const userId = getAuthUser(cookies)

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const requesterDoc = await db.getDocument('users', userId)
    if (!requesterDoc || !requesterDoc.familyId) {
      return new Response(JSON.stringify({ success: false, error: 'No family found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Permission Check: only creator or admin
    if (requesterDoc.role !== 'creator' && requesterDoc.role !== 'admin') {
      return new Response(JSON.stringify({ success: false, error: 'Insufficient permissions' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { targetUserId } = await request.json()
    if (!targetUserId) {
      return new Response(JSON.stringify({ success: false, error: 'targetUserId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Security: can't remove creator
    const targetUserDoc = await db.getDocument('users', targetUserId)
    if (!targetUserDoc || targetUserDoc.familyId !== requesterDoc.familyId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Member not found in your family' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    if (targetUserDoc.role === 'creator') {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot remove family creator' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // 1. Update target user
    await db.updateDocument('users', targetUserId, {
      familyId: null,
      role: null,
    })

    // 2. Update family document members list
    const familyDoc = await db.getDocument('families', requesterDoc.familyId)
    if (familyDoc) {
      const updatedMembers = (familyDoc.members as string[]).filter((id) => id !== targetUserId)
      await db.updateDocument('families', requesterDoc.familyId, {
        members: updatedMembers,
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('DELETE Member Error:', e)
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
