import type { APIRoute } from 'astro'
import { getAuthUser, unauthorizedResponse } from '../../../lib/api-helpers'
import { db } from '../../../lib/firebase-server'
import type { Family, User } from '../../../lib/types'

/**
 * GET /api/families/current
 * Get the current user's family and its members
 */
export const GET: APIRoute = async ({ cookies }) => {
  const userId = getAuthUser(cookies)

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    // 1. Get user document to find their familyId
    const userDoc = await db.getDocument('users', userId)

    if (!userDoc || !userDoc.familyId) {
      return new Response(
        JSON.stringify({
          success: true,
          family: null,
          members: [],
          message: 'User has no family assigned',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // 2. Get family document
    const familyDoc = await db.getDocument('families', userDoc.familyId)

    if (!familyDoc) {
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

    // 3. Get all family members
    const memberPromises = (familyDoc.members as string[]).map((memberId) =>
      db.getDocument('users', memberId),
    )
    const memberDocs = await Promise.all(memberPromises)
    const members = memberDocs.filter((m) => m !== null) as User[]

    return new Response(
      JSON.stringify({
        success: true,
        family: familyDoc as Family,
        members,
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

    // Permission Check: only creator or admin
    if (userDoc.role !== 'creator' && userDoc.role !== 'admin') {
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

    if (family.createdBy !== userId) {
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
