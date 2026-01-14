import React from 'react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onAction('toggleFavorite')}
        className={`h-11 w-11 rounded-full ${recipe.isFavorite ? 'bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600' : 'text-muted-foreground hover:text-red-500'}`}
        aria-label={recipe.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        title={recipe.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
      >
        <Heart className={`h-6 w-6 ${recipe.isFavorite ? 'fill-red-500' : ''}`} />
      </Button>

      <DetailHeaderActions
        onAction={onAction}
        onToggleThisWeek={onToggleThisWeek}
        isThisWeek={recipe.thisWeek}
      />
    </Inline>
  </Inline>
)
