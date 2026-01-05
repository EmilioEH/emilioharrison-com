import React, { useEffect, useState, useSyncExternalStore } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'

interface ResponsiveModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  footer?: React.ReactNode
}

// Subscribe to a dummy external store that always returns true on client
const subscribe = () => () => {}
const getSnapshot = () => true
const getServerSnapshot = () => false

export const ResponsiveModal = React.forwardRef<HTMLDivElement, ResponsiveModalProps>(
  ({ isOpen, onClose, children, title, footer }, ref) => {
    const [isMobile, setIsMobile] = useState(false)
    const isClient = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

    useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 768)
      checkMobile()
      window.addEventListener('resize', checkMobile)
      return () => window.removeEventListener('resize', checkMobile)
    }, [])

    if (!isOpen || !isClient) return null

    const handleBackdropClick = () => {
      onClose()
    }

    const handleBackdropKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClose()
      }
    }

    const handleHandleBarKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClose()
      }
    }

    const content = (
      <div className="fixed inset-0 z-50 flex items-center justify-center" ref={ref}>
        {/* Backdrop */}
        <div
          role="button"
          tabIndex={0}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm duration-200 animate-in fade-in"
          onClick={handleBackdropClick}
          onKeyDown={handleBackdropKeyDown}
          aria-label="Close modal"
        />

        {/* Modal Content */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          className={`relative z-50 flex flex-col bg-card shadow-xl transition-all duration-300 ease-out ${
            isMobile
              ? 'mt-auto h-[90vh] w-full rounded-t-[28px] animate-in slide-in-from-bottom'
              : 'm-4 h-auto max-h-[85vh] w-full max-w-2xl rounded-[28px] animate-in fade-in zoom-in-95'
          } `}
          style={isMobile ? { bottom: 0, position: 'absolute' } : {}}
        >
          {/* Handle Bar (Mobile only) */}
          {isMobile && (
            <div
              role="button"
              tabIndex={0}
              className="flex w-full justify-center pb-2 pt-4"
              onClick={onClose}
              onKeyDown={handleHandleBarKeyDown}
              aria-label="Drag to close"
            >
              <div className="bg-border-variant h-1 w-8 rounded-full opacity-40" />
            </div>
          )}

          {/* Header */}
          <div className={`flex items-center justify-between px-6 ${isMobile ? 'pb-2' : 'py-6'}`}>
            <h2 id="modal-title" className="font-display text-xl font-bold text-foreground">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="hover:bg-card-variant/50 rounded-full p-2 transition-colors"
              aria-label="Close modal"
            >
              <X className="text-foreground-variant h-6 w-6" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>

          {/* Footer */}
          {footer && <div className="border-t border-border bg-card px-6 py-4">{footer}</div>}
        </div>
      </div>
    )

    return createPortal(content, document.body)
  },
)

ResponsiveModal.displayName = 'ResponsiveModal'
