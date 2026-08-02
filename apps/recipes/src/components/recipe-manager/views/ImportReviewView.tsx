import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ChefHat,
  Loader2,
  RefreshCw,
  Trash2,
  AlertCircle,
  CloudOff,
  Inbox,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Stack, Inline } from '@/components/ui/layout'
import { ResponsiveModal } from '@/components/ui/ResponsiveModal'
import { ViewSkeleton } from '@/components/ui/ViewSkeleton'
import { RecipeEditor } from '../RecipeEditor'
import { useImports } from '../../../lib/hooks/useImports'
import { photoUrl, reviewImportJob } from '../../../lib/services/imports-api'
import { describeTimeRemaining } from '../../../lib/services/import-batches'
import { confirm } from '../../../lib/dialogStore'
import type { ImportJob, Recipe } from '../../../lib/types'

interface ImportReviewViewProps {
  onClose: () => void
  onSaveRecipe: (recipe: Partial<Recipe>) => Promise<{ success: boolean; savedId?: string } | void>
}

/**
 * What the user comes back to. One card per photographed recipe: the ones that read successfully
 * are waiting to be checked and kept, the ones that failed say so and offer another go.
 *
 * Nothing here has reached the library yet. A card becomes a recipe only when it is accepted,
 * which is the point of holding results on the job rather than creating draft recipes.
 */
export const ImportReviewView: React.FC<ImportReviewViewProps> = ({ onClose, onSaveRecipe }) => {
  const { jobs, summary, loading, error, refresh } = useImports()
  const [reviewing, setReviewing] = useState<ImportJob | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const act = async (job: ImportJob, action: 'discard' | 'retry') => {
    if (action === 'discard') {
      const sure = await confirm(
        'The photo stays in your uploads, but this reading is thrown away.',
        'Discard this one?',
      )
      if (!sure) return
    }
    setBusyId(job.id)
    await reviewImportJob(job.id, action)
    await refresh()
    setBusyId(null)
  }

  /** Accepting saves through the same path as any other new recipe, then records the outcome so
   * the card stops asking for attention. */
  const accept = async (recipe: Partial<Recipe>) => {
    const job = reviewing
    const result = await onSaveRecipe(recipe)
    if (result && result.success === false) return result

    if (job) {
      await reviewImportJob(job.id, 'accept', result?.savedId)
      setReviewing(null)
      await refresh()
    }
    return result
  }

  if (loading && jobs.length === 0) return <ViewSkeleton variant="list" />

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center gap-2 px-4">
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-foreground hover:bg-muted"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="mb-0 font-display text-xl font-bold text-foreground">Imported photos</h2>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl p-4">
        <Stack spacing="md">
          {summary.serviceOffline && (
            <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
              <CloudOff className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Waiting on the import service</p>
                <p className="text-amber-600 dark:text-amber-500">
                  These are queued but nothing has picked them up yet. They will start on their own
                  once it is back — your photos are safe.
                </p>
              </div>
            </div>
          )}

          {summary.inProgress > 0 && !summary.serviceOffline && (
            <Inline spacing="sm" className="rounded-xl border border-border bg-muted/30 p-4">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Reading {summary.inProgress} more — {describeTimeRemaining(summary.inProgress)} to
                go. You can leave this open or close the app.
              </span>
            </Inline>
          )}

          {error && (
            <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {jobs.length === 0 && !loading && (
            <Stack spacing="md" className="items-center py-16 text-center">
              <div className="rounded-full bg-muted p-4">
                <Inbox className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">
                Nothing waiting. Photos you import in bulk will show up here.
              </p>
            </Stack>
          )}

          {jobs.map((job) => (
            <ImportCard
              key={job.id}
              job={job}
              busy={busyId === job.id}
              onReview={() => setReviewing(job)}
              onDiscard={() => act(job, 'discard')}
              onRetry={() => act(job, 'retry')}
            />
          ))}
        </Stack>
      </div>

      <ResponsiveModal
        isOpen={!!reviewing}
        onClose={() => setReviewing(null)}
        title="Check this recipe"
      >
        {reviewing && (
          <RecipeEditor
            recipe={toDraftRecipe(reviewing)}
            onSave={accept}
            onCancel={() => setReviewing(null)}
            onDelete={() => setReviewing(null)}
            isEmbedded={true}
            // Without this the editor would offer to import a recipe *into* the recipe being
            // reviewed: it decides by `recipe.id`, and a parsed-but-unaccepted card has no id yet.
            showImporter={false}
          />
        )}
      </ResponsiveModal>
    </div>
  )
}

/** The parsed fields plus the photographed page as the recipe's source image. */
function toDraftRecipe(job: ImportJob): Partial<Recipe> {
  return {
    ...(job.parsedRecipe ?? {}),
    id: undefined,
    sourceImage: job.photoKeys[0] ? photoUrl(job.photoKeys[0]) : undefined,
  }
}

interface ImportCardProps {
  job: ImportJob
  busy: boolean
  onReview: () => void
  onDiscard: () => void
  onRetry: () => void
}

const ImportCard: React.FC<ImportCardProps> = ({ job, busy, onReview, onDiscard, onRetry }) => {
  const done = job.status === 'complete'
  const failed = job.status === 'error'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
      className="flex gap-3 rounded-xl border border-border bg-card p-3 shadow-sm"
    >
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-black/5">
        {job.photoKeys[0] ? (
          <img src={photoUrl(job.photoKeys[0])} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ChefHat className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="min-w-0">
          <h4 className="line-clamp-2 font-display text-lg font-bold leading-tight text-foreground">
            {done
              ? (job.parsedRecipe?.title ?? 'Untitled recipe')
              : failed
                ? 'Could not read this photo'
                : 'Reading…'}
          </h4>

          {job.photoKeys.length > 1 && (
            <span className="text-xs font-medium text-muted-foreground">
              {job.photoKeys.length} pages
            </span>
          )}

          {job.partialFailure === 'instructions' && done && (
            <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-500">
              The steps did not come through — check them before saving.
            </p>
          )}

          {failed && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {job.error ?? 'Something went wrong.'}
            </p>
          )}
        </div>

        <Inline spacing="xs" className="mt-2">
          {done && (
            <Button size="sm" onClick={onReview} disabled={busy}>
              Check &amp; save
            </Button>
          )}
          {failed && (
            <Button size="sm" variant="outline" onClick={onRetry} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-4 w-4" />
              )}
              Try again
            </Button>
          )}
          {!done && !failed && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {job.status === 'pending' ? 'Queued' : 'Reading the page'}
            </span>
          )}

          {(done || failed) && (
            <button
              type="button"
              onClick={onDiscard}
              disabled={busy}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label="Discard"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </Inline>
      </div>
    </motion.div>
  )
}
