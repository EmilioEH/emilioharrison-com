import React from 'react'
import { useStore } from '@nanostores/react'

import {
  X,
  Settings,
  MessageSquare,
  Info,
  LayoutDashboard,
  FolderUp,
  CheckSquare,
  LogOut,
  UsersRound,
  ShieldAlert,
} from 'lucide-react'
import { burgerMenuOpen, closeBurgerMenu } from '../../lib/burgerMenuStore'
import { openFeedbackModal } from '../../lib/feedbackStore'

interface GlobalBurgerMenuProps {
  user?: string
  isAdmin?: boolean
}

const GlobalBurgerMenu: React.FC<GlobalBurgerMenuProps> = (props) => {
  const isOpen = useStore(burgerMenuOpen)

  const handleSettings = () => {
    closeBurgerMenu()
    // Navigate to settings - dispatch custom event that RecipeManager listens to
    window.dispatchEvent(new CustomEvent('navigate-to-settings'))
  }

  const handleBulkImport = () => {
    closeBurgerMenu()
    window.dispatchEvent(new CustomEvent('navigate-to-bulk-import'))
  }

  const handleFeedback = () => {
    closeBurgerMenu()
    openFeedbackModal()
  }

  const handleFeedbackDashboard = () => {
    closeBurgerMenu()
    window.dispatchEvent(new CustomEvent('navigate-to-feedback-dashboard'))
  }

  const handleManageFamily = () => {
    closeBurgerMenu()
    window.dispatchEvent(new CustomEvent('navigate-to-family-settings'))
  }

  return (
    <>
      {/* Floating Trigger Button Removed - Integration moved to RecipeHeader */}

      {/* Overlay + Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          {/* Backdrop */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Close menu"
            className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in"
            onClick={closeBurgerMenu}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                closeBurgerMenu()
              }
            }}
          />

          {/* Drawer - slides in from right */}
          <div className="shadow-md-3 relative h-full w-72 max-w-[85vw] bg-card duration-200 animate-in slide-in-from-right">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <span className="font-display text-lg font-bold text-foreground">Menu</span>
              <button
                onClick={closeBurgerMenu}
                className="hover:bg-card-variant rounded-full p-2"
                aria-label="Close Menu"
              >
                <X className="h-5 w-5 text-foreground" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="p-2" role="menu">
              <button
                role="menuitem"
                onClick={handleBulkImport}
                className="hover:bg-card-variant flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors"
              >
                <FolderUp className="text-foreground-variant h-5 w-5" />
                <span className="font-medium text-foreground">Import Recipes</span>
              </button>

              <button
                role="menuitem"
                onClick={handleSettings}
                className="hover:bg-card-variant flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors"
              >
                <Settings className="text-foreground-variant h-5 w-5" />
                <span className="font-medium text-foreground">Settings</span>
              </button>

              {/* Admin Dashboard Link */}
              {props.isAdmin && (
                <>
                  <button
                    role="menuitem"
                    onClick={handleFeedbackDashboard}
                    className="hover:bg-card-variant flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors"
                  >
                    <LayoutDashboard className="text-foreground-variant h-5 w-5" />
                    <span className="font-medium text-foreground">Feedback Dashboard</span>
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      closeBurgerMenu()
                      window.dispatchEvent(new CustomEvent('navigate-to-admin-dashboard'))
                    }}
                    className="hover:bg-card-variant flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors"
                  >
                    <ShieldAlert className="text-foreground-variant h-5 w-5" />
                    <span className="font-medium text-foreground">Admin Dashboard</span>
                  </button>
                </>
              )}

              <button
                role="menuitem"
                onClick={handleManageFamily}
                className="hover:bg-card-variant flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors"
              >
                <UsersRound className="text-foreground-variant h-5 w-5" />
                <span className="font-medium text-foreground">Manage Family</span>
              </button>

              <button
                role="menuitem"
                onClick={() => {
                  closeBurgerMenu()
                  window.dispatchEvent(new CustomEvent('toggle-selection-mode'))
                }}
                className="hover:bg-card-variant flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors"
              >
                <CheckSquare className="text-foreground-variant h-5 w-5" />
                <span className="font-medium text-foreground">Select Recipes</span>
              </button>

              <button
                role="menuitem"
                onClick={handleFeedback}
                className="hover:bg-card-variant flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors"
                aria-label="Send Feedback"
              >
                <MessageSquare className="text-foreground-variant h-5 w-5" />
                <span className="font-medium text-foreground">Send Feedback</span>
              </button>

              <a
                role="menuitem"
                href="/protected/recipes/logout"
                className="hover:bg-card-variant flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors"
              >
                <LogOut className="text-foreground-variant h-5 w-5" />
                <span className="font-medium text-foreground">Log Out</span>
              </a>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4">
              <div className="text-foreground-variant flex items-center gap-2 text-xs">
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
