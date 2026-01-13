import type { Recipe, FamilyRecipeData } from './types'

/** Options for share content customization */
export interface ShareOptions {
  includePhoto: boolean
  includeNotes: boolean
  includeRatings: boolean
  includeCookingHistory: boolean
  format: 'text' | 'pdf'
}

/** Default share options */
export const defaultShareOptions: ShareOptions = {
  includePhoto: true,
  includeNotes: true,
  includeRatings: true,
  includeCookingHistory: false,
  format: 'text',
}

/**
 * Format metadata value for display
 */
function formatMetadata(label: string, value: string | number | undefined): string {
  if (!value) return ''
  return `${label}: ${value}`
}

/**
 * Format time in minutes to a human-readable string
 */
function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

/**
 * Calculate average rating from family data
 */
function getAverageRating(familyData?: FamilyRecipeData): number | null {
  if (!familyData?.ratings?.length) return null
  const sum = familyData.ratings.reduce((acc, r) => acc + r.rating, 0)
  return Math.round((sum / familyData.ratings.length) * 10) / 10
}

/**
 * Build recipe content as plain text
 */
/**
 * Build recipe content as plain text
 */
export function buildRecipeText(
  recipe: Recipe,
  familyData?: FamilyRecipeData,
  options: Partial<ShareOptions> = {},
): string {
  const opts = { ...defaultShareOptions, ...options }
  const lines: string[] = []

  addRecipeTitleAndBasicInfo(lines, recipe)
  addRecipeMetadata(lines, recipe)

  if (recipe.description) {
    lines.push(recipe.description, '')
  }

  if (opts.includeRatings) {
    addRecipeRatings(lines, recipe, familyData)
  }

  addRecipeIngredients(lines, recipe)
  addRecipeInstructions(lines, recipe)

  if (opts.includeNotes) {
    addRecipeNotes(lines, recipe, familyData)
  }

  if (opts.includeCookingHistory) {
    addRecipeCookingHistory(lines, familyData)
  }

  if (recipe.sourceUrl) {
    lines.push('---', `Source: ${recipe.sourceUrl}`)
  }

  return lines.join('\n')
}

/** Helper to add title and basic info (servings, times) */
function addRecipeTitleAndBasicInfo(lines: string[], recipe: Recipe) {
  lines.push(`# ${recipe.title}`, '')

  const infoItems: string[] = []
  if (recipe.servings) infoItems.push(`Servings: ${recipe.servings}`)
  if (recipe.prepTime) infoItems.push(`Prep: ${formatTime(recipe.prepTime)}`)
  if (recipe.cookTime) infoItems.push(`Cook: ${formatTime(recipe.cookTime)}`)

  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0)
  if (totalTime) infoItems.push(`Total: ${formatTime(totalTime)}`)

  if (infoItems.length > 0) {
    lines.push(infoItems.join(' | '), '')
  }
}

/** Helper to add metadata line (cuisine, difficulty, etc) */
function addRecipeMetadata(lines: string[], recipe: Recipe) {
  const metadata: string[] = [
    formatMetadata('Cuisine', recipe.cuisine),
    formatMetadata('Difficulty', recipe.difficulty),
    formatMetadata('Meal Type', recipe.mealType),
    formatMetadata('Dish Type', recipe.dishType),
    formatMetadata('Protein', recipe.protein),
  ]

  if (recipe.dietary?.length) metadata.push(`Dietary: ${recipe.dietary.join(', ')}`)
  if (recipe.equipment?.length) metadata.push(`Equipment: ${recipe.equipment.join(', ')}`)
  if (recipe.occasion?.length) metadata.push(`Occasion: ${recipe.occasion.join(', ')}`)

  const validMetadata = metadata.filter(Boolean)
  if (validMetadata.length > 0) {
    lines.push(validMetadata.join(' • '), '')
  }
}

/** Helper to add ratings section */
function addRecipeRatings(lines: string[], recipe: Recipe, familyData?: FamilyRecipeData) {
  const avgRating = getAverageRating(familyData)
  if (avgRating !== null) {
    lines.push(`⭐ Rating: ${avgRating}/5 (${familyData!.ratings.length} ratings)`, '')
  } else if (recipe.rating) {
    lines.push(`⭐ Rating: ${recipe.rating}/5`, '')
  }
}

/** Helper to add ingredients section */
function addRecipeIngredients(lines: string[], recipe: Recipe) {
  lines.push('## Ingredients', '')
  for (const ing of recipe.ingredients) {
    const prep = ing.prep ? `, ${ing.prep}` : ''
    lines.push(`• ${ing.amount} ${ing.name}${prep}`)
  }
  lines.push('')
}

/** Helper to add instructions section */
function addRecipeInstructions(lines: string[], recipe: Recipe) {
  lines.push('## Instructions', '')
  recipe.steps.forEach((step, index) => {
    lines.push(`${index + 1}. ${step}`, '')
  })
}

/** Helper to add notes section */
function addRecipeNotes(lines: string[], recipe: Recipe, familyData?: FamilyRecipeData) {
  const allNotes: string[] = []
  if (recipe.notes) allNotes.push(recipe.notes)
  if (recipe.userNotes) allNotes.push(recipe.userNotes)

  if (familyData?.notes?.length) {
    for (const note of familyData.notes) {
      allNotes.push(`${note.userName}: ${note.text}`)
    }
  }

  if (allNotes.length > 0) {
    lines.push('## Notes', '')
    allNotes.forEach((note) => lines.push(`• ${note}`))
    lines.push('')
  }
}

/** Helper to add cooking history section */
function addRecipeCookingHistory(lines: string[], familyData?: FamilyRecipeData) {
  if (!familyData?.cookingHistory?.length) return

  lines.push('## Cooking History', '')
  for (const entry of familyData.cookingHistory.slice(0, 5)) {
    const date = new Date(entry.cookedAt).toLocaleDateString()
    const reaction = entry.wouldMakeAgain ? '👍' : entry.wouldMakeAgain === false ? '👎' : ''
    lines.push(`• ${date} - ${entry.userName} ${reaction}`)
  }
  lines.push('')
}

/**
 * Share recipe using Web Share API or clipboard fallback
 */
export async function shareRecipeText(
  recipe: Recipe,
  familyData?: FamilyRecipeData,
  options: Partial<ShareOptions> = {},
): Promise<{ success: boolean; method: 'share' | 'clipboard' }> {
  const text = buildRecipeText(recipe, familyData, options)

  // Try Web Share API first
  if (navigator.share) {
    try {
      await navigator.share({
        title: recipe.title,
        text,
      })
      return { success: true, method: 'share' }
    } catch (err) {
      // User cancelled or share failed, try clipboard
      if ((err as Error).name === 'AbortError') {
        return { success: false, method: 'share' }
      }
    }
  }

  // Fallback to clipboard
  try {
    await navigator.clipboard.writeText(text)
    return { success: true, method: 'clipboard' }
  } catch {
    return { success: false, method: 'clipboard' }
  }
}

/**
 * Share PDF using Web Share API with file
 */
export async function shareRecipePdf(
  pdfBlob: Blob,
  recipe: Recipe,
): Promise<{ success: boolean; method: 'share' | 'download' }> {
  const fileName = `${recipe.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  const file = new File([pdfBlob], fileName, { type: 'application/pdf' })

  // Try Web Share API with files
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title: recipe.title,
        files: [file],
      })
      return { success: true, method: 'share' }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return { success: false, method: 'share' }
      }
    }
  }

  // Fallback to download
  const url = URL.createObjectURL(pdfBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
  return { success: true, method: 'download' }
}
