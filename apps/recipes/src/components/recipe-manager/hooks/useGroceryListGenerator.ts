import { useState } from 'react'
import type { Recipe, StructuredIngredient } from '../../../lib/types'

const getBaseUrl = (): string => {
  const base = import.meta.env.BASE_URL
  return base.endsWith('/') ? base : `${base}/`
}

/** Validates recipes for grocery list generation */
type ValidationResult = { valid: true; recipes: Recipe[] } | { valid: false; error: string }

const validateRecipesForGroceryList = (recipes: Recipe[]): ValidationResult => {
  const thisWeekRecipes = recipes.filter((r) => r.thisWeek)
  const recipesToProcess = thisWeekRecipes.length > 0 ? thisWeekRecipes : recipes

  if (recipesToProcess.length === 0) {
    return { valid: false, error: 'No recipes found to generate a list.' }
  }

  // Enforce 3-recipe minimum for "This Week" planning
  if (thisWeekRecipes.length > 0 && thisWeekRecipes.length < 3) {
    return {
      valid: false,
      error: 'Please select at least 3 recipes to ensure efficient meal planning!',
    }
  }

  return { valid: true, recipes: recipesToProcess }
}

/** Generates unique cache key from recipe IDs */
const getRecipesCacheKey = (recipes: Recipe[]): string =>
  recipes
    .map((r) => r.id)
    .sort((a, b) => (a > b ? 1 : -1))
    .join(',')

/** Fetches ingredients from API for recipes missing structured data */
const fetchMissingIngredients = async (recipes: Recipe[]): Promise<StructuredIngredient[]> => {
  const response = await fetch(`${getBaseUrl()}api/generate-grocery-list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipes }),
  })

  if (!response.ok) {
    throw new Error(`Server ${response.status}`)
  }

  const { ingredients = [] } = await response.json()
  return Array.isArray(ingredients) ? ingredients.filter((i) => i && i.name) : []
}

export const useGroceryListGenerator = (recipes: Recipe[], setView: (view: string) => void) => {
  const [groceryItems, setGroceryItems] = useState<StructuredIngredient[]>([])
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [lastGeneratedIds, setLastGeneratedIds] = useState<string | null>(null)
  const [targetRecipes, setTargetRecipes] = useState<Recipe[]>([])

  const handleGenerateList = async () => {
    // Validate recipes
    const validation = validateRecipesForGroceryList(recipes)
    if (!validation.valid) {
      alert(validation.error)
      return
    }

    const recipesToProcess = validation.recipes
    setTargetRecipes(recipesToProcess)
    const currentIds = getRecipesCacheKey(recipesToProcess)

    // Return cached list if unchanged
    if (groceryItems.length > 0 && lastGeneratedIds === currentIds) {
      setView('grocery')
      return
    }

    // Start generation
    setView('grocery')
    setIsGenerating(true)
    setLastGeneratedIds(currentIds)
    setGroceryItems([])

    // Get local ingredients from recipes with structured data
    const localIngredients = recipesToProcess
      .filter((r) => r.structuredIngredients)
      .flatMap((r) =>
        r.structuredIngredients!.map((ing) => ({
          ...ing,
          sourceRecipeIds: [r.id],
        })),
      )

    // Find recipes missing structured ingredient data
    const missingDataRecipes = recipesToProcess.filter(
      (r) => !r.structuredIngredients || r.structuredIngredients.length === 0,
    )

    if (missingDataRecipes.length > 0) {
      try {
        const newIngredients = await fetchMissingIngredients(missingDataRecipes)
        setGroceryItems([...localIngredients, ...newIngredients])
      } catch (err) {
        console.error('Grocery gen failed', err)
        setGroceryItems(localIngredients)
        alert('Could not reach AI Chef. Showing locally available ingredients.')
      }
    } else {
      setGroceryItems(localIngredients)
    }

    setIsGenerating(false)
  }

  return {
    groceryItems,
    isGenerating,
    handleGenerateList,
    targetRecipes,
  }
}
