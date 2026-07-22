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
 * Closes unterminated JSON structures in correct LIFO nesting order.
 * Tracks the nesting stack of { and [, properly skipping string content
 * (including escaped quotes) so string values don't confuse the scanner.
 * For JSON objects inside an array, this correctly closes with ]} instead
 * of the incorrect }] that simple count-based balancing produces.
 */
export function closeBalanced(text: string): string {
  const stack: string[] = []
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (ch === '"') {
      i++
      while (i < text.length) {
        if (text[i] === '\\') {
          i += 2
        } else if (text[i] === '"') {
          i++
          break
        } else {
          i++
        }
      }
      continue
    }
    if (ch === '{' || ch === '[') {
      stack.push(ch)
    } else if (ch === '}') {
      if (stack.length > 0 && stack[stack.length - 1] === '{') stack.pop()
    } else if (ch === ']') {
      if (stack.length > 0 && stack[stack.length - 1] === '[') stack.pop()
    }
    i++
  }
  let result = text
  for (let j = stack.length - 1; j >= 0; j--) {
    result += stack[j] === '{' ? '}' : ']'
  }
  return result
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
      // A recipe persisted with a malformed ingredients field (e.g. a legacy/AI-parse artifact
      // saved as a string rather than an array) would otherwise throw "map is not a function"
      // and crash the entire grocery job for every recipe in the week — so require a real array
      // before mapping, matching the top-level Array.isArray(recipes) guard above.
      if (Array.isArray(r.structuredIngredients) && r.structuredIngredients.length > 0) {
        // Use pre-normalized data with source attribution
        ingredientsList = r.structuredIngredients
          .map(
            (i) =>
              `- ${i.amount} ${i.unit} ${i.name} [RECIPE_ID:${r.id}] [RECIPE_TITLE:${r.title}]`,
          )
          .join('\n')
      } else {
        // Fallback to raw ingredient strings with source attribution
        const rawIngredients = Array.isArray(r.ingredients) ? r.ingredients : []
        ingredientsList = rawIngredients
          .map((i) => `- ${i.amount} ${i.name} [RECIPE_ID:${r.id}] [RECIPE_TITLE:${r.title}]`)
          .join('\n')
      }
      return `Ingredients:\n${ingredientsList}`
    })
    .join('\n\n')
}
