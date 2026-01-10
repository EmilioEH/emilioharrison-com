import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Share, MoreVertical, PlusSquare } from 'lucide-react'

interface InstallInstructionsProps {
  onContinue: () => void
}

export const InstallInstructions: React.FC<InstallInstructionsProps> = ({ onContinue }) => {
  const [isIOS] = useState(() => {
    if (typeof navigator === 'undefined') return false
    return /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
  })

  return (
    <div className="flex h-full flex-col items-center justify-center bg-background p-6 text-center">
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Add to Home Screen</h1>
        <p className="text-muted-foreground">
          For the best experience, add this app to your home screen to use it like a native app.
        </p>
      </div>

      <div className="mb-8 w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        {isIOS ? (
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                1
              </div>
              <p>
                Tap the <Share className="inline h-4 w-4" /> <strong>Share</strong> button below
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                2
              </div>
              <p>
                Select <PlusSquare className="inline h-4 w-4" /> <strong>Add to Home Screen</strong>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                3
              </div>
              <p>
                Tap <strong>Add</strong> in the top right
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                1
              </div>
              <p>
                Tap the <MoreVertical className="inline h-4 w-4" /> <strong>Menu</strong> icon
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                2
              </div>
              <p>
                Select <strong>Install App</strong> or <strong>Add to Home screen</strong>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                3
              </div>
              <p>Follow the prompt to install</p>
            </div>
          </div>
        )}
      </div>

      <Button onClick={onContinue} size="lg" className="w-full max-w-xs font-semibold">
        I've Added It
      </Button>
    </div>
  )
}
