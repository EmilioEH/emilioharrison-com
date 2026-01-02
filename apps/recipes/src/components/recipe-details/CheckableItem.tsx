import React from 'react'
import { Check } from 'lucide-react'

interface CheckableItemProps {
  text: string
  isChecked?: boolean
  onToggle: () => void
  size?: 'base' | 'lg' | 'xl'
}

export const CheckableItem: React.FC<CheckableItemProps> = ({
  text,
  isChecked = false,
  onToggle,
  size = 'base',
}) => {
  const getCheckboxSize = () => {
    switch (size) {
      case 'xl':
        return 'h-7 w-7'
      case 'lg':
        return 'h-6 w-6'
      default:
        return 'h-5 w-5'
    }
  }

  const getTextSize = () => {
    switch (size) {
      case 'xl':
        return 'text-xl leading-relaxed'
      case 'lg':
        return 'text-lg leading-relaxed'
      default:
        return 'text-base'
    }
  }

  return (
    <button
      onClick={onToggle}
      className={`flex w-full items-start gap-4 p-3 text-left transition-all ${isChecked ? 'opacity-40 grayscale' : ''}`}
    >
      <div
        className={`mt-0.5 flex items-center justify-center rounded-sm border transition-colors ${isChecked ? 'border-primary bg-primary' : 'border-primary bg-transparent'} ${getCheckboxSize()}`}
      >
        {isChecked && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>
      <span
        className={`flex-1 font-body text-foreground ${getTextSize()} ${isChecked ? 'line-through opacity-40' : ''}`}
      >
        {text}
      </span>
    </button>
  )
}
