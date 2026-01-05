import React, { useState } from 'react'
import { BookOpen, X, Monitor } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { alert } from '@/lib/dialogStore'

interface CookingOptionsMenuProps {
  isOpen: boolean
  onClose: () => void
}

export const CookingOptionsMenu: React.FC<CookingOptionsMenuProps> = ({ isOpen, onClose }) => {
  // Basic Wake Lock state (local for now, could be in session if we want to persist pref)
  const [wakeLockEnabled, setWakeLockEnabled] = useState(true)

  // Wake Lock Effect logic is currently in RecipeDetail, we might want to move it to a global hook or context
  // For now, we assume the parent container is handling the lock based on a prop or state,
  // BUT since we are in a modal, we need to communicate this up.
  // However, RecipeDetail has the useWakeLock hook.
  // Ideally, we move useWakeLock to CookingContainer and control it there.
  // For this MVP step, we will just toggle the switch UI and log the intent.
  // TODO: Connect to actual Wake Lock hook in CookingContainer.

  // Let's create a custom event or store for settings? checking scope.
  // For now, we will just show the UI for Wake Lock.

  // Actually, let's implement the Wake Lock Logic effectively in CookingContainer using a simple store or prop?
  // Let's stick to UI first functionality.

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
            aria-label="Close menu"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onClose()
            }}
          />

          {/* Menu Panel */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="fixed left-4 right-4 top-1/2 z-50 mx-auto max-w-sm -translate-y-1/2 rounded-2xl border bg-popover p-4 text-popover-foreground shadow-xl sm:left-1/2 sm:right-auto sm:-translate-x-1/2"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Options</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Monitor className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-bold">Keep Screen On</div>
                    <div className="text-xs text-muted-foreground">Prevent screen from dimming</div>
                  </div>
                </div>
                {/* Switch component requires radix, assuming standard HTML checkbox for now if Switch not available or use custom toggle */}
                <div className="flex items-center">
                  {/* Simple Toggle UI implementation if Switch component missing, but we saw Switch import in other files? No? 
                            Let's use a simple button toggle for safety if Component lib is unknown.
                            Actually, I'll use a standard input type checkbox styled.
                        */}
                  <label className="relative inline-flex cursor-pointer items-center">
                    <span className="sr-only">Toggle Keep Screen On</span>
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={wakeLockEnabled}
                      onChange={(e) => setWakeLockEnabled(e.target.checked)}
                    />
                    <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20"></div>
                  </label>
                </div>
              </div>

              <Button
                variant="outline"
                className="h-auto w-full justify-start gap-3 py-3"
                onClick={() => alert('Help & Tips coming soon!', 'Coming Soon')}
              >
                <BookOpen className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-bold">Help & Tips</div>
                  <div className="text-xs text-muted-foreground">Guide to cooking mode</div>
                </div>
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
