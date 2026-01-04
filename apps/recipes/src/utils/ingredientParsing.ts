import type { Recipe } from '../lib/types'

/**
 * Heuristic to find ingredients mentioned in a step instruction.
 * MVP: Checks if the ingredient name (or part of it) is present in the instruction text.
 */
export function getIngredientsForStep(
  stepInstruction: string,
  allIngredients: Recipe['ingredients'],
) {
  // Normalize instruction for case-insensitive check
  const instructionLower = stepInstruction.toLowerCase()

  return allIngredients.filter((ing) => {
    // Normalize ingredient name
    const nameLower = ing.name.toLowerCase()

    // Simple check: is the full name in the instruction?
    if (instructionLower.includes(nameLower)) return true

    // Fallback: Split by space and check if significant words appear?
    // For MVP, strict name inclusion is safer to avoid false positives
    // (e.g. "oil" matching "boil")
    // Improving "oil" match: check for word boundaries
    const regex = new RegExp(`\\b${nameLower}\\b`, 'i')
    return regex.test(stepInstruction)
  })
}
