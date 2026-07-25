import React from 'react'

/**
 * Emphasis markup the AI has been seen emitting in `highlightedText` instead of the `**bold**`
 * this renderer expects. Reported in the wild as instructions reading literally
 * "Set the pork to come to &lt;highlight&gt;room temperature&lt;/highlight&gt; 1 to 2 hours...".
 *
 * Normalising here rather than only tightening the prompt fixes recipes ALREADY stored with these
 * tags — no data migration — and keeps the display robust if the model drifts to another variant
 * later. Open and close tags both map to `**`, which is symmetric in markdown.
 */
const EMPHASIS_TAGS = /<\/?\s*(?:highlight|mark|strong|em|b|i)\s*>/gi

/** Converts stray HTML-ish emphasis tags into the `**` markdown this renderer understands. */
export function normalizeEmphasisMarkup(text: string): string {
  return text.replace(EMPHASIS_TAGS, '**')
}

/**
 * Highlights ingredients and verbs in recipe instruction text.
 * Verbs are expected to be wrapped in double asterisks (e.g., **mix**); HTML-ish emphasis tags
 * from the AI are normalised to that form first (see EMPHASIS_TAGS).
 * Ingredients are highlighted based on provided indices and names.
 */
export function renderHighlightedInstruction(
  rawText: string,
  ingredients: { name: string }[] = [],
  highlightIndices: number[] = [],
): React.ReactNode {
  if (!rawText) return null
  const text = normalizeEmphasisMarkup(rawText)

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
        <strong key={match.index} className="font-semibold text-foreground">
          {verbContent}
        </strong>,
      )
    } else if (ingredientMatch) {
      // It's an ingredient
      parts.push(
        <span key={match.index} className="font-normal text-primary">
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
