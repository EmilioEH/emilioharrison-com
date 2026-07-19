import React from 'react'
import { Inline } from '@/components/ui/layout'
import type { Recipe } from '../../lib/types'
import { DetailHeaderActions } from './DetailHeaderActions'
import { HeaderBackButton } from './DetailHeaderComponents'
import type { CookingStage, HeaderAction } from './types'

interface DetailHeaderProps {
  recipe: Recipe
  onClose: () => void
  onAction: (action: HeaderAction) => void
  cookingMode: boolean
  setCookingMode: (mode: boolean) => void
  onToggleThisWeek?: () => void
  cookingStage: CookingStage
  setCookingStage: (stage: CookingStage) => void
}

export const DetailHeader: React.FC<DetailHeaderProps> = ({
  recipe,
  onClose,
  onAction,
  cookingMode,
  // setCookingMode, // Unused
  onToggleThisWeek,
  cookingStage,
  setCookingStage,
}) => (
  <Inline
    spacing="none"
    justify="between"
    className={`sticky top-0 z-20 border-b border-border bg-background px-4 py-4 transition-all ${cookingMode ? 'py-2' : ''}`}
  >
    <HeaderBackButton
      cookingStage={cookingStage}
      setCookingStage={setCookingStage}
      onClose={onClose}
    />

    <Inline spacing="sm">
      <DetailHeaderActions
        onAction={onAction}
        onToggleThisWeek={onToggleThisWeek}
        isThisWeek={recipe.thisWeek}
        hasPreviousVersion={!!recipe.previousVersion}
      />
    </Inline>
  </Inline>
)
