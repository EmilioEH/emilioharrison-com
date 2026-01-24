import React from 'react'
import { Link as LinkIcon, UtensilsCrossed, ScanText, Image as ImageIcon } from 'lucide-react'

export type InputMode = 'photo' | 'dish-photo' | 'url'

interface SourceToggleProps {
  mode: InputMode
  setMode: (m: InputMode) => void
}

export const SourceToggle: React.FC<SourceToggleProps> = ({ mode, setMode }) => {
  const isScanMode = mode === 'photo' || mode === 'url'

  return (
    <div className="mb-6">
      {/* Primary toggle: Scan vs Finished Dish */}
      <div className="flex overflow-hidden rounded-t-lg border-b border-border">
        <button
          className={`relative flex-1 py-3 text-center text-sm font-medium transition-colors ${
            isScanMode
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
          onClick={() => setMode('photo')}
          title="Scan a recipe from image or URL"
        >
          <div className="flex items-center justify-center gap-2">
            <ScanText className="h-4 w-4" />
            <span>Scan</span>
          </div>
          {isScanMode && (
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
            <span className="hidden sm:inline">Finished Dish</span>
            <span className="sm:hidden">Dish</span>
          </div>
          {mode === 'dish-photo' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-background/20" />
          )}
        </button>
      </div>

      {/* Secondary toggle: Image vs URL (only shown when Scan is selected) */}
      {isScanMode && (
        <div className="flex border-b border-border bg-muted/30">
          <button
            className={`relative flex-1 py-2 text-center text-xs font-medium transition-colors ${
              mode === 'photo'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/50'
            }`}
            onClick={() => setMode('photo')}
            title="Scan from image"
          >
            <div className="flex items-center justify-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" />
              <span>Image</span>
            </div>
            {mode === 'photo' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            className={`relative flex-1 py-2 text-center text-xs font-medium transition-colors ${
              mode === 'url'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/50'
            }`}
            onClick={() => setMode('url')}
            title="Import from URL"
          >
            <div className="flex items-center justify-center gap-1.5">
              <LinkIcon className="h-3.5 w-3.5" />
              <span>URL</span>
            </div>
            {mode === 'url' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>
      )}
    </div>
  )
}
