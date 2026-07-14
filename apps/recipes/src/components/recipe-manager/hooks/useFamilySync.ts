import { useState } from 'react'

/**
 * Owns the family-setup-modal and sync-notification-toast UI state for RecipeManager.
 *
 * This used to also fire its own boot-time `GET /api/families/current` fetch on mount. That's
 * gone (see PERFORMANCE-PLAN.md P6+P7) — `useBootstrap` now seeds `familyStore` as part of the
 * single consolidated `/api/bootstrap` call. The three *other* call sites that fetch
 * `/api/families/current` directly (RecipeManager.tsx's 30s "did anything change elsewhere"
 * poll, `FamilySetup`'s `onComplete` refetch, and the sync-notification toast's own refresh
 * button) are event-driven/recurring, not boot-time duplicates, and are unaffected by this.
 */
export function useFamilySync() {
  const [showFamilySetup, setShowFamilySetup] = useState(false)
  const [showSyncNotification, setShowSyncNotification] = useState(false)

  return {
    showFamilySetup,
    setShowFamilySetup,
    showSyncNotification,
    setShowSyncNotification,
  }
}
