import type { APIRoute } from 'astro'
import { db } from '../../../../lib/firebase-server'
import { serverErrorResponse } from '../../../../lib/api-helpers'
import type { Recipe, RecipeVersion } from '../../../../lib/types'
// Import the generation logic directly or via internal fetch?
// Since `parse-recipe` is an API route, we can call it internally or extract the logic.
// For expediency, we'll re-fetch the parse-recipe endpoint internally or copy the shared logic.
// Actually, `parse-recipe` exports `POST`. We can try to use the shared logic if we extract `generateRecipe` to a shared file,
// but for now, let's just Fetch the `api/parse-recipe` endpoint from here to avoid code duplication if possible,
// OR (safer) move the core logic to a lib file.
// Given the constraints, calling the localhost endpoint might be flaky.
// Let's replicate the basic flow: We have the Recipe. We construct the Body for `parse-recipe`.

// eslint-disable-next-line sonarjs/cognitive-complexity
export const POST: APIRoute = async ({ params, request }) => {
  // Delegate logic to parse-recipe endpoint

  const { id } = params
  if (!id) return serverErrorResponse('Recipe ID required')

  const recipe = (await db.getDocument('recipes', id)) as Recipe | null

  if (!recipe) {
    return new Response(JSON.stringify({ error: 'Recipe not found' }), { status: 404 })
  }

  // Construct payload for parsing
  const baseUrl = new URL(request.url).origin
  const parseUrl = `${baseUrl}/api/parse-recipe`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = { mode: 'parse', style: 'enhanced' }
  const originalSourceUrl = recipe.sourceUrl
  const originalSourceImage = recipe.sourceImage

  // Helper to construct text-based payload from existing recipe data
  const buildTextPayload = () => {
    const textRep = `
Title: ${recipe.title}
Description: ${recipe.description || ''}

Ingredients:
${recipe.ingredients.map((i) => `${i.amount} ${i.name}`).join('\n')}

Instructions:
${recipe.steps.join('\n')}
    `.trim()
    return { text: textRep }
  }

  if (recipe.sourceUrl) {
    payload.url = recipe.sourceUrl
  } else if (recipe.sourceImage) {
    // Try image-based refresh, but fall back to text if image fetch fails
    // (e.g., Firebase Storage URLs may require authentication)
    payload.image = recipe.sourceImage
  } else {
    Object.assign(payload, buildTextPayload())
  }

  // Diagnostic logging
  console.log('[Refresh] Recipe ID:', id)
  console.log('[Refresh] Has sourceUrl:', !!recipe.sourceUrl)
  console.log('[Refresh] Has sourceImage:', !!recipe.sourceImage)
  if (recipe.sourceImage) {
    const isBase64 = recipe.sourceImage.startsWith('data:')
    const sizeKB = Math.round(recipe.sourceImage.length / 1024)
    console.log(`[Refresh] sourceImage is ${isBase64 ? 'base64' : 'URL'}, size: ${sizeKB}KB`)
  }

  const cookieHeader = request.headers.get('cookie')

  try {
    // SNAPSHOT: Save current version before overwriting
    const versionId = crypto.randomUUID()
    const version: RecipeVersion = {
      id: versionId,
      recipeId: id,
      timestamp: new Date().toISOString(),
      changeType: 'ai-refresh',
      createdBy: 'system',
      data: recipe,
    }
    await db.addSubDocument('recipes', id, 'versions', versionId, version)

    let parseRes = await fetch(parseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader || '',
      },
      body: JSON.stringify(payload),
    })

    // FALLBACK LOGIC: If image OR URL extraction failed, try text-based regeneration
    if (!parseRes.ok && (originalSourceUrl || originalSourceImage)) {
      console.warn(
        `[Refresh] Source extraction failed (URL: ${!!originalSourceUrl}, Image: ${!!originalSourceImage}). Falling back to text-based regeneration.`,
      )

      const textPayload = buildTextPayload()
      const fallbackPayload = {
        mode: 'parse',
        style: 'enhanced',
        ...textPayload,
      }

      parseRes = await fetch(parseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader || '',
        },
        body: JSON.stringify(fallbackPayload),
      })
    }

    if (!parseRes.ok) {
      const err = await parseRes.text()
      throw new Error(`Parse failed: ${err}`)
    }

    const newData = await parseRes.json()
    const costUrl = `${baseUrl}/api/estimate-cost`

    // Attempt to estimate cost
    let estimatedCost = recipe.estimatedCost // Fallback to existing
    try {
      const costPayload = {
        ingredients: newData.structuredIngredients || newData.ingredients || [],
      }
      const costRes = await fetch(costUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader || '',
        },
        body: JSON.stringify(costPayload),
      })
      if (costRes.ok) {
        const costData = await costRes.json()
        if (costData.totalCost) {
          estimatedCost = costData.totalCost
        }
      } else {
        console.warn('Cost estimation failed during refresh:', await costRes.text())
      }
    } catch (e) {
      console.warn('Cost estimation error during refresh:', e)
    }

    // MERGE strategy: Keep ID, createdBy, familyId, etc.
    // Overwrite content fields.
    const updatedRecipe = {
      ...recipe,
      ...newData,
      updatedAt: new Date().toISOString(),
      sourceUrl: recipe.sourceUrl || newData.sourceUrl, // Keep existing if valid
      sourceImage: recipe.sourceImage || newData.sourceImage, // Preserve for future retry
      // Preserve user-added images if any
      images: recipe.images || newData.images,
      estimatedCost,
    }

    await db.updateDocument('recipes', id, updatedRecipe)

    return new Response(JSON.stringify({ success: true, recipe: updatedRecipe }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[Refresh] Error occurred:', error)
    console.error('[Refresh] Error type:', typeof error)
    if (error instanceof Error) {
      console.error('[Refresh] Error message:', error.message)
      console.error('[Refresh] Error stack:', error.stack)
    }
    const errorMessage = error instanceof Error ? error.message : 'Refresh failed'
    return serverErrorResponse(errorMessage)
  }
}
