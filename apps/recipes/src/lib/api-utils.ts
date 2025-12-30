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
 * Includes recipe IDs and titles for source attribution.
 * @param recipes - List of recipe objects
 * @returns Formatted prompt string
 */
export function formatRecipesForPrompt(recipes: Recipe[]): string {
  if (!recipes || !Array.isArray(recipes)) return ''
  return recipes
    .map((r) => {
      let ingredientsList = ''
      if (r.structuredIngredients && r.structuredIngredients.length > 0) {
        // Use pre-normalized data with source attribution
        ingredientsList = r.structuredIngredients
          .map(
            (i) =>
              `- ${i.amount} ${i.unit} ${i.name} [RECIPE_ID:${r.id}] [RECIPE_TITLE:${r.title}]`,
          )
          .join('\n')
      } else {
        // Fallback to raw ingredient strings with source attribution
        ingredientsList = (r.ingredients || [])
          .map((i) => `- ${i.amount} ${i.name} [RECIPE_ID:${r.id}] [RECIPE_TITLE:${r.title}]`)
          .join('\n')
      }
      return `Ingredients:\n${ingredientsList}`
    })
    .join('\n\n')
}
