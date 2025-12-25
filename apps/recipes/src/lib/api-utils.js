/**
 * Cleans Gemini response by removing markdown blocks (e.g. ```json ... ```).
 * @param {string} text - Raw response from Gemini
 * @returns {string} - Cleaned JSON string
 */
export function cleanGeminiResponse(text) {
  if (!text) return ''
  return text.replace(/```json\n?|\n?```/g, '').trim()
}

/**
 * Formats a list of recipes into a structured prompt for grocery list generation.
 * @param {Array} recipes - List of recipe objects
 * @returns {string} - Formatted prompt string
 */
export function formatRecipesForPrompt(recipes) {
  if (!recipes || !Array.isArray(recipes)) return ''
  return recipes
    .map((r) => {
      const ingredientsList = (r.ingredients || []).map((i) => `• ${i.amount} ${i.name}`).join('\n')
      return `${r.title}\nIngredients:\n${ingredientsList}`
    })
    .join('\n\n')
}
