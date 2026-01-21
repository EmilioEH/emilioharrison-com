import React, { useState } from 'react'
import { useStore } from '@nanostores/react'
import { $cookingSession, cookingSessionActions } from '../../stores/cookingSession'
import { CookingHeader } from './CookingHeader'
import { Stack } from '../ui/layout'
import { CookingStepView } from './CookingStepView'
import { ExitConfirmation } from './ExitConfirmation'
import { CookingIngredientsOverlay } from './CookingIngredientsOverlay'
import { CookingInstructionsOverlay } from './CookingInstructionsOverlay'
import { IngredientsPanel } from './IngredientsPanel'
import { CookingTimeline } from './CookingTimeline'
import { ActiveTimerDisplay } from './ActiveTimerDisplay'
import { CookingReview } from './CookingReview'

interface CookingContainerProps {
  onClose: () => void
}

export const CookingContainer: React.FC<CookingContainerProps> = ({ onClose }) => {
  const session = useStore($cookingSession)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [showIngredients, setShowIngredients] = useState(false)
  const [showNavigator, setShowNavigator] = useState(false)

  // Local state to track if we are in review mode
  // The store keeps "isActive" true until we explicitly close everything
  const [isReviewing, setIsReviewing] = useState(false)

  // Track navigation direction for animations
  const [direction, setDirection] = useState(0)
  const prevStepRef = React.useRef(session.currentStepIdx)

  React.useEffect(() => {
    if (session.currentStepIdx > prevStepRef.current) {
      setDirection(1)
    } else if (session.currentStepIdx < prevStepRef.current) {
      setDirection(-1)
    }
    prevStepRef.current = session.currentStepIdx
  }, [session.currentStepIdx])

  if (!session.isActive || !session.recipe) return null

  const handleExitConfirm = () => {
    cookingSessionActions.endSession()
    setShowExitConfirm(false)
    onClose()
  }

  const handleFinishCooking = () => {
    setIsReviewing(true)
  }

  const handleReviewComplete = async (data: {
    difficulty: number
    rating: number
    finishedPhoto?: string
    ingredientNotes: Record<number, string>
    stepNotes: Record<number, string>
    ingredientEdits: Record<number, string>
    stepEdits: Record<number, string>
  }) => {
    try {
      const baseUrl = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`
      if (!session.recipe) return
      const recipeId = session.recipe.id

      // 1. Save Notes & Difficulty (Family Data)
      await fetch(`${baseUrl}api/recipes/${recipeId}/family-data`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          difficulty: data.difficulty,
          ingredientNotes: data.ingredientNotes,
          stepNotes: data.stepNotes,
        }),
      })

      // 2. Save Rating (NEW)
      await fetch(`${baseUrl}api/recipes/${recipeId}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: data.rating }),
      })

      // 3. Upload Finished Photo (NEW)
      if (data.finishedPhoto) {
        // Process image
        const { processImage } = await import('../../lib/image-optimization')
        const blob = await fetch(data.finishedPhoto).then((r) => r.blob())
        const file = new File([blob], 'finished-dish.jpg', { type: 'image/jpeg' })
        const optimizedFile = await processImage(file)

        // Upload to storage
        const formData = new FormData()
        formData.append('file', optimizedFile)
        const uploadRes = await fetch(`${baseUrl}api/uploads`, {
          method: 'POST',
          body: formData,
        })
        const { key } = await uploadRes.json()
        const uploadedUrl = `${baseUrl}api/uploads/${key}`

        // Add to recipe images array
        const currentImages = session.recipe.images || []
        await fetch(`${baseUrl}api/recipes/${recipeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: [uploadedUrl, ...currentImages],
          }),
        })
      }

      // 4. Save Recipe Edits (If any)
      const hasIngredientEdits = Object.keys(data.ingredientEdits).length > 0
      const hasStepEdits = Object.keys(data.stepEdits).length > 0

      if (hasIngredientEdits || hasStepEdits) {
        // Construct new recipe data
        const currentIngredients = [...session.recipe.ingredients]
        const currentSteps = [...session.recipe.steps]

        // Apply Ingredient Edits
        Object.entries(data.ingredientEdits).forEach(([key, value]) => {
          const idx = parseInt(key)
          if (idx >= 0 && idx < currentIngredients.length) {
            // Simple parsing logic: Split first number/fraction as amount, rest as name
            // Regex: Start with digits/dots/slashes/spaces (amount), capture rest (name)
            const match = value.match(/^([\d./\s]+)(.*)$/)
            if (match) {
              currentIngredients[idx] = {
                ...currentIngredients[idx],
                amount: match[1].trim(),
                name: match[2].trim(),
              }
            } else {
              // Fallback: entire string as name, empty amount? Or keep old amount?
              // Let's assume user edited the whole line.
              // We will put everything in name and leave amount empty for now,
              // logic can be improved with a better parser later.
              currentIngredients[idx] = {
                ...currentIngredients[idx],
                amount: '',
                name: value.trim(),
              }
            }
          }
        })

        // Apply Step Edits
        Object.entries(data.stepEdits).forEach(([key, value]) => {
          const idx = parseInt(key)
          if (idx >= 0 && idx < currentSteps.length) {
            currentSteps[idx] = value
          }
        })

        await fetch(`${baseUrl}api/recipes/${recipeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ingredients: currentIngredients,
            steps: currentSteps,
          }),
        })
      }
    } catch (error) {
      console.error('Failed to save review data:', error)
    } finally {
      cookingSessionActions.endSession()
      // Removed onClose() to stay on the recipe overview after finishing.
      // Removed refresh to avoid test flakiness and improve UX. State should update via store.
    }
  }

  const handleSkip = () => {
    cookingSessionActions.endSession()
    // Removed onClose() to stay on the recipe overview after finishing.
    // Removed refresh to avoid test flakiness and improve UX. State should update via store.
  }

  if (isReviewing) {
    return <CookingReview onComplete={handleReviewComplete} onSkip={handleSkip} />
  }

  return (
    <Stack
      spacing="none"
      className="fixed inset-0 z-50 bg-background duration-300 animate-in slide-in-from-bottom"
    >
      {/* Header */}
      <CookingHeader
        session={session}
        title={session.recipe.title}
        onExit={() => setShowExitConfirm(true)}
        onMinimize={() => onClose()}
        onShowIngredients={() => setShowIngredients(true)}
        onShowNavigator={() => setShowNavigator(true)}
      />

      {/* Main Content Area - Responsive Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Timeline (Desktop Only) */}
        <aside
          className="hidden h-full flex-col border-r border-border md:flex"
          data-testid="cooking-timeline-sidebar"
        >
          <CookingTimeline
            currentStep={session.currentStepIdx + 1}
            totalSteps={session.recipe.steps.length + 1}
            onStepClick={(idx) => cookingSessionActions.goToStep(idx)}
          />
        </aside>

        {/* Center - Step View */}
        <main className="relative flex flex-1 flex-col overflow-hidden">
          {/* Mobile Timeline (Top) */}
          <div className="border-b border-border md:hidden">
            <CookingTimeline
              currentStep={session.currentStepIdx + 1}
              totalSteps={session.recipe.steps.length + 1}
              onStepClick={(idx) => cookingSessionActions.goToStep(idx)}
            />
          </div>

          <ActiveTimerDisplay />

          <CookingStepView
            recipe={session.recipe}
            onFinish={handleFinishCooking}
            direction={direction}
          />
        </main>

        {/* Right Sidebar - Ingredients (Desktop Only) */}
        <aside
          className="hidden h-full w-80 flex-col border-l border-border md:flex lg:w-96"
          data-testid="cooking-ingredients-sidebar"
        >
          <IngredientsPanel />
        </aside>
      </div>

      {/* Overlays */}
      <ExitConfirmation
        isOpen={showExitConfirm}
        onCancel={() => setShowExitConfirm(false)}
        onConfirm={handleExitConfirm}
        stepNumber={session.currentStepIdx + 1}
        totalSteps={session.recipe.steps.length + 1}
      />

      {/* Mobile Ingredients Overlay */}
      <CookingIngredientsOverlay
        isOpen={showIngredients}
        onClose={() => setShowIngredients(false)}
      />

      {/* Instructions Overlay */}
      <CookingInstructionsOverlay
        isOpen={showNavigator}
        onClose={() => setShowNavigator(false)}
        recipe={session.recipe}
        currentStepIdx={session.currentStepIdx}
        onStepSelect={(idx) => cookingSessionActions.goToStep(idx)}
      />
    </Stack>
  )
}
