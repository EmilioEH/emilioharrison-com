import type { APIRoute, APIContext } from 'astro'
import { bucket, db } from '@/lib/firebase-server'
import type { Review } from '@/lib/types'
import { getAuthUser, unauthorizedResponse } from '@/lib/api-helpers'
import { setRequestContext } from '@/lib/request-context'

/**
 * POST /api/recipes/:id/reviews
 * Submit a new review for a recipe with rating, optional comment, and optional photo
 */
export const POST: APIRoute = async (context: APIContext) => {
  setRequestContext(context)

  const { params, request, cookies } = context
  const { id: recipeId } = params
  if (!recipeId) {
    return new Response(JSON.stringify({ error: 'Recipe ID required' }), { status: 400 })
  }

  const userId = getAuthUser(cookies)
  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const requestUrl = new URL(request.url)
    const basePath = import.meta.env.BASE_URL || '/'
    const baseUrl = new URL(
      basePath.endsWith('/') ? basePath : `${basePath}/`,
      requestUrl.origin,
    ).toString()

    // Look up user profile from Firestore (standard pattern)
    const userDoc = await db.getDocument('users', userId)
    if (!userDoc || !userDoc.familyId) {
      return new Response(JSON.stringify({ error: 'You must create or join a family first' }), {
        status: 400,
      })
    }

    const userName = userDoc.displayName || 'User'
    const familyId = userDoc.familyId

    // Parse request body
    const body = await request.json()
    const { rating, comment, photoBase64, difficulty, source } = body

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return new Response(JSON.stringify({ error: 'Rating must be between 1 and 5' }), {
        status: 400,
      })
    }

    // Upload photo if provided
    let photoUrl: string | undefined
    if (photoBase64) {
      try {
        // Convert base64 to buffer
        const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '')
        const buffer = Buffer.from(base64Data, 'base64')

        // Generate filename and bucket
        const timestamp = Date.now()
        const filename = `review-${recipeId}-${userId}-${timestamp}.jpg`
        const projectId = await bucket.getProjectId()
        const bucketName = `${projectId}.firebasestorage.app`

        // Upload to Firebase Storage
        await bucket.uploadFile(bucketName, filename, buffer, 'image/jpeg')

        // Construct public URL
        photoUrl = new URL(`api/uploads/${filename}`, baseUrl).toString()
      } catch (uploadError) {
        console.error('Photo upload failed:', uploadError)
        return new Response(
          JSON.stringify({ error: 'Photo upload failed', details: String(uploadError) }),
          { status: 500 },
        )
      }
    }

    // Create review object
    const reviewId = `${userId}-${Date.now()}`
    const review: Review = {
      id: reviewId,
      recipeId,
      userId,
      userName,
      rating,
      comment,
      photoUrl,
      difficulty,
      source: source || 'quick',
      createdAt: new Date().toISOString(),
    }

    // Get existing family data
    const familyDataPath = `families/${familyId}/recipeData`
    let familyData
    try {
      familyData = await db.getDocument(familyDataPath, recipeId)
    } catch {
      // Family data doesn't exist yet
      familyData = null
    }

    if (!familyData) {
      familyData = {
        id: recipeId,
        notes: [],
        ratings: [],
        reviews: [],
        cookingHistory: [],
      }
    }

    // Add review to reviews array
    const existingReviews = familyData.reviews || []
    const updatedReviews = [...existingReviews, review]

    // Update family data
    await db.setDocument(familyDataPath, recipeId, {
      ...familyData,
      reviews: updatedReviews,
    })

    // If photo was uploaded, add to recipe images
    if (photoUrl) {
      try {
        const recipe = await db.getDocument('recipes', recipeId)
        if (recipe) {
          const currentImages = recipe.images || []

          // Prepend new photo (makes it the main image)
          const updatedImages = [photoUrl, ...currentImages]

          await db.updateDocument('recipes', recipeId, {
            images: updatedImages,
          })
        }
      } catch (recipeError) {
        console.error('Failed to update recipe images:', recipeError)
        // Don't fail the whole review if image update fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: review,
      }),
      { status: 200 },
    )
  } catch (error) {
    console.error('Failed to submit review:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to submit review',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 },
    )
  }
}
