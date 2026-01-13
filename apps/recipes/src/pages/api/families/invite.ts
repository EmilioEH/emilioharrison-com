import type { APIRoute } from 'astro'
import { getAuthUser, unauthorizedResponse } from '../../../lib/api-helpers'
import { db } from '../../../lib/firebase-server'
import { getCloudflareEnv } from '../../../lib/api-helpers'
import { sendPushNotification } from '../../../lib/push-notifications'
import type { PendingInvite } from '../../../lib/types'

/**
 * POST /api/families/invite
 * Invite a user to join the current user's family by email
 */
export const POST: APIRoute = async ({ request, cookies, locals }) => {
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

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid email address',
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

    // 2. Get family document
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

    // 3. Check for existing pending invite for this email (Optional but good UX)
    // In a real app with high volume, we'd query. Here we can fetch all pending and filter if efficient,
    // or just let it create duplicates (which we handle on fetch).
    // Let's rely on client-side updating for now, but ensure we don't error.

    // 4. Create Pending Invite (Deterministic ID for easy lookup)
    const normalizedEmail = email.trim().toLowerCase()
    const inviteId = btoa(normalizedEmail)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    const now = new Date().toISOString()

    const newInvite: PendingInvite = {
      id: inviteId,
      email: normalizedEmail,
      familyId: currentUser.familyId,
      familyName: family.name,
      invitedBy: userId,
      invitedByName: currentUser.displayName || 'A Family Member',
      status: 'pending',
      createdAt: now,
    }

    await db.setDocument('pending_invites', inviteId, newInvite)

    // Notify the user if they already exist (Best Effort)
    try {
      // Create a deterministic lookup? No, we scan for now.
      const allUsers = await db.getCollection('users')
      const existingUser = allUsers.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (u: any) => u.email?.toLowerCase() === normalizedEmail,
      )

      if (existingUser) {
        // Check User Preferences (Opt-out)
        const prefs = existingUser.notificationPreferences
        if (prefs?.types?.invites === false) {
          console.log(`User ${existingUser.id} opted out of invite notifications`)
        } else {
          const subscriptions = await db.getCollection(
            `users/${existingUser.id}/push_subscriptions`,
          )
          if (subscriptions && subscriptions.length > 0) {
            const env = getCloudflareEnv(locals)
            await Promise.all(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              subscriptions.map((sub: any) =>
                sendPushNotification(
                  sub,
                  {
                    title: 'New Family Invitation',
                    body: `${currentUser.displayName} invited you to join ${family.name}.`,
                    url: '/protected/recipes/settings',
                  },
                  env,
                ),
              ),
            )
          }
        }
      }
    } catch (err) {
      console.error('Failed to notify invited user:', err)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation sent to ${email}`,
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

/**
 * DELETE /api/families/invite
 * Revoke a pending invitation
 */
export const DELETE: APIRoute = async ({ request, cookies }) => {
  const userId = getAuthUser(cookies)

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const body = await request.json()
    const { inviteId } = body

    if (!inviteId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invite ID is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // 1. Get the invite to verify ownership
    const invite = (await db.getDocument(
      'pending_invites',
      inviteId,
    )) as unknown as PendingInvite | null

    if (!invite) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invitation not found',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // 2. Verify permission: Must be the inviter OR a family admin/creator
    // For simplicity, let's verify if the user belongs to the same family
    const currentUser = await db.getDocument('users', userId)
    if (!currentUser || currentUser.familyId !== invite.familyId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'You do not have permission to revoke this invitation',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // 3. Delete the invite
    await db.deleteDocument('pending_invites', inviteId)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation revoked',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (e) {
    console.error('DELETE Invite Error:', e)
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
