import { useState, useEffect } from 'react'
import { familyActions } from '../../../lib/familyStore'

export function useFamilySync() {
  const [showFamilySetup, setShowFamilySetup] = useState(false)
  const [showSyncNotification, setShowSyncNotification] = useState(false)

  useEffect(() => {
    const loadFamilyData = async () => {
      try {
        const response = await fetch('/protected/recipes/api/families/current')
        const data = await response.json()

        if (data.success) {
          familyActions.setFamily(data.family)
          familyActions.setMembers(data.members || [])
          familyActions.setCurrentUserId(data.currentUserId || null)

          // Sync to global store for badge visibility
          if (data.incomingInvites && Array.isArray(data.incomingInvites)) {
            familyActions.setPendingInvites(data.incomingInvites)
          }

          const shouldSkip =
            typeof window !== 'undefined' &&
            (window.location.search.includes('skip_setup') ||
              window.location.search.includes('skip_onboarding') ||
              document.cookie.includes('skip_family_setup=true'))

          if (!data.family && data.incomingInvites?.length === 0 && !shouldSkip) {
            setShowFamilySetup(true)
          }
        }
      } catch (err) {
        console.error('Failed to load family data', err)
      }
    }

    loadFamilyData()
  }, [])

  return {
    showFamilySetup,
    setShowFamilySetup,
    showSyncNotification,
    setShowSyncNotification,
  }
}
