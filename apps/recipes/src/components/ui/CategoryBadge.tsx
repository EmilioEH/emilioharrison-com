import React from 'react'
import { Label } from './Typography'

interface CategoryBadgeProps {
  category: string
  count?: number
  onClick?: () => void
  isActive?: boolean
  className?: string
}

const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  count,
  onClick,
  isActive,
  className = '',
}) => {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 border-2 px-3 py-1 transition-all ${
        isActive
          ? 'border-black bg-black text-white'
          : 'border-black bg-white text-black hover:bg-gray-100'
      } ${className} `}
    >
      <Label variant="tag" className="uppercase tracking-wider">
        {category}
        {count !== undefined && (
          <span className={`ml-1 ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>({count})</span>
        )}
      </Label>
    </button>
  )
}

export default CategoryBadge
