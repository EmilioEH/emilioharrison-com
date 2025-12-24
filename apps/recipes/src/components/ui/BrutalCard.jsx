import React from 'react'

/**
 * @typedef {Object} BrutalCardProps
 * @property {React.ReactNode} children
 * @property {string} [className]
 * @property {string} [color]
 * @property {{ border?: string, shadow?: string, shadowHover?: string, colors: { card: string } }} [theme]
 * @property {() => void} [onClick]
 * @property {boolean} [disableHover]
 */

/** @param {BrutalCardProps & React.HTMLAttributes<HTMLDivElement>} props */
const BrutalCard = ({
  children,
  className = '',
  color,
  theme,
  onClick,
  disableHover = false,
  ...props
}) => {
  const bg = color || theme.colors.card
  const hoverStyles = disableHover ? '' : theme.shadowHover || ''
  const cursorStyles = onClick ? 'cursor-pointer' : ''

  return (
    <div
      className={`${theme.border} ${theme.shadow} ${bg} p-6 ${hoverStyles} ${cursorStyles} ${className}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick(e)
              }
            }
          : undefined
      }
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}

export default BrutalCard
