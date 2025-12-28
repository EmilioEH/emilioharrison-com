import React from 'react'

interface ContentBlockProps {
  children: React.ReactNode
  className?: string
  color?: string
  rotate?: number
  pin?: boolean
  padding?: string
}

/**
 * ContentBlock Component
 * A unified container component for the "Brutal" design system.
 * Features thick borders, hard shadows, and optional rotation/pin.
 * Purely presentational - no hover or click states.
 */
const ContentBlock: React.FC<ContentBlockProps> = ({
  children,
  className = '',
  color = 'bg-white',
  rotate = 0,
  pin = false,
  padding = 'p-6 md:p-8',
}) => {
  return (
    <div
      className={` ${color} shadow-hard border-4 border-black ${padding} relative ${className} `}
      style={{
        transform: rotate ? `rotate(${rotate}deg)` : 'none',
      }}
    >
      {pin && (
        <div className="absolute -top-4 left-1/2 z-20 -translate-x-1/2" aria-hidden="true">
          <div className="h-6 w-6 rounded-full border-2 border-white bg-black shadow-sm"></div>
        </div>
      )}
      {children}
    </div>
  )
}

export default ContentBlock
