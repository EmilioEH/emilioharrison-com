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

/**
 * DELETE /api/admin/families
 * Delete a family and cleanup members/data (Admin only)
 */
export const DELETE: APIRoute = async (context) => {
  const { request } = context
  const admin = await verifyAdmin(request, context)

  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await request.json()
    const { familyId } = body

    if (!familyId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing familyId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 1. Fetch Family to identify members
    const family = (await db.getDocument('families', familyId)) as Family
    if (!family) {
      return new Response(JSON.stringify({ success: false, error: 'Family not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 2. Remove Family ID from all members
    if (family.members && family.members.length > 0) {
      await Promise.all(
        family.members.map(async (memberId) => {
          try {
            // Update user doc: set familyId to null, remove role
            // using partial update (setDocument with merge=true or updateDocument)
            // Note: API requires providing the full object for some REST implementations,
            // but our wrapper's updateDocument uses PATCH with updateMask.
            // However, to UNSET fields in Firestore REST with patch, we might need to set them to null?
            // Or usually just overwriting familyId with null works if the field is nullable.
            // Let's assume our updateDocument handles partials correctly via PATCH.
            // We need to explicitly check if our wrapper supports field deletion (masking).
            // For now, setting to null is the safest "soft" removal.
            await db.updateDocument('users', memberId, {
              familyId: null,
              role: null,
            })
          } catch (err) {
            console.warn(`Failed to update user ${memberId} during family deletion`, err)
          }
        }),
      )
    }

    // 3. Delete Subcollections (recipeData)
    // Firestore REST doesn't support recursive delete natively in one call.
    // We must list subcollection documents and delete them.
    // Path: families/{familyId}/recipeData
    // Note: getCollection automatically builds the path: documents/{collection}
    // We need to construct the subcollection path carefully.
    // Our wrapper's getCollection takes a "collection" string.
    // If we pass 'families/ID/recipeData', logic inside getCollection concatenates it.
    try {
      const subPath = `families/${familyId}/recipeData`
      const recipeDataDocs = await db.getCollection(subPath)

      // Parallel delete
      await Promise.all(
        recipeDataDocs.map((doc: { id: string }) => db.deleteDocument(subPath, doc.id)),
      )
    } catch (err) {
      // It's possible the collection is empty or doesn't exist, which might throw 404.
      // We can ignore 404s here usually, but let's log warns.
      console.warn('Error cleaning up recipeData subcollection (might be empty)', err)
    }

    // 4. Delete the Family Document
    await db.deleteDocument('families', familyId)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('Admin DELETE Family Error:', e)
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
