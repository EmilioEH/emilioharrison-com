import React, { useState } from 'react'
import { Camera, Link as LinkIcon, Loader2, Upload, Trash2, ChefHat } from 'lucide-react'
import { Button } from '../ui/Button'
import type { Recipe } from '../../lib/types'
import { processImage } from '../../lib/image-optimization'

type InputMode = 'photo' | 'url'
type Status = 'idle' | 'processing' | 'error'

const SourceToggle = ({ mode, setMode }: { mode: InputMode; setMode: (m: InputMode) => void }) => (
  <div className="mb-6 flex border-b border-md-sys-color-outline">
    <button
      className={`flex-1 py-3 text-center font-medium uppercase tracking-wider transition-colors ${
        mode === 'photo'
          ? 'bg-md-sys-color-primary text-md-sys-color-on-primary'
          : 'hover:bg-md-sys-color-primary/[0.08] text-md-sys-color-on-surface-variant'
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
          ? 'bg-md-sys-color-primary text-md-sys-color-on-primary'
          : 'hover:bg-md-sys-color-primary/[0.08] text-md-sys-color-on-surface-variant'
      }`}
      onClick={() => setMode('url')}
    >
      <div className="flex items-center justify-center gap-2">
        <LinkIcon className="h-4 w-4" /> URL
      </div>
    </button>
  </div>
)

const PhotoUploader = ({
  imagePreview,
  onRemove,
  handleFileChange,
}: {
  imagePreview: string | null
  onRemove: () => void
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) => (
  <div
    className={`bg-md-sys-color-surface-variant/10 flex h-64 w-full flex-col items-center justify-center rounded-md-xl border border-dashed border-md-sys-color-outline transition-colors ${
      imagePreview ? 'border-none p-0' : 'group relative'
    }`}
  >
    {imagePreview ? (
      <div className="relative h-full w-full">
        <img
          src={imagePreview}
          className="h-full w-full rounded-md-xl object-cover"
          alt="Preview"
        />
        <button
          onClick={onRemove}
          className="bg-md-sys-color-surface/90 absolute right-2 top-2 rounded-full p-2 shadow-md-1 hover:text-md-sys-color-error"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    ) : (
      <div className="flex w-full flex-col items-center gap-4 p-6">
        <div className="mb-2 rounded-full bg-md-sys-color-surface p-4 shadow-md-1">
          <Upload className="h-8 w-8 text-md-sys-color-on-surface-variant" />
        </div>
        <p className="text-sm font-medium text-md-sys-color-on-surface-variant">
          Add a photo of your dish
        </p>

        <div className="flex w-full gap-3">
          <div className="relative flex-1">
            <Button fullWidth intent="secondary">
              <Upload className="mr-2 h-4 w-4" /> Gallery
            </Button>
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handleFileChange}
            />
          </div>

          <div className="relative flex-1">
            <Button fullWidth>
              <Camera className="mr-2 h-4 w-4" /> Camera
            </Button>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>
    )}
  </div>
)

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
    if (e.target.files && e.target.files[0]) {
      const originalFile = e.target.files[0]

      // Upload to R2 (or whatever backend)
      setInternalIsUploading(true)
      try {
        // Optimize first
        const file = await processImage(originalFile)

        // Read as base64 for AI processing AND preview
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = reader.result as string
          setImagePreview(base64) // Use base64 for preview initially
          setImageData(base64) // Keep base64 for AI processing
        }
        reader.readAsDataURL(file)

        // Also upload to storage for permanent hosting (optional)
        const formData = new FormData()
        formData.append('file', file)

        const baseUrl = import.meta.env.BASE_URL.endsWith('/')
          ? import.meta.env.BASE_URL
          : `${import.meta.env.BASE_URL}/`

        const res = await fetch(`${baseUrl}api/uploads`, {
          method: 'POST',
          body: formData,
        })

        if (res.ok) {
          const { key } = await res.json()
          const publicUrl = `${baseUrl}api/uploads/${key}`
          setImagePreview(publicUrl) // Switch preview to URL for faster display
          // Keep imageData as base64 for AI processing
        } else {
          console.error('Failed to upload image - base64 will be used directly')
        }
      } catch (err) {
        console.error('Upload error', err)
        setErrorMsg('Network error while uploading image.')
      } finally {
        setInternalIsUploading(false)
      }
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
        // Use imageData (base64) for AI processing, not imagePreview (which might be a URL)
        if (!imageData) throw new Error('Please select an image')
        if (imageData.length > 1024 * 1024 * 4) {
          throw new Error('The image is too large. Please try a smaller photo.')
        }
        payload.image = imageData
      }

      const baseUrl = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`
      const res = await fetch(`${baseUrl}api/parse-recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        let errMsg = `Failed: ${res.status} ${res.statusText}`
        try {
          const textBody = await res.text()
          const errData = JSON.parse(textBody)
          if (errData.error) errMsg = errData.error
        } catch {
          // ignore
        }
        throw new Error(errMsg)
      }
      const data = await res.json()

      const recipeWithSource = {
        ...data,
        sourceImage: mode === 'photo' ? imagePreview : undefined,
      }

      onRecipeParsed(recipeWithSource)
      setStatus('idle')
    } catch (err: unknown) {
      console.error(err)
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    }
  }

  return (
    <div className="rounded-md-xl border border-md-sys-color-outline bg-md-sys-color-surface p-6 shadow-md-2">
      <SourceToggle mode={mode} setMode={setMode} />

      <div className="space-y-6">
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
          <div className="space-y-2">
            <label
              htmlFor="url-input"
              className="text-sm font-medium uppercase tracking-wider text-md-sys-color-on-surface-variant"
            >
              Paste Recipe Link
            </label>
            <input
              id="url-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://cooking.nytimes.com/..."
              className="bg-md-sys-color-surface-variant/20 w-full rounded-md-l border border-md-sys-color-outline p-4 font-mono text-sm outline-none transition-all focus:ring-2 focus:ring-md-sys-color-primary"
            />
            <p className="text-xs text-md-sys-color-on-surface-variant">
              We&apos;ll scrape the ingredients and instructions for you.
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="animate-in shake rounded-md-s border border-md-sys-color-error bg-md-sys-color-error-container p-4 text-sm font-medium text-md-sys-color-on-error-container">
            {errorMsg}
          </div>
        )}

        <Button
          fullWidth
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
      </div>
    </div>
  )
}
