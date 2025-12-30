import React from 'react'
import { Plus } from 'lucide-react'

interface FabProps {
  onClick: () => void
  label?: string
  icon?: React.ElementType
}

/**
 * MD3 Floating Action Button
 */
export const Fab: React.FC<FabProps> = ({ onClick, label, icon: Icon = Plus }) => {
  return (
    <button
      onClick={onClick}
      className={`hover:shadow-md-4 shadow-md-3 flex items-center gap-2 rounded-2xl bg-primary p-4 text-primary-foreground transition-all hover:scale-105 hover:bg-primary/90 active:scale-95 active:shadow-md`}
      style={{
        // Safari fix: Force GPU layer to ensure fixed positioning works correctly
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)',
      }}
      aria-label={label || 'Add'}
    >
      <Icon className="h-6 w-6" />
      {label && <span className="font-bold">{label}</span>}
    </button>
  )
}
