import React from 'react'
import { useStore } from '@nanostores/react'
import { Menu, X, Settings, MessageSquare, Info } from 'lucide-react'
import { burgerMenuOpen, closeBurgerMenu, openBurgerMenu } from '../../lib/burgerMenuStore'
import { openFeedbackModal } from '../../lib/feedbackStore'

const GlobalBurgerMenu = () => {
  const isOpen = useStore(burgerMenuOpen)

  const handleSettings = () => {
    closeBurgerMenu()
    // Navigate to settings - dispatch custom event that RecipeManager listens to
    window.dispatchEvent(new CustomEvent('navigate-to-settings'))
  }

  const handleFeedback = () => {
    closeBurgerMenu()
    openFeedbackModal()
  }

  return (
    <>
      {/* Floating Trigger Button - Always visible in top-right corner */}
      <button
        onClick={openBurgerMenu}
        className="fixed right-4 top-4 z-40 rounded-full bg-md-sys-color-surface p-3 shadow-md-2 transition-all hover:bg-md-sys-color-surface-variant"
        aria-label="Open Menu"
      >
        <Menu className="h-6 w-6 text-md-sys-color-on-surface" />
      </button>

      {/* Overlay + Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Close menu"
            className="animate-in fade-in absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={closeBurgerMenu}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                closeBurgerMenu()
              }
            }}
          />

          {/* Drawer - slides in from right */}
          <div className="animate-in slide-in-from-right relative h-full w-72 max-w-[85vw] bg-md-sys-color-surface shadow-md-3 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-md-sys-color-outline px-4 py-4">
              <span className="font-display text-lg font-bold text-md-sys-color-on-surface">
                Menu
              </span>
              <button
                onClick={closeBurgerMenu}
                className="rounded-full p-2 hover:bg-md-sys-color-surface-variant"
                aria-label="Close Menu"
              >
                <X className="h-5 w-5 text-md-sys-color-on-surface" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="p-2" role="menu">
              <button
                role="menuitem"
                onClick={handleSettings}
                className="flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors hover:bg-md-sys-color-surface-variant"
              >
                <Settings className="h-5 w-5 text-md-sys-color-on-surface-variant" />
                <span className="font-medium text-md-sys-color-on-surface">Settings</span>
              </button>

              <button
                role="menuitem"
                onClick={handleFeedback}
                className="flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors hover:bg-md-sys-color-surface-variant"
                aria-label="Send Feedback"
              >
                <MessageSquare className="h-5 w-5 text-md-sys-color-on-surface-variant" />
                <span className="font-medium text-md-sys-color-on-surface">Send Feedback</span>
              </button>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-md-sys-color-outline p-4">
              <div className="flex items-center gap-2 text-xs text-md-sys-color-on-surface-variant">
                <Info className="h-4 w-4" />
                <span>Chefboard v1.0</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default GlobalBurgerMenu
