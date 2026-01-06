import type { APIRoute } from 'astro'
import { getAuthUser, unauthorizedResponse } from '../../../lib/api-helpers'
import { db } from '../../../lib/firebase-server'
import type { User } from '../../../lib/types'

/**
 * POST /api/families/invite
 * Invite a user to join the current user's family by email
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const userId = getAuthUser(cookies)

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // 1. Get current user's family
    const currentUser = await db.getDocument('users', userId)

    if (!currentUser || !currentUser.familyId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'You must create a family first',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // 2. Get family document to verify user is a member
    const family = await db.getDocument('families', currentUser.familyId)

    if (!family) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Family not found',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // 3. Find the invitee by email
    // Note: This is a simple implementation. In production, you'd want a users-by-email index
    const allUsers = await db.getCollection('users')
    console.log(`[Invite] Fetched ${allUsers.length} users to search through.`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invitee = allUsers.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())

    if (!invitee) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User with that email not found. They must sign in first.',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // 4. Check if invitee already has a family
    if (invitee.familyId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'That user already belongs to a family',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // 5. Add invitee to family
    const updatedMembers = [...(family.members as string[]), invitee.id]
    await db.updateDocument('families', currentUser.familyId, {
      members: updatedMembers,
    })

    // 6. Update invitee's user document
    await db.updateDocument('users', invitee.id, {
      familyId: currentUser.familyId,
    })

    // 7. Fetch updated family member
    const updatedInvitee = await db.getDocument('users', invitee.id)

    return new Response(
      JSON.stringify({
        success: true,
        message: `${email} has been added to your family`,
        invitee: updatedInvitee as User,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (e) {
    console.error('POST Invite Error:', e)
    return new Response(
      JSON.stringify({
        success: false,
        error: (e as Error).message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
