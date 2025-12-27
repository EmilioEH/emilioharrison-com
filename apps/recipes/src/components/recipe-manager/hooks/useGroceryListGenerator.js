import { useState } from 'react'

const getBaseUrl = () => {
  const base = import.meta.env.BASE_URL
  return base.endsWith('/') ? base : `${base}/`
}

export const useGroceryListGenerator = (recipes, setView) => {
  const [groceryItems, setGroceryItems] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [lastGeneratedIds, setLastGeneratedIds] = useState(null)

  const handleGenerateList = async () => {
    const thisWeekRecipes = recipes.filter((r) => r.thisWeek)

    // Fallback if no recipes selected
    const recipesToProcess = thisWeekRecipes.length > 0 ? thisWeekRecipes : recipes

    if (recipesToProcess.length === 0) {
      alert('No recipes found to generate a list.')
      return
    }

    // Enforce 3-recipe minimum for "This Week" planning
    if (thisWeekRecipes.length > 0 && thisWeekRecipes.length < 3) {
      alert('Please select at least 3 recipes to ensure efficient meal planning!')
      return
    }

    // --- CACHING LOGIC ---
    const currentIds = recipesToProcess
      .map((r) => r.id)
      .sort((a, b) => (a > b ? 1 : -1))
      .join(',')

    if (groceryItems.length > 0 && lastGeneratedIds === currentIds) {
      setView('grocery')
      return
    }

    setView('grocery')
    setIsGenerating(true)
    setLastGeneratedIds(currentIds)
    setGroceryItems([])

    const localIngredients = recipesToProcess
      .filter((r) => r.structuredIngredients)
      .flatMap((r) => r.structuredIngredients)

    const missingDataRecipes = recipesToProcess.filter(
      (r) => !r.structuredIngredients || r.structuredIngredients.length === 0,
    )

    if (missingDataRecipes.length > 0) {
      try {
        const response = await fetch(`${getBaseUrl()}api/generate-grocery-list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipes: missingDataRecipes }),
        })

        if (response.ok) {
          const { ingredients = [] } = await response.json()

          const validNewIngredients = Array.isArray(ingredients)
            ? ingredients.filter((i) => i && i.name)
            : []

          setGroceryItems([...localIngredients, ...validNewIngredients])
        } else {
          console.error(`Grocery API failed: ${response.status}`)
          setGroceryItems(localIngredients)
          alert(
            `Failed to generate complete list (Server ${response.status}). Showing local items only.`,
          )
        }
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
  }
}
