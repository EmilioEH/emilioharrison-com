import type { Ingredient, StructuredStep } from './types'

export type StepIngredientMapping = Array<{ indices: number[] }>

const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalize = (text: string): string =>
  text
    .toLowerCase()
    .replace(/\*\*/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

const buildIngredientVariants = (ingredientName: string): string[] => {
  const raw = ingredientName.trim()
  if (!raw) return []

  const withoutParenthetical = raw.replace(/\([^)]*\)/g, '').trim()
  const beforeComma = withoutParenthetical.split(',')[0]?.trim() || withoutParenthetical

  return Array.from(new Set([raw, withoutParenthetical, beforeComma].filter(Boolean)))
}

const containsIngredient = (stepText: string, ingredientName: string): boolean => {
  const variants = buildIngredientVariants(ingredientName)
  if (!variants.length) return false

  return variants.some((variant) => {
    const pattern = new RegExp(`\\b${escapeRegExp(normalize(variant))}\\b`, 'i')
    return pattern.test(stepText)
  })
}

export function computeStepIngredientMappings(
  ingredients: Ingredient[],
  steps: string[],
  structuredSteps?: StructuredStep[],
): StepIngredientMapping {
  const safeIngredients = Array.isArray(ingredients) ? ingredients : []
  const safeSteps = Array.isArray(steps) ? steps : []
  const safeStructured = Array.isArray(structuredSteps) ? structuredSteps : []

  return safeSteps.map((plainStep, idx) => {
    const structured = safeStructured[idx]
    const mergedStepText = normalize(
      [plainStep, structured?.text, structured?.highlightedText].filter(Boolean).join(' '),
    )

    const indices = safeIngredients
      .map((ingredient, ingredientIdx) => ({ ingredient, ingredientIdx }))
      .filter(({ ingredient }) => containsIngredient(mergedStepText, ingredient.name))
      .map(({ ingredientIdx }) => ingredientIdx)

    return { indices }
  })
}

export function hasUsefulStepIngredientMappings(
  mappings: StepIngredientMapping | undefined,
  stepCount: number,
): boolean {
  if (!Array.isArray(mappings) || mappings.length !== stepCount) return false
  return mappings.some((entry) => Array.isArray(entry?.indices) && entry.indices.length > 0)
}

export function areStepIngredientMappingsEqual(
  a: StepIngredientMapping | undefined,
  b: StepIngredientMapping | undefined,
): boolean {
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  if (a.length !== b.length) return false

  return a.every((entry, idx) => {
    const left = Array.isArray(entry?.indices) ? entry.indices : []
    const right = Array.isArray(b[idx]?.indices) ? b[idx].indices : []
    if (left.length !== right.length) return false
    return left.every((value, valueIdx) => value === right[valueIdx])
  })
}
