import React from 'react'
import { X, ChefHat } from 'lucide-react'
import { useStore } from '@nanostores/react'
import { $cookingSession, cookingSessionActions } from '../../stores/cookingSession'
import { CheckableItem } from '../recipe-details/CheckableItem'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface CookingIngredientsOverlayProps {
  isOpen: boolean
  onClose: () => void
}

export const CookingIngredientsOverlay: React.FC<CookingIngredientsOverlayProps> = ({
  isOpen,
  onClose,
}) => {
  const session = useStore($cookingSession)
  const recipe = session.recipe

  if (!recipe) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            role="button"
            tabIndex={0}
            aria-label="Close overlay"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onClose()
            }}
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-3xl bg-background shadow-2xl md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-bold">Ingredients</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid gap-2">
                {recipe.ingredients.map((ing, idx) => {
                  const prep = ing.prep ? `, ${ing.prep}` : ''
                  const text = `${ing.amount} ${ing.name}${prep}`
                  const isChecked = session.checkedIngredients.includes(idx)

                  return (
                    <CheckableItem
                      key={idx}
                      text={text}
                      isChecked={isChecked}
                      onToggle={() => cookingSessionActions.toggleIngredient(idx)}
                    />
                  )
                })}
              </div>
            </div>

            {/* Footer (Optional, mostly for margin) */}
            <div className="p-4 pt-10 md:pt-4"></div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
