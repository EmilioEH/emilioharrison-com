import { useState } from 'react'
import type { Recipe, ShoppableIngredient } from '../../../lib/types'
import { alert } from '../../../lib/dialogStore'

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

/** Fetches shoppable ingredients from API */
const fetchShoppableIngredients = async (
  recipes: Recipe[],
  signal?: AbortSignal,
): Promise<ShoppableIngredient[]> => {
  const response = await fetch(`${getBaseUrl()}api/generate-grocery-list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipes }),
    signal,
  })

  if (!response.ok) {
    throw new Error(`Server ${response.status}`)
  }

  const { ingredients = [] } = await response.json()
  return Array.isArray(ingredients) ? ingredients.filter((i) => i && i.name && i.sources) : []
}

/**
 * Converts recipes with structuredIngredients to ShoppableIngredient format.
 * This is a fallback for when we have local data but need to display in the new format.
 */
const convertToShoppableFormat = (recipes: Recipe[]): ShoppableIngredient[] => {
  const ingredientMap = new Map<string, ShoppableIngredient>()

  for (const recipe of recipes) {
    if (!recipe.structuredIngredients) continue

    for (const ing of recipe.structuredIngredients) {
      const key = `${ing.name.toLowerCase()}|${ing.unit.toLowerCase()}`

      if (ingredientMap.has(key)) {
        const existing = ingredientMap.get(key)!
        existing.purchaseAmount += ing.amount
        // Add this recipe as a source if not already present
        if (!existing.sources.some((s) => s.recipeId === recipe.id)) {
          existing.sources.push({
            recipeId: recipe.id,
            recipeTitle: recipe.title,
            originalAmount: `${ing.amount} ${ing.unit}`,
          })
        }
      } else {
        ingredientMap.set(key, {
          name: ing.name,
          purchaseAmount: ing.amount,
          purchaseUnit: ing.unit,
          category: ing.category,
          sources: [
            {
              recipeId: recipe.id,
              recipeTitle: recipe.title,
              originalAmount: `${ing.amount} ${ing.unit}`,
            },
          ],
        })
      }
    }
  }

  return Array.from(ingredientMap.values())
}

export const useGroceryListGenerator = (recipes: Recipe[], setView: (view: string) => void) => {
  const [groceryItems, setGroceryItems] = useState<ShoppableIngredient[]>([])
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [lastGeneratedIds, setLastGeneratedIds] = useState<string | null>(null)
  const [targetRecipes, setTargetRecipes] = useState<Recipe[]>([])
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  // eslint-disable-next-line sonarjs/cognitive-complexity
  const handleGenerateList = async () => {
    // Validate recipes
    const validation = validateRecipesForGroceryList(recipes)
    if (!validation.valid) {
      await alert(validation.error)
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

    // Check local storage cache first
    const cacheKey = `grocery-cache-v1-${currentIds}`
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const { ingredients, timestamp: _timestamp } = JSON.parse(cached)
        // detailed validation could go here, but for now assumption is valid
        if (Array.isArray(ingredients) && ingredients.length > 0) {
          console.log('Loaded grocery list from cache')
          setGroceryItems(ingredients)
          setIsGenerating(false)
          setView('grocery')
          return
        }
      }
    } catch (e) {
      console.warn('Failed to load from cache', e)
    }

    // Cancel any existing request
    if (abortController) {
      abortController.abort()
    }

    // Start generation
    const newController = new AbortController()
    setAbortController(newController)
    setView('grocery')

    // PROGRESSIVE ENHANCEMENT:
    // 1. Show fallback items immediately (0ms latency)
    const fallbackIngredients = convertToShoppableFormat(
      recipesToProcess.filter((r) => r.structuredIngredients),
    )
    if (fallbackIngredients.length > 0) {
      setGroceryItems(fallbackIngredients)
      setIsGenerating(false) // Show list immediately
    } else {
      setIsGenerating(true) // No items? Show loading spinner
    }

    setLastGeneratedIds(currentIds)

    // For the new shoppable format, we always call the API to get proper conversions
    // The API handles both structured and raw ingredients
    try {
      const shoppableIngredients = await fetchShoppableIngredients(
        recipesToProcess,
        newController.signal,
      )
      setGroceryItems(shoppableIngredients)

      // Save to cache
      try {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            ingredients: shoppableIngredients,
            timestamp: Date.now(),
          }),
        )
      } catch (e) {
        console.warn('Failed to save to cache', e)
      }
    } catch (err) {
      // Don't show error if request was cancelled
      if (err instanceof Error && err.name === 'AbortError') {
        setIsGenerating(false)
        setAbortController(null)
        return
      }

      console.error('Grocery gen failed', err)

      // If we didn't have fallback items before, set them now
      if (groceryItems.length === 0) {
        const fallback = convertToShoppableFormat(
          recipesToProcess.filter((r) => r.structuredIngredients),
        )
        setGroceryItems(fallback)
        if (fallback.length === 0) {
          await alert('Could not generate grocery list. Please try again.')
        } else {
          await alert('Could not reach AI. Showing ingredients without store-unit conversions.')
        }
      } else {
        // We already showed fallback, just alert
        // actually silent failure is better if we already showed the list
        console.warn('AI enhancement failed, keeping fallback list')
      }
    }

    setIsGenerating(false)
    setAbortController(null)
  }

  const handleCancel = () => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
      setIsGenerating(false)
    }
  }

  return {
    groceryItems,
    isGenerating,
    handleGenerateList,
    handleCancel,
    targetRecipes,
  }
}
