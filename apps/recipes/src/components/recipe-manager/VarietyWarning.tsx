import React from 'react'
import { AlertCircle, X } from 'lucide-react'

interface VarietyWarningProps {
  warning?: {
    count: number
    protein: string
  } | null
  onClose: () => void
}

export const VarietyWarning: React.FC<VarietyWarningProps> = ({ warning, onClose }) => {
  if (!warning) return null

  return (
    <div className="absolute left-4 right-4 top-20 z-50 flex items-center justify-between rounded-md border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 shadow-lg animate-in slide-in-from-top-2">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5" />
        <div>
          <p className="font-bold">Variety Check!</p>
          <p className="text-sm">
            You've selected {warning.count} {warning.protein} recipes this week.
          </p>
        </div>
      </div>
      <button onClick={onClose}>
        <X className="h-5 w-5 opacity-50 hover:opacity-100" />
      </button>
    </div>
  )
}
