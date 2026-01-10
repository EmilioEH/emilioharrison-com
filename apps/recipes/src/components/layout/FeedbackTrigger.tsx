import React, { useEffect } from 'react'
import { MessageSquare } from 'lucide-react'
import { openFeedbackModal } from '../../lib/feedbackStore'

export const FeedbackTrigger = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + F
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        openFeedbackModal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <button
      onClick={openFeedbackModal}
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-8 md:right-8"
      aria-label="Send Feedback"
      title="Send Feedback (Cmd+Shift+F)"
    >
      <MessageSquare className="h-6 w-6" />
    </button>
  )
}
