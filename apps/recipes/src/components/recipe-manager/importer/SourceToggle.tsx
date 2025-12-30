import React from 'react'
import { Camera, Link as LinkIcon } from 'lucide-react'

export type InputMode = 'photo' | 'url'

interface SourceToggleProps {
  mode: InputMode
  setMode: (m: InputMode) => void
}

export const SourceToggle: React.FC<SourceToggleProps> = ({ mode, setMode }) => (
  <div className="mb-6 flex border-b border-border">
    <button
      className={`flex-1 py-3 text-center font-medium uppercase tracking-wider transition-colors ${
        mode === 'photo'
          ? 'bg-primary text-primary-foreground'
          : 'text-foreground-variant hover:bg-primary/[0.08]'
      }`}
      onClick={() => setMode('photo')}
    >
      <div className="flex items-center justify-center gap-2">
        <Camera className="h-4 w-4" /> Photo
      </div>
    </button>
    <button
      className={`flex-1 py-3 text-center font-medium uppercase tracking-wider transition-colors ${
        mode === 'url'
          ? 'bg-primary text-primary-foreground'
          : 'text-foreground-variant hover:bg-primary/[0.08]'
      }`}
      onClick={() => setMode('url')}
    >
      <div className="flex items-center justify-center gap-2">
        <LinkIcon className="h-4 w-4" /> URL
      </div>
    </button>
  </div>
)
