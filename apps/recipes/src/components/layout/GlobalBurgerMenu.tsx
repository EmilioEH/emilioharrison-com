import React from 'react'
import { useStore } from '@nanostores/react'

import {
  X,
  Info,
  LayoutDashboard,
  FolderUp,
  CheckSquare,
  LogOut,
  UsersRound,
  ShieldAlert,
  UserPlus,
} from 'lucide-react'
import { burgerMenuOpen, closeBurgerMenu } from '../../lib/burgerMenuStore'
import { $pendingInvites } from '../../lib/familyStore'
import { clearPersistedRecipes } from '../../lib/recipeStore'

interface GlobalBurgerMenuProps {
  user?: string
  isAdmin?: boolean
}

const GlobalBurgerMenu: React.FC<GlobalBurgerMenuProps> = (props) => {
  const isOpen = useStore(burgerMenuOpen)
  const pendingInvites = useStore($pendingInvites)

  const handleWeekPlannerSettings = () => {
    closeBurgerMenu()
    window.dispatchEvent(new CustomEvent('navigate-to-week-planner-settings'))
  }

  const handleBulkImport = () => {
    closeBurgerMenu()
    window.dispatchEvent(new CustomEvent('navigate-to-bulk-import'))
  }

  const handleManageFamily = () => {
    closeBurgerMenu()
    window.dispatchEvent(new CustomEvent('navigate-to-family-settings'))
  }

  const handleLogout = () => {
    // Clear this user's persisted recipe cache before the browser navigates to /logout (a plain
    // server-rendered redirect — no client JS runs there, so this is the last chance to do it).
    // Per-user cache keys already prevent a *different* user from ever reading this data, but
    // clearing it here keeps storage tidy and satisfies "logout clears the cached recipes"
    // literally rather than just structurally. See recipeStore.ts for details.
    clearPersistedRecipes()

    // Also clear the service worker's cached app shell (see public/sw.js). The shell HTML is
    // network-first (so it's not usually served stale while online), but it IS served from
    // cache when offline — and it embeds this user's displayName/isAdmin. Without
    // this, a different user logging in on the same device and going offline before their
    // first successful page load could briefly see this user's cached shell.
    navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_SHELL_CACHE' })
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
          <div className="relative h-full w-72 max-w-[85vw] bg-card shadow-lg duration-200 animate-in slide-in-from-right">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <span className="font-display text-lg font-bold text-foreground">Menu</span>
              <button
                onClick={closeBurgerMenu}
                className="rounded-full p-2 hover:bg-accent"
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
                className="flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors hover:bg-accent active:bg-accent"
              >
                <FolderUp className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-foreground">Import Recipes</span>
              </button>

              <button
                role="menuitem"
                onClick={handleWeekPlannerSettings}
                className="flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors hover:bg-accent active:bg-accent"
              >
                <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-foreground">Week Planner Settings</span>
              </button>

              {/* Admin Dashboard Link */}
              {props.isAdmin && (
                <>
                  <button
                    role="menuitem"
                    onClick={() => {
                      closeBurgerMenu()
                      window.dispatchEvent(new CustomEvent('navigate-to-admin-dashboard'))
                    }}
                    className="flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors hover:bg-accent active:bg-accent"
                  >
                    <ShieldAlert className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium text-foreground">Admin Dashboard</span>
                  </button>
                </>
              )}

              <button
                role="menuitem"
                onClick={handleManageFamily}
                className="flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors hover:bg-accent active:bg-accent"
              >
                <div className="relative">
                  <UsersRound className="h-5 w-5 text-muted-foreground" />
                  {pendingInvites.length > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                      {pendingInvites.length}
                    </span>
                  )}
                </div>
                <span className="font-medium text-foreground">Manage Family</span>
              </button>

              <button
                role="menuitem"
                onClick={() => {
                  closeBurgerMenu()
                  window.dispatchEvent(new CustomEvent('navigate-to-invite'))
                }}
                className="flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors hover:bg-accent active:bg-accent"
              >
                <UserPlus className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-foreground">Invite</span>
              </button>

              <button
                role="menuitem"
                onClick={() => {
                  closeBurgerMenu()
                  window.dispatchEvent(new CustomEvent('toggle-selection-mode'))
                }}
                className="flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors hover:bg-accent active:bg-accent"
              >
                <CheckSquare className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-foreground">Select Recipes</span>
              </button>

              <a
                role="menuitem"
                href="/protected/recipes/logout"
                onClick={handleLogout}
                className="flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors hover:bg-accent active:bg-accent"
              >
                <LogOut className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-foreground">Log Out</span>
              </a>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
