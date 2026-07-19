import { db } from '../firebase-server'
import { executeAiParse } from './ai-parser'
import { mergeAiRecipeUpdate, snapshotRecipe, UnusableAiResultError } from './recipe-merge'
import type { Recipe } from '../types'

export type EnhancementJobResult =
  | { success: true; recipe: Recipe }
  | { success: false; error: string; status: number }

/**
 * Runs the "Kenji-style" total reparse (background Enhancement after a fresh AI import, or a
 * manual AI Refresh) and persists the result — including failure — directly to Firestore.
 *
 * This never throws: every outcome (success, an unusable AI result, or an upstream failure) is
 * written to `recipe.enhancementStatus`/`enhancementError` and returned as a result object, so
 * it's safe to hand this promise to `ctx.waitUntil()` without an unhandled rejection, and safe
 * to `await` directly from an HTTP handler that wants to map the result to a response.
 */
export async function runEnhancementJob(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  locals: any,
  recipe: Recipe,
  origin: string,
  signal?: AbortSignal,
): Promise<EnhancementJobResult> {
  const recipeId = recipe.id

  try {
    await db.updateDocument('recipes', recipeId, { enhancementStatus: 'processing' })
  } catch (e) {
    console.error('[Enhance] Failed to mark processing:', e)
  }

  try {
    const commonParams = { style: 'enhanced' as const }
    let newData

    if (recipe.sourceUrl) {
      console.log(`[Enhance] Total Reparse via URL: ${recipe.sourceUrl}`)
      newData = await executeAiParse(
        locals,
        { ...commonParams, url: recipe.sourceUrl },
        origin,
        signal,
      )
    } else if (recipe.sourceImage) {
      console.log(`[Enhance] Total Reparse via Image`)
      newData = await executeAiParse(
        locals,
        { ...commonParams, image: recipe.sourceImage },
        origin,
        signal,
      )
    } else {
      console.log(`[Enhance] Text-based enhancement fallback`)
      const textRep = `
Title: ${recipe.title}
Ingredients:
${recipe.ingredients.map((i) => `${i.amount} ${i.name}`).join('\n')}
Steps:
${recipe.steps.join('\n')}
      `.trim()
      newData = await executeAiParse(locals, { ...commonParams, text: textRep }, origin, signal)
    }

    const previousVersion = snapshotRecipe(recipe, 'enhance')
    const updatedRecipe = {
      ...mergeAiRecipeUpdate(recipe, newData),
      previousVersion,
      enhancementStatus: 'complete' as const,
      enhancementError: undefined,
    }

    await db.updateDocument('recipes', recipeId, updatedRecipe)

    return { success: true, recipe: updatedRecipe }
  } catch (error: unknown) {
    const isUnusable = error instanceof UnusableAiResultError
    const message = error instanceof Error ? error.message : 'Failed to enhance recipe'
    console.error('[Enhance] Error:', message)

    try {
      await db.updateDocument('recipes', recipeId, {
        enhancementStatus: 'error',
        enhancementError: message,
      })
    } catch (writeError) {
      console.error('[Enhance] Failed to persist error status:', writeError)
    }

    return { success: false, error: message, status: isUnusable ? 422 : 500 }
  }
}
