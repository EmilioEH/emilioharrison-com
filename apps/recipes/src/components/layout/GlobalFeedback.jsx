import React, { useState } from 'react'
import { MessageSquarePlus } from 'lucide-react'
import { FeedbackModal } from '../recipe-manager/FeedbackModal'

const GlobalFeedback = () => {
  const [isOpen, setIsOpen] = useState(false)

  // In a real app, we might get the user from a context or auth store
  // For now, we'll let FeedbackModal handle its own defaults or pass null
  const user =
    typeof window !== 'undefined'
      ? document.cookie.match(/site_user=([^;]+)/)?.[1] || 'Guest'
      : 'Guest'

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="group fixed bottom-6 right-6 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-md-sys-color-primary text-md-sys-color-on-primary shadow-lg transition-all hover:scale-110 active:scale-95"
        title="Submit Feedback"
        aria-label="Submit Feedback"
      >
        <MessageSquarePlus className="h-6 w-6 transition-transform group-hover:rotate-12" />

        {/* Optional: Label that appears on hover on Desktop */}
        <span className="absolute right-full mr-3 hidden whitespace-nowrap rounded-md border border-md-sys-color-outline bg-md-sys-color-surface-variant px-2 py-1 text-xs font-bold text-md-sys-color-on-surface-variant opacity-0 shadow-sm transition-opacity group-hover:opacity-100 md:block">
          Feedback
        </span>
      </button>

      {/* The actual Modal */}
      <FeedbackModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        appState={{ context: 'Global' }}
        user={user}
      />
    </>
  )
}

export default GlobalFeedback
