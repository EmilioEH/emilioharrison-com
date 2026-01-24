import type { APIRoute } from 'astro'
import { db } from '../../../../lib/firebase-server'
import type { Recipe } from '../../../../lib/types'
import { executeAiParse } from '../../../../lib/services/ai-parser'

export const POST: APIRoute = async ({ params, locals }) => {
  const recipeId = params.id

  if (!recipeId) {
    return new Response(JSON.stringify({ error: 'Recipe ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const recipe = (await db.getDocument('recipes', recipeId)) as Recipe | null

    if (!recipe) {
      return new Response(JSON.stringify({ error: 'Recipe not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Determine the best parsing source
    let newData
    const commonParams = { mode: 'parse' as const, style: 'enhanced' as const }

    if (recipe.sourceUrl) {
      console.log(`[Enhance] Total Reparse via URL: ${recipe.sourceUrl}`)
      newData = await executeAiParse(locals, { ...commonParams, url: recipe.sourceUrl })
    } else if (recipe.sourceImage) {
      console.log(`[Enhance] Total Reparse via Image`)
      newData = await executeAiParse(locals, { ...commonParams, image: recipe.sourceImage })
    } else {
      console.log(`[Enhance] Text-based enhancement fallback`)
      const textRep = `
Title: ${recipe.title}
Ingredients:
${recipe.ingredients.map((i) => `${i.amount} ${i.name}`).join('\n')}
Steps:
${recipe.steps.join('\n')}
      `.trim()
      newData = await executeAiParse(locals, { ...commonParams, text: textRep })
    }

    // MERGE strategy: Keep core metadata, overwrite content fields
    const updatedRecipe = {
      ...recipe,
      ...newData,
      updatedAt: new Date().toISOString(),
      // Ensure we don't lose existing images or source info
      sourceUrl: recipe.sourceUrl || newData.sourceUrl,
      sourceImage: recipe.sourceImage || newData.sourceImage,
      images: recipe.images || newData.images,
    }

    // SAFETY MERGE: Do not overwrite existing ingredients/steps with empty arrays
    if (newData.ingredients && newData.ingredients.length > 0) {
      updatedRecipe.ingredients = newData.ingredients
    } else {
      console.warn('[Enhance] AI returned empty ingredients. Keeping original.')
      updatedRecipe.ingredients = recipe.ingredients
    }

    if (newData.steps && newData.steps.length > 0) {
      updatedRecipe.steps = newData.steps
    } else {
      console.warn('[Enhance] AI returned empty steps. Keeping original.')
      updatedRecipe.steps = recipe.steps
    }

    if (newData.structuredSteps && newData.structuredSteps.length > 0) {
      updatedRecipe.structuredSteps = newData.structuredSteps
    } else {
      // If we have structured steps, keep them. If not, we might be okay with empty (it's optional-ish)
      // But better safe than sorry if we already had them.
      if (recipe.structuredSteps && recipe.structuredSteps.length > 0) {
        console.warn('[Enhance] AI returned empty structuredSteps. Keeping original.')
        updatedRecipe.structuredSteps = recipe.structuredSteps
      }
    }

    // Same for groups
    if (newData.ingredientGroups && newData.ingredientGroups.length > 0) {
      updatedRecipe.ingredientGroups = newData.ingredientGroups
    } else if (recipe.ingredientGroups && recipe.ingredientGroups.length > 0) {
      updatedRecipe.ingredientGroups = recipe.ingredientGroups
    }

    if (newData.stepGroups && newData.stepGroups.length > 0) {
      updatedRecipe.stepGroups = newData.stepGroups
    } else if (recipe.stepGroups && recipe.stepGroups.length > 0) {
      updatedRecipe.stepGroups = recipe.stepGroups
    }

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
    console.error('Enhance Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to enhance recipe'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
