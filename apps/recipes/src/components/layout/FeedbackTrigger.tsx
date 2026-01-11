import React, { useEffect } from 'react'
import { MessageSquare } from 'lucide-react'
import { openFeedbackModal } from '../../lib/feedbackStore'

export const FeedbackTrigger = () => {
  // Lazy initialization to avoid hydration mismatch (if SSR-ed, will be false, then client updates? No, this runs on client)
  // Actually, for Astro Islands, we need to be careful about hydration.
  // But since we are reading from localStorage, we should use a layout effect or just accept the tiny re-render if we want.
  // However, the cleanest way to avoid the lint error and ensure correct init:

  const [isMinimized, setIsMinimized] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('feedback_fab_minimized')
      return savedState ? JSON.parse(savedState) : false
    }
    return false
  })

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

  const handlePointerDown = () => {
    ignoreClickRef.current = false
    setIsPressing(true)
    pressTimerRef.current = setTimeout(() => {
      // Long press action
      setIsMinimized((prev) => {
        const newState = !prev
        localStorage.setItem('feedback_fab_minimized', JSON.stringify(newState))
        return newState
      })

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50)
      }

      ignoreClickRef.current = true // Prevent click from firing
      setIsPressing(false) // Stop visual feedback
    }, 500)
  }

  const handlePointerUp = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
    setIsPressing(false)
  }

  const handleMainClick = () => {
    if (ignoreClickRef.current) {
      ignoreClickRef.current = false // Reset
      return
    }
    openFeedbackModal()
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-end justify-end transition-all duration-300 md:bottom-8 md:right-8 ${
        isMinimized ? 'opacity-50 hover:opacity-100' : ''
      }`}
    >
      <button
        onMouseDown={handlePointerDown}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchEnd={handlePointerUp}
        onClick={handleMainClick}
        className={`flex select-none items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 ${
          isMinimized ? 'h-10 w-10 active:scale-95' : 'h-14 w-14 hover:scale-105 active:scale-95'
        } ${isPressing ? 'scale-90 ring-4 ring-primary/20' : ''}`}
        aria-label="Send Feedback (Long press to limit)"
        title="Send Feedback (Cmd+Shift+F)"
        style={{ touchAction: 'none' }} // Prevent scrolling while pressing
      >
        <MessageSquare className={`transition-all ${isMinimized ? 'h-5 w-5' : 'h-6 w-6'}`} />
      </button>
    </div>
  )
}
