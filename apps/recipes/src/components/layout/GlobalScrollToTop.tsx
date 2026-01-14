import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronUp } from 'lucide-react'
import { Button } from '../ui/button'

/**
 * GlobalScrollToTop - A floating button that appears when scrolling past viewport height
 *
 * Features:
 * - Appears after scrolling 100vh (beneath the fold)
 * - Smooth scroll to top animation
 * - Positioned bottom-right, above Beta Feedback Footer
 * - Fully accessible (keyboard and screen reader support)
 *
 * Addresses feedback report: #1768336770547
 */
export const GlobalScrollToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show button after scrolling past one viewport height
      const scrollThreshold = window.innerHeight
      setIsVisible(window.scrollY > scrollThreshold)
    }

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true })

    // Check initial scroll position
    handleScroll()

    // Cleanup
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-24 right-4 z-40"
        >
          <Button
            onClick={scrollToTop}
            size="lg"
            variant="default"
            aria-label="Scroll to top"
            className="h-12 w-12 rounded-full p-0 shadow-lg"
          >
            <ChevronUp className="h-6 w-6" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
