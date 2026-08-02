import React from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Stack } from '@/components/ui/layout'

interface BatchQueuedPanelProps {
  total: number
  onDone: () => void
}

/**
 * The end of the bulk-import screen's job. The work is now on the server, so this says so plainly
 * and tells the user they are free to leave — which is the whole reason the feature exists, and
 * not something they should have to infer from a spinner that keeps spinning.
 */
export const BatchQueuedPanel: React.FC<BatchQueuedPanelProps> = ({ total, onDone }) => (
  <div className="rounded-xl border border-border bg-card p-6 shadow-md">
    <Stack spacing="md" className="items-center text-center">
      <div className="rounded-full bg-primary/10 p-4">
        <CheckCircle2 className="h-8 w-8 text-primary" />
      </div>
      <h3 className="mb-0 font-display text-lg font-bold text-foreground">
        {total} {total === 1 ? 'recipe is' : 'recipes are'} being read
      </h3>
      <p className="text-sm text-muted-foreground">
        This takes a few minutes. Close the app if you like — the Add button will show a badge when
        they are ready to check.
      </p>
      <Button className="w-full" size="lg" onClick={onDone}>
        Done
      </Button>
    </Stack>
  </div>
)
