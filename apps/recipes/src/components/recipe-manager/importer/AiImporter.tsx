import React, { useState } from 'react'
import { Loader2, ChefHat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Recipe } from '../../../lib/types'
import { processImage } from '../../../lib/image-optimization'
import { SourceToggle, type InputMode } from './SourceToggle'
import { PhotoUploader } from './PhotoUploader'
import { Stack } from '@/components/ui/layout'

import { uploadImage, parseRecipe } from './api'

type Status = 'idle' | 'processing' | 'error'

interface AiImporterProps {
  onRecipeParsed: (recipe: Recipe) => void
}

export const AiImporter: React.FC<AiImporterProps> = ({ onRecipeParsed }) => {
  const [mode, setMode] = useState<InputMode>('photo')
  const [url, setUrl] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageData, setImageData] = useState<string | null>(null) // Base64 data for AI
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [internalIsUploading, setInternalIsUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return

    const originalFile = e.target.files[0]
    setInternalIsUploading(true)

    try {
      const file = await processImage(originalFile)

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

      const publicUrl = await uploadImage(file, baseUrl)
      if (publicUrl) {
        setImagePreview(publicUrl)
      } else {
        console.error('Failed to upload image - base64 will be used directly')
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setInternalIsUploading(false)
    }
  }

  const handleProcess = async () => {
    setStatus('processing')
    setErrorMsg('')
    try {
      const payload: { url?: string; image?: string } = {}
      if (mode === 'url') {
        if (!url) throw new Error('Please enter a URL')
        payload.url = url
      } else {
        if (!imageData) throw new Error('Please select an image')
        if (imageData.length > 1024 * 1024 * 4) {
          throw new Error('The image is too large. Please try a smaller photo.')
        }
        payload.image = imageData
      }

      const baseUrl = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`

      const data = await parseRecipe(payload, baseUrl)

      const recipeWithSource = {
        ...(data as object),
        sourceImage: mode === 'photo' ? imagePreview : undefined,
      } as Recipe

      onRecipeParsed(recipeWithSource)
      setStatus('idle')
    } catch (err: unknown) {
      console.error(err)
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-md">
      <SourceToggle mode={mode} setMode={setMode} />

      <Stack spacing="lg">
        {mode === 'photo' ? (
          <PhotoUploader
            imagePreview={imagePreview}
            onRemove={() => {
              setImagePreview(null)
              setImageData(null)
            }}
            handleFileChange={handleFileChange}
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
            (mode === 'url' && !url) ||
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
              ? 'Consulting Chef Gemini...'
              : 'Process Recipe'}
        </Button>
      </Stack>
    </div>
  )
}
