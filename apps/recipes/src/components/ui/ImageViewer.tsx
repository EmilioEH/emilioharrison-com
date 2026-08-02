import React from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ImageViewerProps {
  isOpen: boolean
  imageUrl: string
  onClose: () => void
  alt?: string
  /** Shown top-left — which image of a stack this is. */
  caption?: string
  /** Paging through a stack. Passing either one adds its arrow, the matching arrow key, and a
   * one-finger swipe (only at fit scale, where that gesture isn't already a pan). */
  onPrev?: () => void
  onNext?: () => void
  /** Controls pinned over the bottom of the image — actions that belong to the image on screen. */
  footer?: React.ReactNode
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  isOpen,
  imageUrl,
  onClose,
  alt = 'Full screen image',
  caption,
  onPrev,
  onNext,
  footer,
}) => {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Close on ESC key, page with the arrow keys
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev?.()
      if (e.key === 'ArrowRight') onNext?.()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKey)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose, onPrev, onNext])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex cursor-pointer items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={onClose}
        >
          {caption && (
            <span className="pointer-events-none absolute left-4 top-4 z-10 max-w-[60%] truncate rounded-full bg-background/20 px-3 py-1.5 text-sm font-bold text-white">
              {caption}
            </span>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-full bg-background/20 p-2 text-white transition-colors hover:bg-background/30"
            aria-label="Close image viewer"
          >
            <X className="h-6 w-6" />
          </button>

          {onPrev && (
            <NavArrow side="left" onClick={onPrev} label="Previous photo">
              <ChevronLeft className="h-6 w-6" />
            </NavArrow>
          )}
          {onNext && (
            <NavArrow side="right" onClick={onNext} label="Next photo">
              <ChevronRight className="h-6 w-6" />
            </NavArrow>
          )}

          {/* Image Container with Zoom. Keyed by src so paging to another photo starts it back at
              fit scale rather than inheriting the previous photo's zoom and pan. */}
          <ZoomableImage key={imageUrl} src={imageUrl} alt={alt} onPrev={onPrev} onNext={onNext} />

          {footer && (
            <div
              role="presentation"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="absolute inset-x-0 bottom-0 z-10 flex cursor-default flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
              {footer}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/** A finger has to travel this far horizontally before it counts as paging rather than a stray
 * movement during a tap. */
const SWIPE_MIN_PX = 50

const NavArrow: React.FC<{
  side: 'left' | 'right'
  label: string
  onClick: () => void
  children: React.ReactNode
}> = ({ side, label, onClick, children }) => (
  <button
    type="button"
    aria-label={label}
    onClick={(e) => {
      // The backdrop closes the viewer; paging must not also dismiss it.
      e.stopPropagation()
      onClick()
    }}
    className={`absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-background/20 text-white transition-colors hover:bg-background/30 ${
      side === 'left' ? 'left-2' : 'right-2'
    }`}
  >
    {children}
  </button>
)

/** Pointer capture keeps a drag alive when the finger leaves the element, but both calls throw
 * for a pointer that is no longer active — which happens routinely after a `pointercancel`
 * (a gesture the OS took over) and in environments that don't implement the API at all. Losing
 * capture only degrades the drag; it must never surface as an unhandled error. */
function capturePointer(el: Element, pointerId: number) {
  try {
    el.setPointerCapture?.(pointerId)
  } catch {
    // Pointer already gone — dragging still works, it just won't track outside the element.
  }
}

function releasePointer(el: Element, pointerId: number) {
  try {
    el.releasePointerCapture?.(pointerId)
  } catch {
    // Already released or never captured; nothing to clean up.
  }
}

// Internal Zoomable Image Component
const ZoomableImage = ({
  src,
  alt,
  onPrev,
  onNext,
}: {
  src: string
  alt: string
  onPrev?: () => void
  onNext?: () => void
}) => {
  const [scale, setScale] = React.useState(1)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const startPos = React.useRef({ x: 0, y: 0 })
  const lastScale = React.useRef(1)
  const lastDist = React.useRef<number | null>(null)
  const swipeStart = React.useRef<{ x: number; y: number } | null>(null)
  /** A swipe still ends in a click on the backdrop, which would close the viewer the user was
   * only paging through. */
  const swallowNextClick = React.useRef(false)

  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    if (scale > 1) {
      setScale(1)
      setPosition({ x: 0, y: 0 })
      lastScale.current = 1
    } else {
      setScale(2.5)
      setPosition({ x: 0, y: 0 })
      lastScale.current = 2.5
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale > 1) {
      setIsDragging(true)
      startPos.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      }
      capturePointer(e.currentTarget, e.pointerId)
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging && scale > 1) {
      e.preventDefault()
      setPosition({
        x: e.clientX - startPos.current.x,
        y: e.clientY - startPos.current.y,
      })
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false)
    releasePointer(e.currentTarget, e.pointerId)
  }

  // Touch handlers for pinch-to-zoom and paging
  const handleTouchStart = (e: React.TouchEvent) => {
    swallowNextClick.current = false

    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
      lastDist.current = dist
      swipeStart.current = null
      return
    }

    // Only track a swipe at fit scale — once zoomed in, the same one-finger drag is a pan.
    swipeStart.current =
      e.touches.length === 1 && scale <= 1
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : null
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastDist.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )

      const delta = dist / lastDist.current
      const newScale = Math.min(Math.max(lastScale.current * delta, 1), 5)

      setScale(newScale)
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    lastDist.current = null
    lastScale.current = scale

    const start = swipeStart.current
    swipeStart.current = null
    const end = e.changedTouches?.[0]

    if (start && end && scale <= 1) {
      const dx = end.clientX - start.x
      const dy = end.clientY - start.y
      // A mostly-horizontal travel is paging; anything else is a tap or a vertical drag.
      if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy)) {
        swallowNextClick.current = true
        if (dx > 0) onPrev?.()
        else onNext?.()
      }
    }

    // Zooming back out to fit must also recentre the image. Panning while zoomed leaves a
    // translate offset behind, and once back at scale 1 that offset just strands the image
    // off-screen with no way to drag it back — panning is only enabled above scale 1.
    // This was previously gated on `scale < 1`, which can never be true: handleTouchMove clamps
    // scale to a minimum of 1, so the reset was dead code and the image stayed off-centre.
    if (scale <= 1) {
      setScale(1)
      lastScale.current = 1
      setPosition({ x: 0, y: 0 })
    }
  }

  return (
    <motion.div
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
    >
      <div
        role="presentation"
        className="relative flex h-full w-full touch-none items-center justify-center"
        ref={containerRef}
        onClick={(e) => {
          if (swallowNextClick.current) {
            swallowNextClick.current = false
            e.stopPropagation()
          }
        }}
        onDoubleClick={handleDoubleTap}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          role="presentation"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {}
          <img
            src={src}
            alt={alt}
            draggable={false}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              cursor: scale > 1 ? 'grab' : 'zoom-in',
              transition: isDragging ? 'none' : 'transform 0.1s linear',
            }}
            className="max-h-[100dvh] max-w-[100dvw] select-none object-contain shadow-2xl"
          />
        </div>
      </div>
    </motion.div>
  )
}
