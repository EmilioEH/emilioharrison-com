import React, { useState } from 'react'
import { Loader2, ChefHat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAiImporter } from '../../../lib/hooks/useAiImporter'
import { SourceToggle, type InputMode } from './SourceToggle'
import { PhotoUploader } from './PhotoUploader'
import { BulkPhotoImporter } from './BulkPhotoImporter'
import { BatchQueuedPanel } from './BatchQueuedPanel'
import { BlockedSiteFallback } from './BlockedSiteFallback'
import { useBulkPhotoUpload } from '../../../lib/hooks/useBulkPhotoUpload'
import { Stack } from '@/components/ui/layout'
import { AiProgressBar } from '@/components/ui/AiProgressBar'
import { uploadImage } from './api'
import { processImage, createThumbnail } from '../../../lib/image-optimization'
import type { Recipe } from '../../../lib/types'
// Removed blocking LoadingOverlay - using inline feedback instead

interface AiImporterProps {
  onRecipeParsed: (
    recipe: Recipe,
    candidateImages?: Array<{ url: string; alt?: string; isDefault?: boolean }>,
  ) => void
  /** Called once a background batch has been queued, so the surrounding screen can close. */
  onBatchQueued?: (total: number) => void
}

export const AiImporter: React.FC<AiImporterProps> = ({ onRecipeParsed, onBatchQueued }) => {
  const [mode, setMode] = useState<InputMode>('photo')
  const {
    url,
    setUrl,
    imagePreview,
    setImagePreview,
    imageData,
    setImageData,
    setThumbUrl,
    status,
    errorMsg,
    setErrorMsg,
    handleProcess,
    progressMessage,
    // Blocked site fallback
    isBlocked,
    pastedText,
    setPastedText,
    clearBlockedState,
  } = useAiImporter({ onRecipeParsed, mode })

  const [internalIsUploading, setInternalIsUploading] = useState(false)
  const [queuedCount, setQueuedCount] = useState(0)
  const {
    photos: bulkPhotos,
    setPhotos: setBulkPhotos,
    uploading: bulkUploading,
    startBulkUpload,
  } = useBulkPhotoUpload(setErrorMsg)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return

    // More than one photo is a different job: it can't be done while the user waits, so it goes
    // to the background queue instead of the in-request parse below.
    if (e.target.files.length > 1) {
      await startBulkUpload(Array.from(e.target.files))
      return
    }

    const originalFile = e.target.files[0]
    setInternalIsUploading(true)

    try {
      // Optimize image: 1024px max dimension, 0.7 quality
      const file = await processImage(originalFile, 1024, 0.7)
      // Also generate the small library-card thumbnail (P5), from the original file so it isn't
      // a re-compression of an already-downsized JPEG.
      const thumbFile = await createThumbnail(originalFile)

      // Read as base64 for preview and fallback
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        setImagePreview(base64)
        setImageData(base64)
      }
      reader.readAsDataURL(file)

      // Upload to server
      const baseUrl = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`

      const [publicUrl, publicThumbUrl] = await Promise.all([
        uploadImage(file, baseUrl),
        uploadImage(thumbFile, baseUrl),
      ])
      if (publicUrl) {
        // Only update preview with the uploaded URL (for display & sourceImage).
        // imageData stays as base64 — Gemini needs raw bytes, not a URL path.
        setImagePreview(publicUrl)
      } else {
        console.error('Failed to upload image - base64 will be used directly')
      }
      // Thumbnail upload is best-effort: if it fails, the recipe simply has no thumbUrl yet and
      // RecipeCard.tsx falls back to the full image — never a broken card.
      setThumbUrl(publicThumbUrl)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setInternalIsUploading(false)
    }
  }

  // A queued batch is the end of this screen's job: the work now happens on the server and the
  // user is explicitly free to leave.
  if (queuedCount > 0) {
    return <BatchQueuedPanel total={queuedCount} onDone={() => onBatchQueued?.(queuedCount)} />
  }

  if (bulkPhotos) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-md">
        <BulkPhotoImporter
          photos={bulkPhotos}
          uploading={bulkUploading}
          onChange={setBulkPhotos}
          onBack={() => setBulkPhotos(null)}
          onQueued={setQueuedCount}
        />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-md">
      {/* ... (SourceToggle and Inputs remain the same) */}
      <SourceToggle mode={mode} setMode={setMode} />

      <Stack spacing="lg">
        {mode === 'photo' ? (
          <>
            <PhotoUploader
              imagePreview={imagePreview}
              onRemove={() => {
                setImagePreview(null)
                setImageData(null)
              }}
              handleFileChange={handleFileChange}
            />
          </>
        ) : isBlocked ? (
          <BlockedSiteFallback
            pastedText={pastedText}
            setPastedText={setPastedText}
            onTryAnotherUrl={clearBlockedState}
          />
        ) : (
          <Stack spacing="sm">
            <label
              htmlFor="url-input"
              className="text-foreground-variant text-sm font-medium uppercase tracking-wider"
            >
              Paste Recipe Link
            </label>
            <input
              id="url-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://cooking.nytimes.com/..."
              className="bg-card-variant/20 w-full rounded-lg border border-border p-4 font-mono text-sm outline-none transition-all focus:ring-2 focus:ring-primary"
            />
            <p className="text-foreground-variant text-xs">
              We&apos;ll scrape the ingredients and instructions for you.
            </p>
          </Stack>
        )}

        {errorMsg && (
          <div className="shake border-md-sys-color-error bg-md-sys-color-error-container text-md-sys-color-on-error-container rounded-sm border p-4 text-sm font-medium animate-in">
            {errorMsg}
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          onClick={handleProcess}
          disabled={
            status === 'processing' ||
            internalIsUploading ||
            (mode === 'url' && !isBlocked && !url) ||
            (mode === 'url' && isBlocked && !pastedText) ||
            (mode === 'photo' && !imageData)
          }
        >
          {status === 'processing' || internalIsUploading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <ChefHat />
          )}
          {/* Deliberately not a status message. The progress banner below is the single source of
           * truth for what the import is doing; this button used to hardcode "Reading your
           * recipe..." for the entire run, so mid-import the screen said "Reading your
           * recipe..." and "Structuring instructions... (66%)" at the same time — two labels
           * disagreeing, one of them permanently stale. */}
          {internalIsUploading
            ? 'Uploading Photo...'
            : status === 'processing'
              ? 'Importing…'
              : 'Process Recipe'}
        </Button>
      </Stack>

      {(status === 'processing' || internalIsUploading) && (
        <div className="mt-4">
          <ImportProgressBanner uploading={internalIsUploading} message={progressMessage} />
        </div>
      )}
    </div>
  )
}

/**
 * Inline, non-blocking progress for a single in-request import. Deliberately the only place that
 * says what the import is doing — the action button used to carry a second, permanently stale
 * label alongside it, so mid-import the screen contradicted itself.
 */
const ImportProgressBanner: React.FC<{ uploading: boolean; message?: string }> = ({
  uploading,
  message,
}) => {
  if (uploading) {
    return <AiProgressBar progress="30%" message="Uploading Photo..." isAnimating={true} />
  }
  const percent = message?.includes('%') ? `${message.match(/\d+/)?.[0]}%` : '10%'
  return (
    <AiProgressBar
      progress={percent}
      message={message || 'Reading your recipe...'}
      isAnimating={true}
    />
  )
}
