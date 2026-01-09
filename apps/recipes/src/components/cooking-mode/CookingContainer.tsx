import React, { useState } from 'react'
import { useStore } from '@nanostores/react'
import { $cookingSession, cookingSessionActions } from '../../stores/cookingSession'
import { CookingHeader } from './CookingHeader'
import { Stack } from '../ui/layout'
import { CookingStepView } from './CookingStepView'
import { ExitConfirmation } from './ExitConfirmation'
import { CookingIngredientsOverlay } from './CookingIngredientsOverlay'
import { IngredientsPanel } from './IngredientsPanel'
import { CookingTimeline } from './CookingTimeline'
import { CookingStepList } from './CookingStepList'
import { CookingOptionsMenu } from './CookingOptionsMenu'

import { ActiveTimersHeader } from './ActiveTimersHeader'
import { CookingReview } from './CookingReview'

interface CookingContainerProps {
  onClose: () => void
}

export const CookingContainer: React.FC<CookingContainerProps> = ({ onClose }) => {
  const session = useStore($cookingSession)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [showIngredients, setShowIngredients] = useState(false)
  const [showNavigator, setShowNavigator] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

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
    rating: number
    notes: string
    image: string | null
  }) => {
    try {
      const baseUrl = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`
      if (!session.recipe) return
      const recipeId = session.recipe.id

      // 1. Save Rating (if changed)
      if (data.rating > 0) {
        await fetch(`${baseUrl}api/recipes/${recipeId}/rating`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating: data.rating }),
        })
      }

      // 2. Save Note (if added)
      if (data.notes.trim()) {
        await fetch(`${baseUrl}api/recipes/${recipeId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: data.notes }),
        })
      }

      // 3. TODO: Save Image / Cooking History (Requires new endpoint)
      if (data.image) {
        console.log('Image saving to be implemented:', data.image)
      }
    } catch (error) {
      console.error('Failed to save review data:', error)
    } finally {
      cookingSessionActions.endSession()
      onClose()
    }
  }

  if (isReviewing) {
    return <CookingReview onComplete={handleReviewComplete} />
  }

  return (
    <Stack
      spacing="none"
      className="fixed inset-0 z-50 bg-background duration-300 animate-in slide-in-from-bottom"
    >
      {/* Header */}
      <CookingHeader
        session={session}
        totalSteps={session.recipe.steps.length + 1}
        onExit={() => setShowExitConfirm(true)}
        onMinimize={() => onClose()}
        onShowIngredients={() => setShowIngredients(true)}
        onShowMenu={() => setShowMenu(true)}
        onShowNavigator={() => setShowNavigator(true)}
        onStepJump={(idx) => cookingSessionActions.goToStep(idx)}
      />

      {/* Persistent Condensed Timers */}
      <ActiveTimersHeader />

      {/* Main Content Area - Responsive Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Timeline (Desktop Only) */}
        <aside className="hidden h-full flex-col border-r border-border md:flex">
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

          <CookingStepView
            recipe={session.recipe}
            onFinish={handleFinishCooking}
            direction={direction}
          />
        </main>

        {/* Right Sidebar - Ingredients (Desktop Only) */}
        <aside className="hidden h-full w-80 flex-col border-l border-border md:flex lg:w-96">
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

      <CookingStepList
        recipe={session.recipe}
        currentStepIdx={session.currentStepIdx}
        isOpen={showNavigator}
        onOpenChange={setShowNavigator}
        onStepSelect={(idx) => cookingSessionActions.goToStep(idx)}
      />

      <CookingOptionsMenu isOpen={showMenu} onClose={() => setShowMenu(false)} />
    </Stack>
  )
}
