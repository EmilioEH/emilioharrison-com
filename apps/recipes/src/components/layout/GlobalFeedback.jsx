import React from 'react'
import { useStore } from '@nanostores/react'
import { isFeedbackModalOpen, closeFeedbackModal } from '../../lib/feedbackStore'
import { FeedbackModal } from '../recipe-manager/dialogs/FeedbackModal'
import { FeedbackFooter } from './FeedbackFooter'

const GlobalFeedback = () => {
  const isOpen = useStore(isFeedbackModalOpen)

  // In a real app, we might get the user from a context or auth store
  // For now, we'll let FeedbackModal handle its own defaults or pass null
  const user =
    typeof window !== 'undefined'
      ? document.cookie.match(/site_user=([^;]+)/)?.[1] || 'Guest'
      : 'Guest'

  return (
    <>
      <FeedbackFooter />
      <FeedbackModal
        isOpen={isOpen}
        onClose={closeFeedbackModal}
        appState={{ context: 'Global' }}
        user={user}
      />
    </>
  )
}

export default GlobalFeedback
