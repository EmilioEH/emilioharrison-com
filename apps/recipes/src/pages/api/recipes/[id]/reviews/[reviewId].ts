import type { APIRoute } from 'astro'
import { bucket, db } from '@/lib/firebase-server'
import type { Review } from '@/lib/types'

/**
 * PUT /api/recipes/:id/reviews/:reviewId
 * Edit an existing review (only by the original author)
 */
export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const { id: recipeId, reviewId } = params
  if (!recipeId || !reviewId) {
    return new Response(JSON.stringify({ error: 'Recipe ID and Review ID required' }), {
      status: 400,
    })
  }

  try {
    const requestUrl = new URL(request.url)
    const baseUrl = new URL(import.meta.env.BASE_URL || '/', requestUrl.origin).toString()
    // Extract user info from cookies
    const userIdCookie = cookies.get('currentUserId')
    const familyIdCookie = cookies.get('familyId')

    if (!userIdCookie?.value || !familyIdCookie?.value) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 })
    }

    const userId = userIdCookie.value
    const familyId = familyIdCookie.value

    // Parse request body
    const body = await request.json()
    const { rating, comment, photoBase64 } = body

    // Get existing family data
    const familyDataPath = `families/${familyId}/recipeData`
    const familyData = await db.getDocument(familyDataPath, recipeId)

    if (!familyData || !familyData.reviews) {
      return new Response(JSON.stringify({ error: 'Review not found' }), { status: 404 })
    }

    // Find the review
    const reviewIndex = familyData.reviews.findIndex((r: Review) => r.id === reviewId)
    if (reviewIndex === -1) {
      return new Response(JSON.stringify({ error: 'Review not found' }), { status: 404 })
    }

    const existingReview = familyData.reviews[reviewIndex]

    // Verify ownership
    if (existingReview.userId !== userId) {
      return new Response(JSON.stringify({ error: 'You can only edit your own reviews' }), {
        status: 403,
      })
    }

    // Upload new photo if provided
    let photoUrl = existingReview.photoUrl
    if (photoBase64) {
      try {
        const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '')
        const buffer = Buffer.from(base64Data, 'base64')
        const timestamp = Date.now()
        const filename = `review-${recipeId}-${userId}-${timestamp}.jpg`
        const projectId = await bucket.getProjectId()
        const bucketName = `${projectId}.firebasestorage.app`

        await bucket.uploadFile(bucketName, filename, buffer, 'image/jpeg')
        photoUrl = new URL(`api/uploads/${filename}`, baseUrl).toString()
      } catch (uploadError) {
        console.error('Photo upload failed:', uploadError)
        return new Response(
          JSON.stringify({ error: 'Photo upload failed', details: String(uploadError) }),
          { status: 500 },
        )
      }
    }

    // Archive current state to edit history
    const editHistory = existingReview.editHistory || []
    editHistory.push({
      rating: existingReview.rating,
      comment: existingReview.comment,
      photoUrl: existingReview.photoUrl,
      difficulty: existingReview.difficulty,
      editedAt: existingReview.updatedAt || existingReview.createdAt,
    })

    // Update review
    const updatedReview: Review = {
      ...existingReview,
      rating: rating ?? existingReview.rating,
      comment: comment !== undefined ? comment : existingReview.comment,
      photoUrl,
      updatedAt: new Date().toISOString(),
      editHistory,
      source: 'edit',
    }

    // Update reviews array
    const updatedReviews = [...familyData.reviews]
    updatedReviews[reviewIndex] = updatedReview

    // Save to Firestore
    await db.setDocument(familyDataPath, recipeId, {
      ...familyData,
      reviews: updatedReviews,
    })

    // If new photo was uploaded, update recipe images
    if (photoBase64 && photoUrl) {
      try {
        const recipe = await db.getDocument('recipes', recipeId)
        if (recipe) {
          const currentImages = recipe.images || []

          // Remove old photo if it exists in images
          const filteredImages = existingReview.photoUrl
            ? currentImages.filter((img: string) => img !== existingReview.photoUrl)
            : currentImages

          // Prepend new photo
          const updatedImages = [photoUrl, ...filteredImages]

          await db.updateDocument('recipes', recipeId, {
            images: updatedImages,
          })
        }
      } catch (recipeError) {
        console.error('Failed to update recipe images:', recipeError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: updatedReview,
      }),
      { status: 200 },
    )
  } catch (error) {
    console.error('Failed to edit review:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to edit review',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 },
    )
  }
}
