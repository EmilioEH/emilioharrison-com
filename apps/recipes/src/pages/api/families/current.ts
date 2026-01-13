import type { APIRoute } from 'astro'
import { getAuthUser, unauthorizedResponse } from '../../../lib/api-helpers'
import { db } from '../../../lib/firebase-server'
import { getEmailList, getEnv } from '../../../lib/env'
import type { Family, User, PendingInvite } from '../../../lib/types'

/**
 * GET /api/families/current
 * Get the current user's family and its members
 */
export const GET: APIRoute = async ({ request, cookies }) => {
  const userId = getAuthUser(cookies)

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    // 1. Get user document
    const userDoc = await db.getDocument('users', userId)

    // 2. Search for pending invites by email
    // We need the user's email. If it's not in the doc, check the cookie.
    let userEmail = userDoc?.email
    if (!userEmail) {
      const emailCookie = cookies.get('site_email')
      userEmail = emailCookie?.value || ''
    }

    let pendingInvites: PendingInvite[] = []
    if (userEmail) {
      const allInvites = await db.getCollection('pending_invites')
      pendingInvites = (allInvites as unknown as PendingInvite[]).filter(
        (inv) => inv.email?.toLowerCase() === userEmail?.toLowerCase() && inv.status === 'pending',
      )
    }

    // 3. If no family, return just invites
    if (!userDoc || !userDoc.familyId) {
      return new Response(
        JSON.stringify({
          success: true,
          family: null,
          members: [],
          incomingInvites: pendingInvites,
          outgoingInvites: [],
          message: 'User has no family assigned',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // 4. Get family document
    // Admin Override: Allow fetching specific family via ?familyId=
    const url = new URL(request.url)
    const requestedFamilyId = url.searchParams.get('familyId')

    // Check if user is admin
    const isTestMode =
      getEnv({ cookies } as unknown as Record<string, unknown>, 'PUBLIC_TEST_MODE') === 'true'
    const isTestUser = userId === 'TestUser' || userId === 'test_user'
    const emailCookie = cookies.get('site_email')
    const cookieEmail = emailCookie?.value || ''
    const adminEmails = getEmailList({ cookies } as unknown, 'ADMIN_EMAILS')
    const isAdmin =
      (isTestMode && isTestUser) || (cookieEmail && adminEmails.includes(cookieEmail.toLowerCase()))

    const targetFamilyId = isAdmin && requestedFamilyId ? requestedFamilyId : userDoc.familyId

    if (!targetFamilyId) {
      // ... existing no-family response (lines 38-52) logic ...
      if (!userDoc || !userDoc.familyId) {
        return new Response(
          JSON.stringify({
            success: true,
            family: null,
            members: [],
            incomingInvites: pendingInvites,
            outgoingInvites: [],
            message: 'User has no family assigned',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }
    }

    const familyDoc = await db.getDocument('families', targetFamilyId)

    if (!familyDoc) {
      // Family ID exists but doc missing (orphaned)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Family not found',
          pendingInvites,
        }),
        {
          status: 404, // Use 200 with null family to allow UI to recover?
          // Actually if we return 404 the UI shows error. Let's return 200 with null family so they can create new one.
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // 5. Get all family members
    const memberPromises = ((familyDoc.members as string[]) || []).map((memberId) =>
      db.getDocument('users', memberId),
    )
    const memberDocs = await Promise.all(memberPromises)
    const members = memberDocs.filter((m) => m !== null) as User[]

    // 6. Get pending invites for this family (so admins can see who they invited)
    let familyPendingInvites: PendingInvite[] = []
    try {
      // In a real DB we'd query where familyId == familyDoc.id
      // Here we scan and filter
      const allInvites = await db.getCollection('pending_invites')
      familyPendingInvites = (allInvites as unknown as PendingInvite[]).filter(
        (inv) => inv.familyId === familyDoc.id && inv.status === 'pending',
      )
    } catch {
      // ignore
    }

    return new Response(
      JSON.stringify({
        success: true,
        family: familyDoc as Family,
        members,
        currentUserId: userId,
        incomingInvites: [],
        outgoingInvites: familyPendingInvites,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (e) {
    console.error('GET Family Error:', e)
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
 * POST /api/families/current
 * Create a new family for the current user
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const userId = getAuthUser(cookies)

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Family name is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // 1. Check if user already has a family
    const existingUser = await db.getDocument('users', userId)
    if (existingUser && existingUser.familyId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User already belongs to a family',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // 2. Create family
    const familyId = crypto.randomUUID()
    const now = new Date().toISOString()

    const newFamily: Family = {
      id: familyId,
      name,
      members: [userId],
      createdBy: userId,
      createdAt: now,
    }

    await db.createDocument('families', familyId, newFamily)

    // 3. Create or update user document
    // Read email from cookie (set during login)
    const emailCookie = cookies.get('site_email')
    const userEmail = emailCookie?.value || ''

    if (!userEmail) {
      console.warn('[Family] Creating user without email - invite functionality may not work')
    }

    const newUser: User = {
      id: userId,
      email: userEmail,
      displayName: 'User', // Will be populated from Firebase Auth
      familyId,
      role: 'creator', // Assign creator role on creation
      joinedAt: now,
    }

    await db.setDocument('users', userId, newUser)

    return new Response(
      JSON.stringify({
        success: true,
        family: newFamily,
        user: newUser,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (e) {
    console.error('POST Family Error:', e)
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
 * PATCH /api/families/current
 * Update family name
 */
export const PATCH: APIRoute = async ({ request, cookies }) => {
  const userId = getAuthUser(cookies)

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const userDoc = await db.getDocument('users', userId)
    if (!userDoc || !userDoc.familyId) {
      return new Response(JSON.stringify({ success: false, error: 'No family found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Permission Check: only creator or admin (role in family OR site admin)
    const emailCookie = cookies.get('site_email')
    const userEmail = emailCookie?.value || ''
    const adminEmails = getEmailList({ cookies } as unknown, 'ADMIN_EMAILS')
    const isSiteAdmin = userEmail && adminEmails.includes(userEmail.toLowerCase())

    if (userDoc.role !== 'creator' && userDoc.role !== 'admin' && !isSiteAdmin) {
      return new Response(JSON.stringify({ success: false, error: 'Insufficient permissions' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { name } = await request.json()
    if (!name || typeof name !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'Name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await db.updateDocument('families', userDoc.familyId, { name })

    return new Response(JSON.stringify({ success: true, name }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('PATCH Family Error:', e)
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

/**
 * DELETE /api/families/current
 * Delete the current user's family (creator only)
 */
export const DELETE: APIRoute = async ({ cookies }) => {
  const userId = getAuthUser(cookies)

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    // 1. Get user document
    const userDoc = await db.getDocument('users', userId)
    if (!userDoc || !userDoc.familyId) {
      return new Response(JSON.stringify({ success: false, error: 'No family found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 2. Get family document and verify creator
    const family = await db.getDocument('families', userDoc.familyId)
    if (!family) {
      return new Response(JSON.stringify({ success: false, error: 'Family not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const emailCookie = cookies.get('site_email')
    const userEmail = emailCookie?.value || ''
    const adminEmails = getEmailList({ cookies } as unknown, 'ADMIN_EMAILS')
    const isSiteAdmin = userEmail && adminEmails.includes(userEmail.toLowerCase())

    if (family.createdBy !== userId && !isSiteAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Only the creator can delete the family' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // 3. Remove familyId from all members
    const updatePromises = (family.members as string[]).map((memberId) =>
      db.updateDocument('users', memberId, { familyId: null }),
    )
    await Promise.all(updatePromises)

    // 4. Delete all family_recipes data
    try {
      const familyRecipes = await db.getCollection(`families/${userDoc.familyId}/family_recipes`)
      const deleteRecipePromises = familyRecipes.map((doc: { id: string }) =>
        db.deleteDocument(`families/${userDoc.familyId}/family_recipes`, doc.id),
      )
      await Promise.all(deleteRecipePromises)
    } catch {
      // If collection doesn't exist or is empty, that's fine
      console.log('No family recipes to delete or collection not found')
    }

    // 5. Delete the family document
    await db.deleteDocument('families', userDoc.familyId)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('DELETE Family Error:', e)
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
