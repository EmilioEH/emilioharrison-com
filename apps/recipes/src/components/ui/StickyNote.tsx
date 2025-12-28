import React from 'react'

interface StickyNoteProps {
  children: React.ReactNode
  className?: string
  color?: string
  rotate?: number
  size?: 'square' | 'rectangle'
  variant?: 'action' | 'static'
  padding?: boolean
}

/**
 * StickyNote Component
 * A container component resembling a sticky note with a pin.
 */
const StickyNote: React.FC<StickyNoteProps> = ({
  children,
  className = '',
  color = 'bg-sticky-yellow',
  rotate = 0,
  size = 'square', // square, rectangle
  variant = 'action', // action, static
  padding = true,
}) => {
  const sizeClasses = {
    square: 'aspect-square',
    rectangle: 'w-full md:aspect-[2/1]',
  }

  // Force high contrast text color (black) for sticky notes as they are pastel
  const textColor = 'text-black'

  return (
    <div
      className={` ${color} ${textColor} shadow-hard border-4 border-black font-body ${padding ? 'p-6 md:p-8' : ''} relative transition-transform duration-300 ease-in-out ${variant === 'action' ? 'hover:shadow-hard-lg cursor-pointer hover:z-10 hover:scale-[1.01]' : ''} ${sizeClasses[size] || sizeClasses.square} ${className} `}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {/* Pin */}
      <div className="absolute -top-4 left-1/2 z-20 -translate-x-1/2" aria-hidden="true">
        <div className="h-6 w-6 rounded-full border-2 border-white bg-black shadow-sm"></div>
      </div>
      {children}
    </div>
  )
}

export default StickyNote
