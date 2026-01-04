import React, { useRef, useEffect } from 'react'
import { X, CheckCircle, Circle, Map } from 'lucide-react'
import { useStore } from '@nanostores/react'
import { $cookingSession, cookingSessionActions } from '../../stores/cookingSession'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface StepNavigatorProps {
  isOpen: boolean
  onClose: () => void
}

export const StepNavigator: React.FC<StepNavigatorProps> = ({ isOpen, onClose }) => {
  const session = useStore($cookingSession)
  const recipe = session.recipe
  const activeStepRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen && activeStepRef.current) {
      // Scroll active step into view
      activeStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isOpen])

  if (!recipe) return null

  const handleJumpToStep = (idx: number) => {
    cookingSessionActions.goToStep(idx)
    onClose()
  }

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
            aria-label="Close steps"
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
                <Map className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-bold">Steps</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-2">
                {recipe.steps.map((step, idx) => {
                  const isActive = session.currentStepIdx === idx
                  const isCompleted = session.completedSteps.includes(idx)

                  return (
                    <button
                      key={idx}
                      ref={isActive ? activeStepRef : null}
                      onClick={() => handleJumpToStep(idx)}
                      className={`flex items-start gap-4 rounded-xl border p-3 text-left transition-all ${
                        isActive
                          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                          : 'border-border bg-card hover:bg-accent'
                      }`}
                    >
                      <div
                        className={`mt-0.5 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5 fill-green-500/10 text-green-600" />
                        ) : isActive ? (
                          <Circle className="h-5 w-5 fill-current" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="mb-0.5 text-sm font-bold text-muted-foreground">
                          Step {idx + 1}
                        </div>
                        <div
                          className={`line-clamp-2 font-medium leading-snug ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}
                        >
                          {step}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="p-4 pt-10 md:pt-4"></div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
