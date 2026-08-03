import type { Recipe } from './types'
import {
  isNormalised,
  storedCategoryLookup,
  storedShoppingNameLookup,
  groceryUnitLabel,
} from './grocery-utils'

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
      const tail = `[RECIPE_ID:${r.id}] [RECIPE_TITLE:${r.title}]`

      // Prefer the normalised display list, the same choice the Raw list made in PR #92.
      //
      // `structuredIngredients` is the drifted field: AI-rewritten names ("1 teaspoon sugar"
      // became "granulated sugar"), 311 different unit spellings, and a free-text `amount`.
      // `ingredients` now carries a real number in `quantity` and one canonical spelling in
      // `unit` on ~90% of rows. Sending a number instead of a string is also what makes scaling
      // for servings possible at all — you cannot multiply "a splash".
      //
      // `structuredIngredients` survives for the two things it still does better: the stored
      // category (which saves the model guessing at what is already on file) and a short shopping
      // name. The display name is the recipe's own wording, prep and all — "Yukon Gold potatoes,
      // unpeeled, halved lengthwise and cut crosswise into ½-inch-thick slices" — which is right
      // on the recipe page and pure noise on a shopping list.
      const display = Array.isArray(r.ingredients) ? r.ingredients : []
      if (display.length > 0 && display.some(isNormalised)) {
        const storedCategory = storedCategoryLookup(r)
        const storedName = storedShoppingNameLookup(r)
        const lines = display
          .map((i) => {
            const name = String(i.name || '').trim()
            if (!name) return null
            // An ingredient with no number ("to taste", "a pinch") keeps its own words rather
            // than being forced into a quantity it never had.
            const measure =
              typeof i.quantity === 'number'
                ? `${i.quantity} ${groceryUnitLabel(i.unit, i.quantity)}`.trim()
                : String(i.amount || '').trim()
            const category = storedCategory(name)
            const shopping = storedName(name) ?? name
            return `- ${measure} ${shopping}${category ? ` [CATEGORY:${category}]` : ''} ${tail}`
          })
          .filter(Boolean)
        return `Ingredients:\n${lines.join('\n')}`
      }

      let ingredientsList = ''
      // A recipe persisted with a malformed ingredients field (e.g. a legacy/AI-parse artifact
      // saved as a string rather than an array) would otherwise throw "map is not a function"
      // and crash the entire grocery job for every recipe in the week — so require a real array
      // before mapping, matching the top-level Array.isArray(recipes) guard above.
      if (Array.isArray(r.structuredIngredients) && r.structuredIngredients.length > 0) {
        // Not yet normalised: fall back to the pre-computed structured fields.
        ingredientsList = r.structuredIngredients
          .map((i) => `- ${i.amount} ${i.unit} ${i.name} [CATEGORY:${i.category}] ${tail}`)
          .join('\n')
      } else {
        // Fallback to raw ingredient strings with source attribution
        ingredientsList = display.map((i) => `- ${i.amount} ${i.name} ${tail}`).join('\n')
      }
      return `Ingredients:\n${ingredientsList}`
    })
    .join('\n\n')
}
