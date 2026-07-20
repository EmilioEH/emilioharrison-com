import type { GoogleGenAI } from '@google/genai'
import { executeAiParse } from './ai-parser'
import { mergeAiRecipeUpdate, snapshotRecipe } from './recipe-merge'
import type { Recipe } from '../types'

// Provider-agnostic core of the "Kenji-style" total reparse (background Enhancement / AI
// Refresh). Deliberately free of Cloudflare/Astro/Firestore imports so both the Cloudflare
// orchestrator (recipe-enhancement-job.ts) and the self-hosted VM worker can call it — see
// BACKGROUND-JOBS-VM-PLAN.md. It takes an already-built Gemini client and *returns* the enhanced
// recipe (or throws); persisting status/result to Firestore is the caller's job, because that
// half differs per environment (REST client on Cloudflare, firebase-admin on the VM).

/**
 * Re-derives the enhanced recipe from its best available source (original URL, then original
 * photo, then a text reconstruction of the saved recipe), merges the AI result onto the
 * original with the usual plausibility guards, and snapshots the pre-merge state for one-tap
 * restore.
 *
 * Returns a recipe object ready to persist (with `enhancementStatus: 'complete'`,
 * `enhancementError: undefined`, and `previousVersion` set). Throws `UnusableAiResultError`
 * (from recipe-merge) when the AI result is too sparse to merge, or a generic error on an
 * upstream/timeout failure — the caller maps those to a persisted `error` status.
 */
export async function computeEnhancedRecipe(
  gemini: GoogleGenAI,
  recipe: Recipe,
  origin: string,
  opts: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<Recipe> {
  const { signal, timeoutMs } = opts
  const commonParams = { style: 'enhanced' as const }
  let newData

  if (recipe.sourceUrl) {
    console.log(`[Enhance] Total Reparse via URL: ${recipe.sourceUrl}`)
    newData = await executeAiParse(
      gemini,
      { ...commonParams, url: recipe.sourceUrl },
      origin,
      signal,
      timeoutMs,
    )
  } else if (recipe.sourceImage) {
    console.log(`[Enhance] Total Reparse via Image`)
    newData = await executeAiParse(
      gemini,
      { ...commonParams, image: recipe.sourceImage },
      origin,
      signal,
      timeoutMs,
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
    newData = await executeAiParse(
      gemini,
      { ...commonParams, text: textRep },
      origin,
      signal,
      timeoutMs,
    )
  }

  const previousVersion = snapshotRecipe(recipe, 'enhance')
  return {
    ...mergeAiRecipeUpdate(recipe, newData),
    previousVersion,
    enhancementStatus: 'complete' as const,
    enhancementError: undefined,
  }
}
