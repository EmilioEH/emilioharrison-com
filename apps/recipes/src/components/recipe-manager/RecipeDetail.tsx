import React, { useState, useEffect } from 'react'
// Imports cleaned up
import { DetailHeader, type CookingStage, type HeaderAction } from '../recipe-details/DetailHeader'
import { MiseEnPlace } from '../recipe-details/MiseEnPlace'
import { CookingMode } from '../recipe-details/CookingMode'
import { ReviewMode } from '../recipe-details/ReviewMode'
import { OverviewMode } from '../recipe-details/OverviewMode'
import type { Recipe } from '../../lib/types'

// Wake Lock Helper
const useWakeLock = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return

    let wakeLock: WakeLockSentinel | null = null
    const requestLock = async () => {
      try {
        wakeLock = await navigator.wakeLock.request('screen')
      } catch (err) {
        console.warn('Wake Lock error:', err)
      }
    }
    requestLock()

    return () => {
      wakeLock?.release()
    }
  }, [enabled])
}

interface RecipeDetailProps {
  recipe: Recipe
  onClose: () => void
  onUpdate: (recipe: Recipe, action: 'save' | 'edit') => void
  onDelete: (id: string) => void
  onToggleThisWeek: (id?: string) => void
  onToggleFavorite?: () => void
}

export const RecipeDetail: React.FC<RecipeDetailProps> = ({
  recipe,
  onClose,
  onUpdate,
  onDelete,
  onToggleThisWeek,
  onToggleFavorite,
}) => {
  const [cookingMode, setCookingMode] = useState(false)
  const [cookingStage, setCookingStage] = useState<CookingStage>('idle') // 'idle', 'pre', 'during', 'post'
  const [currentStepIdx, setCurrentStepIdx] = useState(0)

  // Feedback State
  const [rating, setRating] = useState(recipe.rating || 0)
  const [userNotes, setUserNotes] = useState(recipe.userNotes || '')
  const [wouldMakeAgain, setWouldMakeAgain] = useState(recipe.wouldMakeAgain ?? true)
  const [finishedImage, setFinishedImage] = useState<string | null>(recipe.finishedImage || null)

  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({})
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({})

  useWakeLock(cookingMode)

  // No longer needed: logic moved to stage transitions

  const startCooking = () => {
    const firstUnchecked = recipe.steps.findIndex((_, idx) => !checkedSteps[idx])
    setCurrentStepIdx(firstUnchecked !== -1 ? firstUnchecked : 0)
    setCookingStage('during')
  }

  const handleAction = (action: HeaderAction) => {
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
      // onUpdate({ ...recipe, isFavorite: !recipe.isFavorite }, 'save')
      if (onToggleFavorite) onToggleFavorite()
    } else if (action === 'rate') {
      // action is actually the rating value here if passed directly,
      // but let's handle it via a separate handler or modifying this one.
      // Retaining this block just in case, but will use direct onUpdate in render.
    }
  }

  const handleRate = (rating: number) => {
    onUpdate({ ...recipe, rating }, 'save')
  }

  const handleFinishCooking = () => {
    onUpdate(
      {
        ...recipe,
        rating,
        userNotes,
        wouldMakeAgain,
        finishedImage: finishedImage || undefined,
        lastCooked: new Date().toISOString(),
      },
      'save',
    )
    setCookingStage('idle')
    setCookingMode(false)
    onClose()
  }

  const handleFinishedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      // Optimistic preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setFinishedImage(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Upload to R2
      try {
        const formData = new FormData()
        formData.append('file', file)

        const baseUrl = import.meta.env.BASE_URL.endsWith('/')
          ? import.meta.env.BASE_URL
          : `${import.meta.env.BASE_URL}/`

        const res = await fetch(`${baseUrl}api/uploads`, {
          method: 'POST',
          body: formData,
        })

        if (res.ok) {
          const { key } = await res.json()
          const publicUrl = `${baseUrl}api/uploads/${key}`
          setFinishedImage(publicUrl)
        } else {
          console.error('Failed to upload finished image')
        }
      } catch (err) {
        console.error('Upload error', err)
      }
    }
  }

  const handleSaveCost = (cost: number) => {
    if (recipe.estimatedCost !== cost) {
      onUpdate({ ...recipe, estimatedCost: cost }, 'save')
    }
  }

  const renderContent = () => {
    switch (cookingStage) {
      case 'pre':
        return (
          <MiseEnPlace
            recipe={recipe}
            checkedIngredients={checkedIngredients}
            setCheckedIngredients={setCheckedIngredients}
            startCooking={startCooking}
          />
        )
      case 'during':
        return (
          <CookingMode
            recipe={recipe}
            currentStepIdx={currentStepIdx}
            setCurrentStepIdx={setCurrentStepIdx}
            checkedSteps={checkedSteps}
            setCheckedSteps={setCheckedSteps}
            setCookingStage={setCookingStage}
          />
        )
      case 'post':
        return (
          <ReviewMode
            rating={rating}
            setRating={setRating}
            userNotes={userNotes}
            setUserNotes={setUserNotes}
            wouldMakeAgain={wouldMakeAgain}
            setWouldMakeAgain={setWouldMakeAgain}
            finishedImage={finishedImage}
            setFinishedImage={setFinishedImage}
            handleFinishedImageUpload={handleFinishedImageUpload}
            handleFinishCooking={handleFinishCooking}
          />
        )
      default:
        return (
          <OverviewMode
            recipe={recipe}
            cookingMode={cookingMode}
            checkedIngredients={checkedIngredients}
            setCheckedIngredients={setCheckedIngredients}
            checkedSteps={checkedSteps}
            setCheckedSteps={setCheckedSteps}
            setCookingStage={setCookingStage}
            handleRate={handleRate}
            startCooking={startCooking}
            onSaveCost={handleSaveCost}
          />
        )
    }
  }

  return (
    <div
      className={`animate-in slide-in-from-bottom-10 fixed inset-0 z-50 flex flex-col bg-card ${cookingMode ? 'safe-area-pt' : ''}`}
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

      <div className="flex-1 overflow-y-auto">{renderContent()}</div>
    </div>
  )
}
