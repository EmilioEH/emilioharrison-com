import React from 'react'
import { Link as LinkIcon, UtensilsCrossed, ScanText } from 'lucide-react'

export type InputMode = 'photo' | 'dish-photo' | 'url'

interface SourceToggleProps {
  mode: InputMode
  setMode: (m: InputMode) => void
}

export const SourceToggle: React.FC<SourceToggleProps> = ({ mode, setMode }) => (
  <div className="mb-6 flex overflow-hidden rounded-t-lg border-b border-border">
    <button
      className={`relative flex-1 py-3 text-center text-sm font-medium transition-colors ${
        mode === 'photo'
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted'
      }`}
      onClick={() => setMode('photo')}
      title="Scan a written recipe"
    >
      <div className="flex items-center justify-center gap-2">
        <ScanText className="h-4 w-4" />
        <span className="hidden sm:inline">Recipe Card</span>
        <span className="sm:hidden">Scan</span>
      </div>
      {mode === 'photo' && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-background/20" />
      )}
    </button>
    <button
      className={`relative flex-1 py-3 text-center text-sm font-medium transition-colors ${
        mode === 'dish-photo'
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted'
      }`}
      onClick={() => setMode('dish-photo')}
      title="Create from dish photo"
    >
      <div className="flex items-center justify-center gap-2">
        <UtensilsCrossed className="h-4 w-4" />
        <span className="hidden sm:inline">Dish Photo</span>
        <span className="sm:hidden">Dish</span>
      </div>
      {mode === 'dish-photo' && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-background/20" />
      )}
    </button>
    <button
      className={`relative flex-1 py-3 text-center text-sm font-medium transition-colors ${
        mode === 'url'
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted'
      }`}
      onClick={() => setMode('url')}
      title="Import from URL"
    >
      <div className="flex items-center justify-center gap-2">
        <LinkIcon className="h-4 w-4" />
        <span>URL</span>
      </div>
      {mode === 'url' && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-background/20" />
      )}
    </button>
  </div>
)
