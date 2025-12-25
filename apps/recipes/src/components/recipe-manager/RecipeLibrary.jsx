import React, { useState, useMemo } from 'react'
import { Folder, Calendar, ChevronRight, Clock, Users, ArrowLeft, ChefHat } from 'lucide-react'

const PROTEIN_TYPES = ['Chicken', 'Beef', 'Pork', 'Fish', 'Seafood', 'Vegetarian', 'Vegan', 'Other']

const FolderCard = ({ icon: Icon, title, count, onClick, colorClass = 'bg-white' }) => (
  <button
    onClick={onClick}
    className={`group flex w-full items-center justify-between rounded-xl border-2 border-ink p-4 shadow-hard transition-all hover:-translate-y-0.5 hover:shadow-hard-lg ${colorClass}`}
  >
    <div className="flex items-center gap-4">
      <div className="rounded-full border-2 border-ink bg-white p-3 shadow-sm">
        <Icon className="h-6 w-6 text-ink" />
      </div>
      <div className="text-left">
        <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{count} Recipes</p>
      </div>
    </div>
    <ChevronRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-ink" />
  </button>
)

const LibraryRecipeCard = ({ recipe, onClick }) => (
  <button
    onClick={onClick}
    className="group relative flex w-full flex-col overflow-hidden rounded-xl border-2 border-ink bg-white text-left shadow-hard transition-all hover:-translate-y-0.5 hover:shadow-hard-lg"
  >
    {recipe.sourceImage && (
      <div className="h-32 w-full overflow-hidden border-b-2 border-ink">
        <img
          src={recipe.sourceImage}
          alt={recipe.title}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      </div>
    )}
    <div className="p-4">
      <div className="mb-2">
        {recipe.protein && (
          <span className="mb-1 inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-800">
            {recipe.protein}
          </span>
        )}
        <h3 className="line-clamp-2 font-display text-lg font-bold leading-tight text-ink">
          {recipe.title}
        </h3>
      </div>

      <div className="mt-auto flex gap-3 text-xs font-bold text-gray-500">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{recipe.cookTime + recipe.prepTime}m</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          <span>{recipe.servings}</span>
        </div>
      </div>
    </div>
  </button>
)

export const RecipeLibrary = ({ recipes, onSelectRecipe }) => {
  const [activeFolder, setActiveFolder] = useState(null) // null = root, 'This Week' or protein name

  const folders = useMemo(() => {
    // Calculate counts
    const proteinCounts = {}
    PROTEIN_TYPES.forEach((p) => (proteinCounts[p] = 0))
    let uncategorizedCount = 0
    let thisWeekCount = 0

    recipes.forEach((r) => {
      if (r.thisWeek) thisWeekCount++
      if (r.protein && PROTEIN_TYPES.includes(r.protein)) {
        proteinCounts[r.protein]++
      } else {
        uncategorizedCount++
      }
    })

    return { proteinCounts, uncategorizedCount, thisWeekCount }
  }, [recipes])

  const filteredRecipes = useMemo(() => {
    if (!activeFolder) return []
    if (activeFolder === 'This Week') {
      return recipes.filter((r) => r.thisWeek)
    }
    if (activeFolder === 'Uncategorized') {
      return recipes.filter((r) => !r.protein || !PROTEIN_TYPES.includes(r.protein))
    }
    return recipes.filter((r) => r.protein === activeFolder)
  }, [recipes, activeFolder])

  if (activeFolder) {
    return (
      <div className="animate-in slide-in-from-right-4 flex h-full flex-col">
        <div className="sticky top-0 z-10 flex items-center gap-4 border-b-2 border-ink bg-paper px-6 py-4">
          <button
            onClick={() => setActiveFolder(null)}
            className="-ml-2 rounded-full p-2 hover:bg-black/5"
          >
            <ArrowLeft className="h-6 w-6 text-ink" />
          </button>
          <h2 className="font-display text-2xl font-black">{activeFolder}</h2>
          <span className="rounded-full bg-ink px-2 py-1 text-xs font-bold text-white">
            {filteredRecipes.length}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 overflow-y-auto p-4 pb-20">
          {filteredRecipes.length === 0 ? (
            <div className="col-span-2 py-20 text-center text-gray-400">
              <ChefHat className="mx-auto mb-4 h-16 w-16 opacity-50" />
              <p className="font-bold">No recipes in this folder yet.</p>
            </div>
          ) : (
            filteredRecipes.map((recipe) => (
              <LibraryRecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => onSelectRecipe(recipe)}
              />
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in space-y-4 p-4 pb-20">
      <div className="mb-6">
        <h2 className="mb-2 font-display text-lg font-bold">My Meal Plan</h2>
        <FolderCard
          icon={Calendar}
          title="This Week"
          count={folders.thisWeekCount}
          onClick={() => setActiveFolder('This Week')}
          colorClass="bg-teal/10 border-teal"
        />
      </div>

      <div>
        <h2 className="mb-2 font-display text-lg font-bold">Browse by Protein</h2>
        <div className="space-y-3">
          {PROTEIN_TYPES.map((protein) => (
            <FolderCard
              key={protein}
              icon={Folder}
              title={protein}
              count={folders.proteinCounts[protein]}
              onClick={() => setActiveFolder(protein)}
            />
          ))}
          {folders.uncategorizedCount > 0 && (
            <FolderCard
              icon={Folder}
              title="Uncategorized"
              count={folders.uncategorizedCount}
              onClick={() => setActiveFolder('Uncategorized')}
            />
          )}
        </div>
      </div>
    </div>
  )
}
