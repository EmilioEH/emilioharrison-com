import React from 'react'
import { Plus } from 'lucide-react'

/**
 * MD3 Floating Action Button
 * @param {object} props
 * @param {() => void} props.onClick
 * @param {string} [props.label] - Optional label for Extended FAB
 * @param {React.ElementType} [props.icon] - Icon component (defaults to Plus)
 */
export const Fab = ({ onClick, label, icon: Icon = Plus }) => {
  return (
    <button
      onClick={onClick}
      className={`hover:shadow-md-4 hover:bg-md-sys-color-primary/90 fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-md-sys-color-primary p-4 text-md-sys-color-on-primary shadow-md-3 transition-all hover:scale-105 active:scale-95 active:shadow-md-2`}
      aria-label={label || 'Add'}
    >
      <Icon className="h-6 w-6" />
      {label && <span className="font-bold">{label}</span>}
    </button>
  )
}
