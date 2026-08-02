import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Loader2,
  Link2,
  Link2Off,
  Trash2,
  ChefHat,
  ArrowLeft,
  AlertCircle,
  Maximize2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Stack, Inline } from '@/components/ui/layout'
import { ImageViewer } from '@/components/ui/ImageViewer'
import { submitImportBatch } from '../../../lib/services/imports-api'
import { MAX_BATCH_PHOTOS } from '../../../lib/services/import-batches'
import { groupPhotos, photoLabelAt, removePhotoAt, type BulkPhoto } from './grouping'

/** The one control that does the grouping. It appears on the card and again in the full-size
 * viewer, where it sits on black and needs its own unselected colours. */
const SameRecipeToggle: React.FC<{
  joined: boolean
  onToggle: () => void
  label?: string
  offClassName?: string
}> = ({
  joined,
  onToggle,
  label = 'Same recipe',
  offClassName = 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground',
}) => (
  <button
    type="button"
    onClick={onToggle}
    aria-pressed={joined}
    className={`flex h-11 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border-2 px-3 text-xs font-bold transition-colors ${
      joined ? 'border-primary bg-primary text-primary-foreground' : offClassName
    }`}
  >
    {joined ? <Link2 className="h-4 w-4" /> : <Link2Off className="h-4 w-4" />}
    {label}
  </button>
)

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
  /** Which photo is open full-size, if any. Deciding whether two pages are the same recipe means
   * actually reading them, which an 80px card thumbnail can't support. */
  const [viewing, setViewing] = useState<number | null>(null)

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
        <span className="font-medium text-foreground">Same recipe</span> on the second page. Tap a
        photo to read it full size and swipe between them.
      </div>

      <Stack spacing="sm">
        {photos.map((photo, index) => {
          const label = photoLabelAt(photos, index)
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
              {/* Portrait and anchored to the top: a recipe page's title is what identifies it,
                  and a centred square crop is exactly the part that throws the title away. */}
              <button
                type="button"
                onClick={() => setViewing(index)}
                aria-label={`See ${label.toLowerCase()} full size`}
                className="group relative h-32 w-24 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-muted ring-1 ring-black/5"
              >
                <img
                  src={photo.url}
                  alt=""
                  className="h-full w-full object-cover object-top transition-transform group-hover:scale-105"
                />
                <span className="absolute bottom-1 right-1 rounded-full bg-black/55 p-1 text-white">
                  <Maximize2 className="h-3.5 w-3.5" />
                </span>
              </button>

              {/* Delete sits on the label row rather than beside the toggle: the two together no
                  longer fit one line next to a photo this size, and an indented continuation card
                  is the narrowest case. */}
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <Inline spacing="xs" justify="between" align="start" className="w-full">
                  <span className="pt-2.5 text-sm font-bold text-foreground">{label}</span>

                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="-mr-1 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove photo ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Inline>

                {index > 0 && (
                  <Inline spacing="xs">
                    <SameRecipeToggle
                      joined={photo.joinedWithPrevious}
                      onToggle={() => toggleJoin(index)}
                    />
                  </Inline>
                )}
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

      {/* Full size, with the grouping control on the same screen: telling a second page from a new
          recipe is a decision made while looking at the photo, not after closing it. */}
      {viewing !== null && photos[viewing] && (
        <ImageViewer
          isOpen
          imageUrl={photos[viewing].url}
          alt={photoLabelAt(photos, viewing)}
          caption={photoLabelAt(photos, viewing)}
          onClose={() => setViewing(null)}
          onPrev={viewing > 0 ? () => setViewing(viewing - 1) : undefined}
          onNext={viewing < photos.length - 1 ? () => setViewing(viewing + 1) : undefined}
          footer={
            <>
              {viewing > 0 && (
                <SameRecipeToggle
                  joined={photos[viewing].joinedWithPrevious}
                  onToggle={() => toggleJoin(viewing)}
                  label="Same recipe as the photo before"
                  offClassName="border-white/40 bg-white/10 text-white hover:bg-white/20"
                />
              )}
              <span className="text-xs font-medium text-white/70">
                Photo {viewing + 1} of {photos.length}
              </span>
            </>
          }
        />
      )}
    </Stack>
  )
}
