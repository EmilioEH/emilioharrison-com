import { useState, useEffect } from 'react'
import type { PendingInvite } from '../../../lib/types'
import { familyActions } from '../../../lib/familyStore'

export function useFamilySync() {
  const [showFamilySetup, setShowFamilySetup] = useState(false)
  const [showSyncNotification, setShowSyncNotification] = useState(false)
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])

  useEffect(() => {
    const loadFamilyData = async () => {
      try {
        const response = await fetch('/protected/recipes/api/families/current')
        const data = await response.json()

        if (data.success) {
          familyActions.setFamily(data.family)
          familyActions.setMembers(data.members || [])
          familyActions.setCurrentUserId(data.currentUserId || null)

          if (data.incomingInvites && Array.isArray(data.incomingInvites)) {
            setPendingInvites(data.incomingInvites)
          }

          const shouldSkip =
            typeof window !== 'undefined' &&
            (window.location.search.includes('skip_setup') ||
              window.location.search.includes('skip_onboarding'))

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
    pendingInvites,
    setPendingInvites,
  }
}
