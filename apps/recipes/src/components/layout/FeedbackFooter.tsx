import React, { useEffect } from 'react'
import { MessageSquare } from 'lucide-react'
import { openFeedbackModal } from '../../lib/feedbackStore'
import { Button } from '@/components/ui/button'

export const FeedbackFooter = () => {
  const [isVisible, setIsVisible] = React.useState(true)
  const lastScrollTop = React.useRef(0)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + F
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        openFeedbackModal()
      }
    }

    const handleScroll = (scrollTop: number) => {
      // Always show at the very top (bounce/rubberband handling)
      if (scrollTop < 10) {
        setIsVisible(true)
        lastScrollTop.current = scrollTop
        return
      }

      // Hide on Scroll Down, Show on Scroll Up
      if (scrollTop > lastScrollTop.current) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }

      lastScrollTop.current = scrollTop
    }

    const onRecipeScroll = (e: CustomEvent<{ scrollTop: number }>) => {
      handleScroll(e.detail.scrollTop)
    }

    const onWindowScroll = () => {
      handleScroll(window.scrollY)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('recipe-scroll', onRecipeScroll as EventListener)
    window.addEventListener('scroll', onWindowScroll)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('recipe-scroll', onRecipeScroll as EventListener)
      window.removeEventListener('scroll', onWindowScroll)
    }
  }, [])

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[100] flex h-8 items-center justify-between bg-foreground px-4 text-[10px] font-black uppercase tracking-widest text-background shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
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
