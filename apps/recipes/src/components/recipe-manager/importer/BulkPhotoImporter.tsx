import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Link2, Link2Off, Trash2, ChefHat, ArrowLeft, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Stack, Inline } from '@/components/ui/layout'
import { submitImportBatch } from '../../../lib/services/imports-api'
import { MAX_BATCH_PHOTOS } from '../../../lib/services/import-batches'
import {
  groupPhotos,
  recipeNumberAt,
  pageNumberAt,
  removePhotoAt,
  type BulkPhoto,
} from './grouping'

interface BulkPhotoImporterProps {
  photos: BulkPhoto[]
  /** Still uploading — the user can already see and arrange what has landed. */
  uploading: boolean
  onChange: (photos: BulkPhoto[]) => void
  onBack: () => void
  onQueued: (total: number) => void
}

/**
 * Arranges a stack of uploaded photos into recipes before queueing them. Each photo starts as its
 * own recipe; joining one to the photo above marks it as a continuation page of that recipe.
 */
export const BulkPhotoImporter: React.FC<BulkPhotoImporterProps> = ({
  photos,
  uploading,
  onChange,
  onBack,
  onQueued,
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const groups = groupPhotos(photos)
  const overLimit = photos.length > MAX_BATCH_PHOTOS

  const toggleJoin = (index: number) => {
    onChange(
      photos.map((photo, i) =>
        i === index ? { ...photo, joinedWithPrevious: !photo.joinedWithPrevious } : photo,
      ),
    )
  }

  const remove = (index: number) => onChange(removePhotoAt(photos, index))

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    const result = await submitImportBatch(groups)
    setSubmitting(false)

    if (!result.ok) {
      setError(result.error)
      return
    }
    onQueued(result.total)
  }

  return (
    <Stack spacing="lg">
      <Inline spacing="none" justify="between">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 cursor-pointer items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Start over
        </button>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {groups.length} {groups.length === 1 ? 'recipe' : 'recipes'} · {photos.length} photos
        </span>
      </Inline>

      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Each photo becomes its own recipe. If a recipe runs across two pages, tap{' '}
        <span className="font-medium text-foreground">Same recipe</span> on the second page.
      </div>

      <Stack spacing="sm">
        {photos.map((photo, index) => {
          const recipeNumber = recipeNumberAt(photos, index)
          const isContinuation = photo.joinedWithPrevious && index > 0

          return (
            <motion.div
              key={photo.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              className={`flex gap-3 rounded-xl border bg-card p-2.5 transition-all ${
                isContinuation ? 'ml-6 border-primary/20 bg-accent/40' : 'border-border shadow-sm'
              }`}
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-black/5">
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                <span className="text-sm font-bold text-foreground">
                  {isContinuation
                    ? `Page ${pageNumberAt(photos, index)} of recipe ${recipeNumber}`
                    : `Recipe ${recipeNumber}`}
                </span>

                <Inline spacing="xs">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleJoin(index)}
                      className={`flex h-11 cursor-pointer items-center gap-1.5 rounded-full border-2 px-3 text-xs font-bold transition-colors ${
                        photo.joinedWithPrevious
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                      }`}
                      aria-pressed={photo.joinedWithPrevious}
                    >
                      {photo.joinedWithPrevious ? (
                        <Link2 className="h-4 w-4" />
                      ) : (
                        <Link2Off className="h-4 w-4" />
                      )}
                      Same recipe
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove photo ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Inline>
              </div>
            </motion.div>
          )
        })}
      </Stack>

      {uploading && (
        <Inline spacing="sm" className="text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Still uploading the rest…
        </Inline>
      )}

      {(error || overLimit) && (
        <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error ?? `You can import up to ${MAX_BATCH_PHOTOS} photos at once.`}</span>
        </div>
      )}

      <Button
        className="w-full"
        size="lg"
        onClick={submit}
        disabled={submitting || uploading || overLimit || photos.length === 0}
      >
        {submitting ? <Loader2 className="animate-spin" /> : <ChefHat />}
        {submitting
          ? 'Sending…'
          : `Import ${groups.length} ${groups.length === 1 ? 'recipe' : 'recipes'}`}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        These are read in the background. You can close the app — the Add button will show a badge
        when they are ready for you.
      </p>
    </Stack>
  )
}
