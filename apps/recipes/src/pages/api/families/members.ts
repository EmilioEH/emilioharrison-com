import type { APIRoute } from 'astro'
import { getAuthUser, unauthorizedResponse } from '../../../lib/api-helpers'
import { getEmailList } from '../../../lib/env'
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

    // Permission Check: only creator or admin (in family or site admin)
    const emailCookie = cookies.get('site_email')
    const userEmail = emailCookie?.value || ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminEmails = getEmailList({ cookies } as any, 'ADMIN_EMAILS')
    const isSiteAdmin = userEmail && adminEmails.includes(userEmail.toLowerCase())

    if (requesterDoc.role !== 'creator' && requesterDoc.role !== 'admin' && !isSiteAdmin) {
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

    const targetUserDoc = await db.getDocument('users', targetUserId)
    if (!targetUserDoc) {
      return new Response(JSON.stringify({ success: false, error: 'Member not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Family Check: Must be in same family, unless site admin
    if (!isSiteAdmin && targetUserDoc.familyId !== requesterDoc.familyId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Member not found in your family' }),
        {
          status: 404, // mask existence
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Security: can't change creator's role (even by admin? Maybe let admin do it? Let's stick to safe defaults)
    // Actually, if creator leaves/demoted, family might break. Let's prevent it for now.
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

    // Permission Check
    const emailCookie = cookies.get('site_email')
    const userEmail = emailCookie?.value || ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminEmails = getEmailList({ cookies } as any, 'ADMIN_EMAILS')
    const isSiteAdmin = userEmail && adminEmails.includes(userEmail.toLowerCase())

    if (requesterDoc.role !== 'creator' && requesterDoc.role !== 'admin' && !isSiteAdmin) {
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

    const targetUserDoc = await db.getDocument('users', targetUserId)
    if (!targetUserDoc) {
      return new Response(JSON.stringify({ success: false, error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Family Check
    if (!isSiteAdmin && targetUserDoc.familyId !== requesterDoc.familyId) {
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
    // Use targetUserDoc.familyId to find the family, since requester might be admin from outside
    const familyIdToUpdate = targetUserDoc.familyId
    if (familyIdToUpdate) {
      const familyDoc = await db.getDocument('families', familyIdToUpdate)
      if (familyDoc) {
        const updatedMembers = (familyDoc.members as string[]).filter((id) => id !== targetUserId)
        await db.updateDocument('families', familyIdToUpdate, {
          members: updatedMembers,
        })
      }
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
