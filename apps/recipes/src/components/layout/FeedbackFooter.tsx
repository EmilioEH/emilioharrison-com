import React, { useEffect } from 'react'
import { MessageSquare } from 'lucide-react'
import { openFeedbackModal } from '../../lib/feedbackStore'
import { Button } from '@/components/ui/button'

export const FeedbackFooter = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + F
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        openFeedbackModal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-8 w-full shrink-0 items-center justify-between bg-foreground px-4 text-[10px] font-black uppercase tracking-widest text-background">
      <div className="flex items-center gap-2">
        <span className="opacity-90">Beta Preview</span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={openFeedbackModal}
        className="flex h-full items-center gap-2 rounded-none px-2 text-[10px] font-bold uppercase tracking-widest text-background hover:bg-background/20 hover:text-background active:bg-background/30"
        title="Send Feedback (Cmd+Shift+F)"
        aria-label="Send Feedback"
      >
        <span>Give Feedback</span>
        <MessageSquare className="h-3 w-3" />
      </Button>
    </div>
  )
}
