import React, { useState } from 'react'
import { Loader2, ChefHat, ShieldAlert, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAiImporter } from '../../../lib/hooks/useAiImporter'
import { SourceToggle, type InputMode } from './SourceToggle'
import { PhotoUploader } from './PhotoUploader'
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
}

export const AiImporter: React.FC<AiImporterProps> = ({ onRecipeParsed }) => {
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return

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
          /* Blocked site fallback - paste text manually */
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
              onClick={clearBlockedState}
              className="flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Try a different URL
            </button>
          </Stack>
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
          {internalIsUploading
            ? 'Uploading Photo...'
            : status === 'processing'
              ? 'Reading your recipe...'
              : 'Process Recipe'}
        </Button>
      </Stack>

      {/* Inline progress banner - non-blocking */}
      {(status === 'processing' || internalIsUploading) && (
        <div className="mt-4">
          <AiProgressBar
            progress={
              internalIsUploading
                ? '30%'
                : progressMessage?.includes('%')
                  ? progressMessage.match(/\d+/)?.[0] + '%'
                  : '10%'
            }
            message={
              internalIsUploading
                ? 'Uploading Photo...'
                : progressMessage || 'Reading your recipe...'
            }
            isAnimating={true}
          />
        </div>
      )}
    </div>
  )
}
