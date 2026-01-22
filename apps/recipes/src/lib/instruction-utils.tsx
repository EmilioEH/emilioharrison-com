import React from 'react'

/**
 * Highlights ingredients and verbs in recipe instruction text.
 * Verbs are expected to be wrapped in double asterisks (e.g., **mix**).
 * Ingredients are highlighted based on provided indices and names.
 */
export function renderHighlightedInstruction(
  text: string,
  ingredients: { name: string }[] = [],
  highlightIndices: number[] = [],
) {
  if (!text) return null

  // 1. Identify ingredients to highlight in this text
  const targetIngredients = highlightIndices
    .map((idx) => ingredients[idx]?.name)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length) // Longer names first to avoid partial matches

  if (targetIngredients.length === 0 && !text.includes('**')) {
    return text
  }

  // 2. Create a regex for both verbs (**) and ingredients
  // Verb pattern: \*\*(.*?)\*\*
  // Ingredient pattern: (ing1|ing2|ing3) - case insensitive, simplified
  // We need to be careful with word boundaries for ingredients

  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  const patterns: string[] = []

  // Verb pattern
  patterns.push('\\*\\*(.*?)\\*\\*')

  // Ingredient patterns (with word boundaries)
  if (targetIngredients.length > 0) {
    const ingredientsPattern = `\\b(${targetIngredients.map(escapeRegExp).join('|')})\\b`
    patterns.push(ingredientsPattern)
  }

  const regex = new RegExp(patterns.join('|'), 'gi')

  const parts: (string | React.ReactElement)[] = []
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }

    const fullMatch = match[0]
    const verbContent = match[1] // Group 1 is the content between **
    const ingredientMatch = match[2] // Group 2 is the ingredient (if any)

    if (fullMatch.startsWith('**')) {
      // It's a verb
      parts.push(
        <strong key={match.index} className="font-black text-foreground">
          {verbContent}
        </strong>,
      )
    } else if (ingredientMatch) {
      // It's an ingredient
      parts.push(
        <span key={match.index} className="font-semibold text-primary">
          {ingredientMatch}
        </span>,
      )
    }

    lastIndex = regex.lastIndex
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts
}
