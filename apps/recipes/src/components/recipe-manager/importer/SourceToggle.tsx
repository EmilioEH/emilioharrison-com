import React from 'react'
import { Link as LinkIcon, Image as ImageIcon } from 'lucide-react'

export type InputMode = 'photo' | 'url'

interface SourceToggleProps {
  mode: InputMode
  setMode: (m: InputMode) => void
}

export const SourceToggle: React.FC<SourceToggleProps> = ({ mode, setMode }) => {
  return (
    <div className="mb-6 flex overflow-hidden rounded-lg border-b border-border">
      <button
        className={`relative flex-1 py-3 text-center text-sm font-medium transition-colors ${
          mode === 'photo'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted'
        }`}
        onClick={() => setMode('photo')}
        title="Scan from image"
      >
        <div className="flex items-center justify-center gap-2">
          <ImageIcon className="h-4 w-4" />
          <span>Image</span>
        </div>
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
      </button>
    </div>
  )
}
