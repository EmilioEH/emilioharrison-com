import type { APIRoute } from 'astro'
import { getFirestore } from 'firebase-admin/firestore'
import { serverErrorResponse } from '../../../../lib/api-helpers'
import type { Recipe } from '../../../../lib/types'
// Import the generation logic directly or via internal fetch?
// Since `parse-recipe` is an API route, we can call it internally or extract the logic.
// For expediency, we'll re-fetch the parse-recipe endpoint internally or copy the shared logic.
// Actually, `parse-recipe` exports `POST`. We can try to use the shared logic if we extract `generateRecipe` to a shared file,
// but for now, let's just Fetch the `api/parse-recipe` endpoint from here to avoid code duplication if possible,
// OR (safer) move the core logic to a lib file.
// Given the constraints, calling the localhost endpoint might be flaky.
// Let's replicate the basic flow: We have the Recipe. We construct the Body for `parse-recipe`.

export const POST: APIRoute = async ({ params, request }) => {
  // Delegate logic to parse-recipe endpoint

  const { id } = params
  if (!id) return serverErrorResponse('Recipe ID required')

  const db = getFirestore()
  const recipeRef = db.collection('recipes').doc(id)
  const doc = await recipeRef.get()

  if (!doc.exists) {
    return new Response(JSON.stringify({ error: 'Recipe not found' }), { status: 404 })
  }

  const recipe = doc.data() as Recipe

  // Construct payload for parsing
  const baseUrl = new URL(request.url).origin
  const parseUrl = `${baseUrl}/api/parse-recipe`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = { mode: 'parse' }

  if (recipe.sourceUrl) {
    payload.url = recipe.sourceUrl
  } else if (recipe.sourceImage) {
    payload.image = recipe.sourceImage
  } else {
    const textRep = `
Title: ${recipe.title}
Description: ${recipe.description || ''}

Ingredients:
${recipe.ingredients.map((i) => `${i.amount} ${i.name}`).join('\n')}

Instructions:
${recipe.steps.join('\n')}
    `.trim()
    payload.text = textRep
  }

  try {
    const parseRes = await fetch(parseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!parseRes.ok) {
      const err = await parseRes.text()
      throw new Error(`Parse failed: ${err}`)
    }

    const newData = await parseRes.json()

    // MERGE strategy: Keep ID, createdBy, familyId, etc.
    // Overwrite content fields.
    const updatedRecipe = {
      ...recipe,
      ...newData,
      updatedAt: new Date().toISOString(),
      sourceUrl: recipe.sourceUrl || newData.sourceUrl, // Keep existing if valid
      // Preserve user-added images if any
      images: recipe.images || newData.images,
    }

    await recipeRef.update(updatedRecipe)

    return new Response(JSON.stringify({ success: true, recipe: updatedRecipe }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Refresh Loop Error:', error)
    return serverErrorResponse(error instanceof Error ? error.message : 'Refresh failed')
  }
}
