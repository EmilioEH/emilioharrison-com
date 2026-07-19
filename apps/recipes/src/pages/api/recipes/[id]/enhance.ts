import type { APIRoute, APIContext } from 'astro'
import { db } from '../../../../lib/firebase-server'
import { loadAccessibleRecipe } from '../../../../lib/recipe-access'
import { setRequestContext } from '../../../../lib/request-context'
import { executeAiParse } from '../../../../lib/services/ai-parser'
import {
  mergeAiRecipeUpdate,
  snapshotRecipe,
  UnusableAiResultError,
} from '../../../../lib/services/recipe-merge'

export const POST: APIRoute = async (context: APIContext) => {
  setRequestContext(context)
  const { params, cookies, locals, request } = context

  // Enhance does a full reparse and overwrites the recipe — require access to this specific
  // recipe. (This endpoint previously performed no authorization at all.)
  const access = await loadAccessibleRecipe(cookies, params.id)
  if (!access.ok) return access.response
  const { recipe } = access
  const recipeId = recipe.id
  const origin = new URL(request.url).origin

  try {
    // Determine the best parsing source
    let newData
    const commonParams = { style: 'enhanced' as const }

    if (recipe.sourceUrl) {
      console.log(`[Enhance] Total Reparse via URL: ${recipe.sourceUrl}`)
      newData = await executeAiParse(locals, { ...commonParams, url: recipe.sourceUrl }, origin)
    } else if (recipe.sourceImage) {
      console.log(`[Enhance] Total Reparse via Image`)
      newData = await executeAiParse(locals, { ...commonParams, image: recipe.sourceImage }, origin)
    } else {
      console.log(`[Enhance] Text-based enhancement fallback`)
      const textRep = `
Title: ${recipe.title}
Ingredients:
${recipe.ingredients.map((i) => `${i.amount} ${i.name}`).join('\n')}
Steps:
${recipe.steps.join('\n')}
      `.trim()
      newData = await executeAiParse(locals, { ...commonParams, text: textRep }, origin)
    }

    const previousVersion = snapshotRecipe(recipe, 'enhance')
    const updatedRecipe = { ...mergeAiRecipeUpdate(recipe, newData), previousVersion }

    await db.updateDocument('recipes', recipeId, updatedRecipe)

    return new Response(
      JSON.stringify({
        success: true,
        recipe: updatedRecipe,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error: unknown) {
    if (error instanceof UnusableAiResultError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    console.error('Enhance Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to enhance recipe'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
