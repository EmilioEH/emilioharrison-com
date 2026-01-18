import React from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingOverlayProps {
  message?: string
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm duration-200 animate-in fade-in">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-8 shadow-2xl">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="font-display text-lg font-bold text-foreground">{message}</p>
      </div>
    </div>
  )
}
