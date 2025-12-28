import React from 'react'
import type { Theme } from '../../lib/themes'

interface BrutalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: string
  theme: Theme
  disableHover?: boolean
  onClick?: (e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => void
}

const BrutalCard: React.FC<BrutalCardProps> = ({
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
