import React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ImageViewerProps {
  isOpen: boolean
  imageUrl: string
  onClose: () => void
  alt?: string
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  isOpen,
  imageUrl,
  onClose,
  alt = 'Full screen image',
}) => {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Close on ESC key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-full bg-background/20 p-2 text-white transition-colors hover:bg-background/30"
            aria-label="Close image viewer"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Image Container with Zoom */}
          <ZoomableImage src={imageUrl} alt={alt} onClose={onClose} />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

// Internal Zoomable Image Component
const ZoomableImage = ({
  src,
  alt,
  onClose,
}: {
  src: string
  alt: string
  onClose: () => void
}) => {
  const [scale, setScale] = React.useState(1)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const startPos = React.useRef({ x: 0, y: 0 })

  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation() // Prevent closing
    if (scale > 1) {
      // Reset
      setScale(1)
      setPosition({ x: 0, y: 0 })
    } else {
      // Zoom in
      setScale(2.5)
      // Optional: Zoom towards click position (simplified to center for now)
      setPosition({ x: 0, y: 0 })
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale > 1) {
      setIsDragging(true)
      startPos.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
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
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  return (
    <motion.div
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      onClick={onClose} // Background click closes
    >
      <div
        className="relative flex h-full w-full touch-none items-center justify-center"
        ref={containerRef}
        onDoubleClick={handleDoubleTap}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div
          role="presentation"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <img
            src={src}
            alt={alt}
            draggable={false}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              cursor: scale > 1 ? 'grab' : 'zoom-in',
              transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            }}
            className="max-h-[100dvh] max-w-[100dvw] select-none object-contain shadow-2xl"
          />
        </div>
      </div>
    </motion.div>
  )
}
