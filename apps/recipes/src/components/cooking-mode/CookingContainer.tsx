import React, { useState } from 'react'
import { useStore } from '@nanostores/react'
import { $cookingSession, cookingSessionActions } from '../../stores/cookingSession'
import { CookingHeader } from './CookingHeader'
import { CookingStepView } from './CookingStepView'
import { ExitConfirmation } from './ExitConfirmation'
import { CookingIngredientsOverlay } from './CookingIngredientsOverlay'
import { StepNavigator } from './StepNavigator'
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

  if (!session.isActive || !session.recipe) return null

  const handleExitConfirm = () => {
    cookingSessionActions.endSession()
    setShowExitConfirm(false)
    onClose()
  }

  const handleFinishCooking = () => {
    setIsReviewing(true)
  }

  const handleReviewComplete = (data: { rating: number; notes: string; image: string | null }) => {
    // TODO: Save data to recipe (via API or Store action)
    // For Phase 3 MVP, we'll just log and close
    console.log('Review Data:', data)
    cookingSessionActions.endSession()
    onClose()
  }

  if (isReviewing) {
    return <CookingReview onComplete={handleReviewComplete} />
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background duration-300 animate-in slide-in-from-bottom">
      {/* Header */}
      <CookingHeader
        session={session}
        totalSteps={session.recipe.steps.length}
        onExit={() => setShowExitConfirm(true)}
        onMinimize={() => onClose()}
        onShowIngredients={() => setShowIngredients(true)}
        onShowMenu={() => setShowMenu(true)}
        onShowNavigator={() => setShowNavigator(true)}
      />

      {/* Persistent Condensed Timers */}
      <ActiveTimersHeader />

      {/* Main Content Area */}
      <div className="relative flex-1 overflow-hidden">
        <CookingStepView recipe={session.recipe} onFinish={handleFinishCooking} />
      </div>

      {/* Overlays */}
      <ExitConfirmation
        isOpen={showExitConfirm}
        onCancel={() => setShowExitConfirm(false)}
        onConfirm={handleExitConfirm}
        stepNumber={session.currentStepIdx + 1}
        totalSteps={session.recipe.steps.length}
      />

      <CookingIngredientsOverlay
        isOpen={showIngredients}
        onClose={() => setShowIngredients(false)}
      />

      <StepNavigator isOpen={showNavigator} onClose={() => setShowNavigator(false)} />

      <CookingOptionsMenu isOpen={showMenu} onClose={() => setShowMenu(false)} />
    </div>
  )
}
