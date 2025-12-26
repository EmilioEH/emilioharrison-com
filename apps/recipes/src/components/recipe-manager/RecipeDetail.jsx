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
  ChevronRight,
  ChevronLeft,
  Star,
  RotateCcw,
  Play,
  CheckCircle2,
  Heart,
} from 'lucide-react'
import { StarRating } from '../ui/StarRating'

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

const DetailHeader = ({
  recipe,
  onClose,
  onAction,
  cookingMode,
  setCookingMode,
  onToggleThisWeek,
  cookingStage,
  setCookingStage,
}) => (
  <div
    className={`sticky top-0 z-20 flex items-center justify-between border-b border-md-sys-color-outline bg-md-sys-color-surface px-4 py-4 transition-all ${cookingMode ? 'py-2' : ''}`}
  >
    <div className="flex items-center gap-2">
      <button
        onClick={cookingStage !== 'idle' ? () => setCookingStage('idle') : onClose}
        className="hover:bg-md-sys-color-on-surface/[0.08] rounded-full p-2 transition"
        aria-label={cookingStage !== 'idle' ? 'Back to Overview' : 'Back to Library'}
        title={cookingStage !== 'idle' ? 'Back to Overview' : 'Back to Library'}
      >
        <ArrowLeft className="h-6 w-6 text-md-sys-color-on-surface" />
      </button>
      {cookingStage !== 'idle' && (
        <span className="font-display text-xs font-medium uppercase tracking-wider text-md-sys-color-primary">
          {cookingStage === 'pre' && 'Pre-Cooking'}
          {cookingStage === 'during' && 'Cooking'}
          {cookingStage === 'post' && 'Review'}
        </span>
      )}
    </div>

    <div className="flex gap-2">
      <button
        onClick={() => {
          if (!cookingMode) {
            setCookingStage('pre')
          }
          setCookingMode(!cookingMode)
        }}
        className={`rounded-full border p-2 transition ${cookingMode ? 'border-md-sys-color-primary bg-md-sys-color-primary-container text-md-sys-color-on-primary-container' : 'border-transparent text-md-sys-color-on-surface-variant hover:text-md-sys-color-on-surface'}`}
        title="Cooking Mode (Keep Screen On)"
      >
        {cookingMode ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
      </button>

      <button
        onClick={() => onAction('toggleFavorite')}
        className={`rounded-full border p-2 transition ${recipe.isFavorite ? 'border-red-200 bg-red-50 text-red-500' : 'border-transparent text-md-sys-color-on-surface-variant hover:text-red-500'}`}
        title={recipe.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
      >
        <Heart className={`h-5 w-5 ${recipe.isFavorite ? 'fill-red-500' : ''}`} />
      </button>

      <div className="group relative">
        <button
          className="hover:bg-md-sys-color-on-surface/[0.08] rounded-full p-2 text-md-sys-color-on-surface-variant"
          aria-label="More Options"
        >
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

// const StarRating = ({ rating, setRating }) => (
//   <div className="flex gap-2">
//     {[1, 2, 3, 4, 5].map((s) => (
//       <button
//         key={s}
//         onClick={() => setRating(s)}
//         className="p-1 transition-transform active:scale-90"
//       >
//         <Star
//           className={`h-8 w-8 ${s <= rating ? 'fill-md-sys-color-primary text-md-sys-color-primary' : 'text-md-sys-color-outline'}`}
//         />
//       </button>
//     ))}
//   </div>
// )

export const RecipeDetail = ({ recipe, onClose, onUpdate, onDelete, onToggleThisWeek }) => {
  const [cookingMode, setCookingMode] = useState(false)
  const [cookingStage, setCookingStage] = useState('idle') // 'idle', 'pre', 'during', 'post'
  const [currentStepIdx, setCurrentStepIdx] = useState(0)

  // Feedback State
  const [rating, setRating] = useState(recipe.rating || 0)
  const [userNotes, setUserNotes] = useState(recipe.userNotes || '')
  const [wouldMakeAgain, setWouldMakeAgain] = useState(recipe.wouldMakeAgain ?? true)

  const [checkedIngredients, setCheckedIngredients] = useState({})
  const [checkedSteps, setCheckedSteps] = useState({})

  useWakeLock(cookingMode)

  // No longer needed: logic moved to stage transitions

  const startCooking = () => {
    const firstUnchecked = recipe.steps.findIndex((_, idx) => !checkedSteps[idx])
    setCurrentStepIdx(firstUnchecked !== -1 ? firstUnchecked : 0)
    setCookingStage('during')
  }

  const handleAction = (action) => {
    if (action === 'delete') {
      if (confirm('Are you certain you want to delete this recipe?')) {
        onDelete(recipe.id)
      }
    } else if (action === 'edit') {
      onUpdate({ ...recipe }, 'edit')
    } else if (action === 'addToWeek') {
      onUpdate({ ...recipe, thisWeek: !recipe.thisWeek }, 'save')
    } else if (action === 'move') {
      onUpdate({ ...recipe }, 'edit') // Simply go to edit to change protein
    } else if (action === 'toggleFavorite') {
      onUpdate({ ...recipe, isFavorite: !recipe.isFavorite }, 'save')
    } else if (action === 'rate') {
      // action is actually the rating value here if passed directly,
      // but let's handle it via a separate handler or modifying this one.
      // Retaining this block just in case, but will use direct onUpdate in render.
    }
  }

  const handleRate = (rating) => {
    onUpdate({ ...recipe, rating }, 'save')
  }

  const handleFinishCooking = () => {
    onUpdate(
      {
        ...recipe,
        rating,
        userNotes,
        wouldMakeAgain,
        lastCooked: new Date().toISOString(),
      },
      'save',
    )
    setCookingStage('idle')
    setCookingMode(false)
    onClose()
  }

  const renderContent = () => {
    if (cookingStage === 'pre') {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 p-6">
          <header className="text-center">
            <h2 className="font-display text-2xl font-bold text-md-sys-color-on-surface">
              Mise en Place
            </h2>
            <p className="font-body text-md-sys-color-on-surface-variant">
              Gather your ingredients
            </p>
          </header>

          <div className="bg-md-sys-color-surface-variant/10 rounded-md-xl border border-md-sys-color-outline p-4">
            <h3 className="mb-4 font-display text-xs font-bold uppercase tracking-widest text-md-sys-color-primary">
              Ingredients ({recipe.ingredients.length})
            </h3>
            <div className="space-y-1">
              {recipe.ingredients.map((ing, idx) => {
                const prep = ing.prep ? `, ${ing.prep}` : ''
                const text = `${ing.amount} ${ing.name}${prep}`
                return (
                  <CheckableItem
                    key={idx}
                    text={text}
                    isChecked={checkedIngredients[idx]}
                    onToggle={() => setCheckedIngredients((p) => ({ ...p, [idx]: !p[idx] }))}
                    largeText={true}
                  />
                )
              })}
            </div>
          </div>

          <button
            onClick={startCooking}
            className="flex w-full items-center justify-center gap-3 rounded-md-full bg-md-sys-color-primary py-4 font-display text-xl font-bold text-md-sys-color-on-primary shadow-md-2"
          >
            <Play className="h-6 w-6 fill-current" />
            Start Cooking
          </button>
        </div>
      )
    }

    if (cookingStage === 'during') {
      const step = recipe.steps[currentStepIdx]
      const progress = ((currentStepIdx + 1) / recipe.steps.length) * 100

      return (
        <div className="animate-in fade-in zoom-in-95 flex h-full flex-col p-6">
          <div className="mb-8 h-2 overflow-hidden rounded-full bg-md-sys-color-surface-variant">
            <div
              className="h-full bg-md-sys-color-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex flex-1 flex-col justify-center text-center">
            <span className="mb-4 font-display text-sm font-medium uppercase tracking-widest text-md-sys-color-primary">
              Step {currentStepIdx + 1} of {recipe.steps.length}
            </span>
            <div className="mb-8 flex min-h-[12rem] items-center justify-center px-4">
              <p className="font-display text-2xl font-bold leading-tight text-md-sys-color-on-surface md:text-3xl">
                {step}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => {
                setCheckedSteps((p) => ({ ...p, [currentStepIdx]: true }))
                if (currentStepIdx < recipe.steps.length - 1) {
                  setCurrentStepIdx(currentStepIdx + 1)
                } else {
                  setCookingStage('post')
                }
              }}
              className="flex w-full items-center justify-center gap-3 rounded-md-full bg-md-sys-color-primary py-6 font-display text-2xl font-bold text-md-sys-color-on-primary shadow-md-3 transition-transform active:scale-95"
            >
              <Check className="h-8 w-8 stroke-[3]" />
              {currentStepIdx < recipe.steps.length - 1 ? 'Next Step' : 'Finish Cooking'}
            </button>

            <div className="flex gap-4">
              <button
                disabled={currentStepIdx === 0}
                onClick={() => setCurrentStepIdx(currentStepIdx - 1)}
                className="flex flex-1 items-center justify-center gap-2 rounded-md-full border border-md-sys-color-outline py-3 font-medium text-md-sys-color-on-surface-variant disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" /> Previous
              </button>
              <button
                onClick={() => setCookingStage('pre')}
                className="flex items-center justify-center gap-2 rounded-md-full border border-md-sys-color-outline p-3 text-md-sys-color-on-surface-variant"
                title="View Ingredients"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (cookingStage === 'post') {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-8 space-y-8 p-6">
          <header className="text-center">
            <h2 className="font-display text-4xl font-bold italic text-md-sys-color-primary">
              Chef's Kiss!
            </h2>
            <p className="mt-2 font-body text-lg text-md-sys-color-on-surface-variant">
              How did it turn out?
            </p>
          </header>

          <div className="space-y-6 rounded-md-xl border border-md-sys-color-outline bg-md-sys-color-surface p-6 shadow-md-1">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-md-sys-color-on-surface-variant">
                Rating
              </span>
              <StarRating rating={rating} onRate={setRating} />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="userNotes"
                className="text-xs font-bold uppercase tracking-widest text-md-sys-color-on-surface-variant"
              >
                Cooking Notes
              </label>
              <textarea
                id="userNotes"
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="Added a pinch more salt next time..."
                className="bg-md-sys-color-surface-variant/20 h-32 w-full rounded-md-m border border-md-sys-color-outline p-4 font-body text-lg outline-none focus:ring-2 focus:ring-md-sys-color-primary"
              />
            </div>

            <button
              onClick={() => setWouldMakeAgain(!wouldMakeAgain)}
              className={`flex w-full items-center justify-between rounded-md-m border p-4 transition-colors ${wouldMakeAgain ? 'border-md-sys-color-primary bg-md-sys-color-primary-container text-md-sys-color-on-primary-container' : 'border-md-sys-color-outline bg-md-sys-color-surface'}`}
            >
              <span className="font-bold">Would make again?</span>
              {wouldMakeAgain ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : (
                <div className="h-6 w-6 rounded-full border-2 border-current" />
              )}
            </button>
          </div>

          <button
            onClick={handleFinishCooking}
            className="flex w-full items-center justify-center gap-3 rounded-md-full bg-md-sys-color-primary py-4 font-display text-xl font-bold text-md-sys-color-on-primary shadow-md-2"
          >
            Save Review & Finish
          </button>
        </div>
      )
    }

    return (
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
                {recipe.updatedAt && (
                  <div className="flex items-center gap-1 sm:ml-auto" title="Last Modified">
                    <span className="text-xs opacity-70">
                      Updated {new Date(recipe.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats or Previous Experience */}
            {(recipe.rating || recipe.userNotes) && (
              <div className="bg-md-sys-color-tertiary-container/30 border-md-sys-color-tertiary/20 mb-8 rounded-md-xl border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${s <= (recipe.rating || 0) ? 'fill-md-sys-color-tertiary text-md-sys-color-tertiary' : 'text-md-sys-color-outline'}`}
                      />
                    ))}
                  </div>
                  {recipe.lastCooked && (
                    <span className="text-[10px] font-medium uppercase tracking-wider opacity-60">
                      Last cooked: {new Date(recipe.lastCooked).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {recipe.userNotes && (
                  <p className="font-body text-sm italic text-md-sys-color-on-tertiary-container">
                    "{recipe.userNotes}"
                  </p>
                )}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between">
              <StarRating rating={recipe.rating || 0} onRate={handleRate} size="lg" />
              {/* Placeholder for future specific rating text or count */}
            </div>

            {/* Ingredients */}
            <div className="mb-8">
              <h2 className="mb-4 flex items-center justify-between font-display text-xl font-bold text-md-sys-color-on-surface">
                <div className="flex items-center gap-2">
                  Ingredients
                  <span className="font-body text-sm font-normal text-md-sys-color-on-surface-variant">
                    ({recipe.ingredients?.length || 0})
                  </span>
                </div>
                <button
                  onClick={() => setCookingStage('pre')}
                  className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-md-sys-color-primary hover:underline"
                >
                  Start Prepping <ChevronRight className="h-3 w-3" />
                </button>
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
              <h2 className="mb-4 flex items-center justify-between font-display text-xl font-bold text-md-sys-color-on-surface">
                Instructions
                <button
                  onClick={startCooking}
                  className="bg-md-sys-color-primary/10 hover:bg-md-sys-color-primary/20 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest text-md-sys-color-primary"
                >
                  Cooking Mode <Play className="h-3 w-3 fill-current" />
                </button>
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
    )
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
        cookingStage={cookingStage}
        setCookingStage={setCookingStage}
      />

      {renderContent()}
    </div>
  )
}
