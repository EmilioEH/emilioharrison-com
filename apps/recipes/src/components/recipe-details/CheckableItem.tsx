import React from 'react'
import { Check } from 'lucide-react'

interface CheckableItemProps {
  text: string
  isChecked?: boolean
  onToggle: () => void
  largeText?: boolean
}

export const CheckableItem: React.FC<CheckableItemProps> = ({
  text,
  isChecked = false,
  onToggle,
  largeText = false,
}) => {
  return (
    <button
      onClick={onToggle}
      className={`flex w-full items-start gap-4 p-3 text-left transition-all ${isChecked ? 'opacity-40 grayscale' : ''}`}
    >
      <div
        className={`mt-0.5 flex items-center justify-center rounded-sm border transition-colors ${isChecked ? 'border-primary bg-primary' : 'border-primary bg-transparent'} ${largeText ? 'h-6 w-6' : 'h-5 w-5'}`}
      >
        {isChecked && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>
      <span
        className={`flex-1 font-body text-foreground ${largeText ? 'text-lg leading-relaxed' : 'text-base'} ${isChecked ? 'line-through opacity-40' : ''}`}
      >
        {text}
      </span>
    </button>
  )
}
