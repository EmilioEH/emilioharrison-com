import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Clock,
  Users,
  Flame,
  Edit2,
  Trash2,
  FolderInput,
  Calendar,
  Check,
  Maximize2,
  Minimize2,
  MoreHorizontal,
} from 'lucide-react'
// import { Button } from '../ui/Button'

// Wake Lock Helper
const useWakeLock = (enabled) => {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return

    let wakeLock = null
    const requestLock = async () => {
      try {
        wakeLock = await navigator.wakeLock.request('screen')
      } catch (err) {
        console.warn('Wake Lock error:', err)
      }
    }
    requestLock()

    return () => wakeLock?.release()
  }, [enabled])
}

const DetailHeader = ({ recipe, onClose, onAction, cookingMode, setCookingMode, onToggleThisWeek }) => (
  <div
    className={`sticky top-0 z-20 flex items-center justify-between border-b border-md-sys-color-outline bg-md-sys-color-surface px-4 py-4 transition-all ${cookingMode ? 'py-2' : ''}`}
  >
    <button
      onClick={onClose}
      className="hover:bg-md-sys-color-on-surface/[0.08] rounded-full p-2 transition"
      aria-label="Back to Library"
      title="Back to Library"
    >
      <ArrowLeft className="h-6 w-6 text-md-sys-color-on-surface" />
    </button>

    <div className="flex gap-2">
      <button
        onClick={() => setCookingMode(!cookingMode)}
        className={`rounded-full border p-2 transition ${cookingMode ? 'border-md-sys-color-primary bg-md-sys-color-primary-container text-md-sys-color-on-primary-container' : 'border-transparent text-md-sys-color-on-surface-variant hover:text-md-sys-color-on-surface'}`}
        title="Cooking Mode (Keep Screen On)"
      >
        {cookingMode ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
      </button>
      <div className="group relative">
        <button className="hover:bg-md-sys-color-on-surface/[0.08] rounded-full p-2 text-md-sys-color-on-surface-variant">
          <MoreHorizontal className="h-6 w-6" />
        </button>
        {/* Dropdown Menu */}
        <div className="invisible absolute right-0 top-full z-30 mt-2 flex w-48 flex-col overflow-hidden rounded-md-m border border-md-sys-color-outline bg-md-sys-color-surface opacity-0 shadow-md-2 transition-all group-hover:visible group-hover:opacity-100">
          <button
            onClick={() => {
                if (onToggleThisWeek) onToggleThisWeek()
                else onAction('addToWeek') // Fallback if prop not direct
            }}
            className="hover:bg-md-sys-color-primary/[0.08] flex items-center gap-2 px-4 py-3 text-left text-sm font-medium"
          >
            <Calendar className="h-4 w-4" />{' '}
            {recipe.thisWeek ? 'Remove from Week' : 'Add to This Week'}
          </button>
          <button
            onClick={() => onAction('move')}
            className="hover:bg-md-sys-color-primary/[0.08] flex items-center gap-2 px-4 py-3 text-left text-sm font-medium"
          >
            <FolderInput className="h-4 w-4" /> Move Folder
          </button>
          <button
            onClick={() => onAction('edit')}
            className="hover:bg-md-sys-color-primary/[0.08] flex items-center gap-2 px-4 py-3 text-left text-sm font-medium"
          >
            <Edit2 className="h-4 w-4" /> Edit Recipe
          </button>
          <button
            onClick={() => onAction('delete')}
            className="hover:bg-md-sys-color-error/[0.08] flex items-center gap-2 border-t border-md-sys-color-outline px-4 py-3 text-left text-sm font-medium text-md-sys-color-error"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>
    </div>
  </div>
)

const CheckableItem = ({ text, isChecked, onToggle, largeText }) => {
  return (
    <button
      onClick={onToggle}
      className={`flex w-full items-start gap-4 p-3 text-left transition-all ${isChecked ? 'opacity-40 grayscale' : ''}`}
    >
      <div
        className={`mt-0.5 flex items-center justify-center rounded-md-xs border border-md-sys-color-outline transition-colors ${isChecked ? 'border-md-sys-color-primary bg-md-sys-color-primary' : 'bg-md-sys-color-surface'} ${largeText ? 'h-6 w-6' : 'h-5 w-5'}`}
      >
        {isChecked && <Check className="h-3 w-3 text-md-sys-color-on-primary" />}
      </div>
      <span
        className={`flex-1 font-body text-md-sys-color-on-surface ${largeText ? 'text-lg leading-relaxed' : 'text-base'} ${isChecked ? 'line-through opacity-40' : ''}`}
      >
        {text}
      </span>
    </button>
  )
}

export const RecipeDetail = ({ recipe, onClose, onUpdate, onDelete, onToggleThisWeek }) => {
  const [cookingMode, setCookingMode] = useState(false)

  // Local state for checkboxes
  // We don't necessarily need to persist this to the DB permanently immediately,
  // but it's nice to have. For now, let's keep it local to the session or lift it up if needed.
  // Actually, keeping it local is fine for a simple "session" of cooking.
  const [checkedIngredients, setCheckedIngredients] = useState({})
  const [checkedSteps, setCheckedSteps] = useState({})

  useWakeLock(cookingMode)

  const handleAction = (action) => {
    if (action === 'delete') {
      if (confirm('Are you certain you want to delete this recipe?')) {
        onDelete(recipe.id)
      }
    } else if (action === 'edit') {
      onUpdate({ ...recipe }, 'edit')
    } else if (action === 'addToWeek') {
      onUpdate({ ...recipe, thisWeek: !recipe.thisWeek }, 'save')
    }
    // "move" - implementing a folder picker is out of scope for this precise chunk,
    // but we can map it to 'edit' which has access to fields, or simple prompt.
    // Let's defer "move" to just opening edit mode for now, or a simple prompt.
    else if (action === 'move') {
      onUpdate({ ...recipe }, 'edit') // Simply go to edit to change protein
    }
  }

  return (
    <div
      className={`animate-in slide-in-from-bottom-10 fixed inset-0 z-50 flex flex-col overflow-hidden bg-md-sys-color-surface ${cookingMode ? 'safe-area-pt' : ''}`}
    >
      <DetailHeader
        recipe={recipe}
        onClose={onClose}
        onAction={handleAction}
        cookingMode={cookingMode}
        setCookingMode={setCookingMode}
        onToggleThisWeek={onToggleThisWeek}
      />

      <div className={`flex-1 overflow-y-auto pb-20 ${cookingMode ? 'px-4' : ''}`}>
        <div className="relative">
          {recipe.sourceImage && !cookingMode && (
            <div className="h-64 w-full">
              <img src={recipe.sourceImage} className="h-full w-full object-cover" alt="Recipe" />
            </div>
          )}

          <div
            className={`relative bg-md-sys-color-surface ${cookingMode ? 'pt-4' : '-mt-6 rounded-t-md-xl border-t border-md-sys-color-outline p-6 shadow-md-3'}`}
          >
            {/* Metadata Header */}
            <div className="mb-6">
              <div className="mb-2 flex gap-2">
                {recipe.protein && (
                  <span className="rounded-md-full bg-md-sys-color-secondary-container px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-md-sys-color-on-secondary-container">
                    {recipe.protein}
                  </span>
                )}
                {recipe.difficulty && (
                  <span className="rounded-md-full bg-md-sys-color-surface-variant px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-md-sys-color-on-surface-variant">
                    {recipe.difficulty}
                  </span>
                )}
              </div>
              <h1 className="mb-2 font-display text-3xl font-bold leading-tight text-md-sys-color-on-surface">
                {recipe.title}
              </h1>

              <div className="border-md-sys-color-outline/20 mt-4 flex gap-4 border-y py-3 text-sm font-medium text-md-sys-color-on-surface-variant">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-md-sys-color-primary" />
                  <span>{recipe.prepTime + recipe.cookTime}m</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-md-sys-color-primary" />
                  <span>{recipe.servings} Servings</span>
                </div>
                <div className="flex items-center gap-1">
                  <Flame className="h-4 w-4 text-md-sys-color-primary" />
                  <span>{recipe.difficulty || 'Easy'}</span>
                </div>
              </div>
            </div>

            {/* Ingredients */}
            <div className="mb-8">
              <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold text-md-sys-color-on-surface">
                Ingredients
                <span className="font-body text-sm font-normal text-md-sys-color-on-surface-variant">
                  ({recipe.ingredients?.length || 0})
                </span>
              </h2>
              <div
                className={`rounded-md-l border border-dashed border-md-sys-color-outline p-2 ${cookingMode ? 'bg-md-sys-color-tertiary-container/20 border-md-sys-color-tertiary-container' : 'bg-md-sys-color-surface-variant/20'}`}
              >
                {recipe.ingredients.map((ing, idx) => {
                  const prep = ing.prep ? `, ${ing.prep}` : ''
                  const text = `${ing.amount} ${ing.name}${prep}`
                  return (
                    <CheckableItem
                      key={idx}
                      text={text}
                      isChecked={checkedIngredients[idx]}
                      onToggle={() => setCheckedIngredients((p) => ({ ...p, [idx]: !p[idx] }))}
                    />
                  )
                })}
              </div>
            </div>

            {/* Steps */}
            <div className="mb-8">
              <h2 className="mb-4 font-display text-xl font-bold text-md-sys-color-on-surface">
                Instructions
              </h2>
              <div className="space-y-4">
                {recipe.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border font-bold transition-colors ${checkedSteps[idx] ? 'border-md-sys-color-primary bg-md-sys-color-primary text-md-sys-color-on-primary' : 'border-md-sys-color-outline bg-md-sys-color-surface text-md-sys-color-on-surface'}`}
                    >
                      {checkedSteps[idx] ? <Check className="h-4 w-4" /> : idx + 1}
                    </div>
                    <button
                      onClick={() => setCheckedSteps((p) => ({ ...p, [idx]: !p[idx] }))}
                      className={`text-left font-body text-md-sys-color-on-surface transition-opacity ${cookingMode ? 'text-lg leading-relaxed' : ''} ${checkedSteps[idx] ? 'line-through opacity-50' : ''}`}
                    >
                      {step}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {recipe.notes && (
              <div className="mb-8 rounded-md-l border-l-4 border-md-sys-color-tertiary bg-md-sys-color-tertiary-container p-4 text-sm text-md-sys-color-on-tertiary-container">
                <strong>Chef's Notes:</strong>
                <p className="mt-1">{recipe.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
