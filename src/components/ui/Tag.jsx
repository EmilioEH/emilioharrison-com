import React from 'react'
import { Label } from './Typography'

const Tag = ({ tag, count, onClick, isActive, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 transition-all ${
        isActive
          ? 'border-black bg-black text-white'
          : 'border-black bg-white text-black hover:bg-gray-100'
      } ${className} `}
    >
      <Label variant="tag">
        <span>#{tag}</span>
        {count !== undefined && (
          <span className={`ml-1 text-xs ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
            {count}
          </span>
        )}
      </Label>
    </button>
  )
}

export default Tag
