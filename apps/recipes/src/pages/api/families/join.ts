import type { APIRoute } from 'astro'
import { getAuthUser, unauthorizedResponse } from '../../../lib/api-helpers'
import { db } from '../../../lib/firebase-server'

/**
 * POST /api/families/join
 * Accept or decline a family invitation
 * Body: { inviteId: string, accept: boolean }
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const userId = getAuthUser(cookies)

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const body = await request.json()
    const { inviteId, accept } = body

    if (!inviteId) {
      return new Response(JSON.stringify({ success: false, error: 'Invite ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 1. Get the invite
    const invite = await db.getDocument('pending_invites', inviteId)

    if (!invite) {
      return new Response(JSON.stringify({ success: false, error: 'Invite not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 2. Verify it's for this user
    const userDoc = await db.getDocument('users', userId)
    const userEmail = userDoc?.email || cookies.get('site_email')?.value

    if (!userEmail || invite.email.toLowerCase() !== userEmail.toLowerCase()) {
      return new Response(
        JSON.stringify({ success: false, error: 'This invite is for a different email address' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // 3. Handle Decision
    if (accept) {
      // Add to family
      const family = await db.getDocument('families', invite.familyId)
      if (family) {
        const updatedMembers = [...new Set([...(family.members as string[]), userId])]
        await db.updateDocument('families', invite.familyId, {
          members: updatedMembers,
        })

        // Update user
        await db.updateDocument('users', userId, {
          familyId: invite.familyId,
          role: 'user', // Default to user role
        })
      } else {
        return new Response(JSON.stringify({ success: false, error: 'Family no longer exists' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    // 4. Delete the invite (whether accepted or declined)
    await db.deleteDocument('pending_invites', inviteId)

    return new Response(
      JSON.stringify({
        success: true,
        message: accept ? 'Joined family successfully' : 'Invitation declined',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    console.error('POST Join Error:', e)
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
