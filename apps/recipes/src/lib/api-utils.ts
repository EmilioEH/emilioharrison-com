import type { Recipe } from './types'

/**
 * Cleans Gemini response by removing markdown blocks (e.g. ```json ... ```).
 * @param text - Raw response from Gemini
 * @returns Cleaned JSON string
 */
export function cleanGeminiResponse(text: string): string {
  if (!text) return ''
  return text.replace(/```json\n?|\n?```/g, '').trim()
}

/**
 * Formats a list of recipes into a structured prompt for grocery list generation.
 * @param recipes - List of recipe objects
 * @returns Formatted prompt string
 */
export function formatRecipesForPrompt(recipes: Recipe[]): string {
  if (!recipes || !Array.isArray(recipes)) return ''
  return recipes
    .map((r) => {
      const ingredientsList = (r.ingredients || []).map((i) => `• ${i.amount} ${i.name}`).join('\n')
      return `${r.title}\nIngredients:\n${ingredientsList}`
    })
    .join('\n\n')
}
