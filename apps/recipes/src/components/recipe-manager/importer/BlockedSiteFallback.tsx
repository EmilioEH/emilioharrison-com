import React from 'react'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { Stack } from '@/components/ui/layout'

interface BlockedSiteFallbackProps {
  pastedText: string
  setPastedText: (text: string) => void
  onTryAnotherUrl: () => void
}

/**
 * Some recipe sites refuse automated requests. Rather than leaving the user at a dead end, this
 * explains what happened in their terms and offers the one thing that still works: pasting the
 * text in by hand.
 */
export const BlockedSiteFallback: React.FC<BlockedSiteFallbackProps> = ({
  pastedText,
  setPastedText,
  onTryAnotherUrl,
}) => (
  <Stack spacing="md" className="animate-in fade-in slide-in-from-top-2">
    <div className="rounded-lg bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
      <div className="flex gap-3">
        <ShieldAlert className="h-5 w-5 shrink-0" />
        <div className="space-y-2">
          <p className="font-semibold">This site blocks automated access</p>
          <p className="text-amber-600 dark:text-amber-500">
            No worries! You can copy the recipe text from the website and paste it below.
          </p>
        </div>
      </div>
    </div>

    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
      <p className="mb-3 text-sm font-medium text-foreground">How to copy the recipe:</p>
      <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
        <li>Open the recipe page in your browser</li>
        <li>Select the ingredients and instructions text</li>
        <li>Copy (Ctrl+C or Cmd+C) and paste below</li>
      </ol>
    </div>

    <div>
      <label
        htmlFor="pasted-text"
        className="mb-1 block text-xs font-bold uppercase text-muted-foreground"
      >
        Paste Recipe Text
      </label>
      <textarea
        id="pasted-text"
        className="min-h-[200px] w-full rounded-lg border border-border bg-background p-3 text-base placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary md:text-sm"
        placeholder="Paste the recipe ingredients and instructions here..."
        value={pastedText}
        onChange={(e) => setPastedText(e.target.value)}
      />
    </div>

    <button
      type="button"
      onClick={onTryAnotherUrl}
      className="flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Try a different URL
    </button>
  </Stack>
)
