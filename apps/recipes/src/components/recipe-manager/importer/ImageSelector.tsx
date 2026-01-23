import React, { useState } from 'react'
import { Check, X, ZoomIn } from 'lucide-react'
import { Stack } from '@/components/ui/layout'
import { createPortal } from 'react-dom'

interface CandidateImage {
  url: string
  alt?: string
  isDefault?: boolean
}

interface ImageSelectorProps {
  images: CandidateImage[]
  selectedImage: string | null
  onSelect: (url: string) => void
}

export const ImageSelector: React.FC<ImageSelectorProps> = ({
  images,
  selectedImage,
  onSelect,
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  if (images.length === 0) return null

  return (
    <>
      <Stack spacing="sm">
        <label className="text-xs font-bold uppercase text-muted-foreground">
          Choose Recipe Image ({images.length} found)
        </label>

        {/* Vertical scrollable grid */}
        <div className="bg-card-variant/30 grid max-h-[400px] grid-cols-2 gap-3 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <ThumbnailCard
              key={image.url}
              image={image}
              isSelected={selectedImage === image.url}
              onSelect={() => onSelect(image.url)}
              onPreview={() => setPreviewImage(image.url)}
              index={index}
            />
          ))}
        </div>
      </Stack>

      {/* Fullscreen Preview Modal */}
      {previewImage &&
        createPortal(
          <FullscreenPreview imageUrl={previewImage} onClose={() => setPreviewImage(null)} />,
          document.body,
        )}
    </>
  )
}

interface ThumbnailCardProps {
  image: CandidateImage
  isSelected: boolean
  onSelect: () => void
  onPreview: () => void
  index: number
}

const ThumbnailCard: React.FC<ThumbnailCardProps> = ({
  image,
  isSelected,
  onSelect,
  onPreview,
  index,
}) => {
  return (
    <div className="group relative">
      {/* Main thumbnail - click to select */}
      <button
        type="button"
        onClick={onSelect}
        className={`relative w-full overflow-hidden rounded-lg transition-all ${
          isSelected
            ? 'shadow-lg ring-4 ring-primary'
            : 'shadow-sm ring-2 ring-border hover:ring-primary/50'
        }`}
        aria-label={`Select image ${index + 1}${image.alt ? `: ${image.alt}` : ''}`}
        aria-pressed={isSelected}
      >
        <div className="relative aspect-square bg-muted">
          <img
            src={image.url}
            alt={image.alt || `Recipe image ${index + 1}`}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />

          {/* Selected checkmark */}
          {isSelected && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/20 animate-in fade-in">
              <div className="rounded-full bg-primary p-1.5 shadow-lg">
                <Check className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
          )}

          {/* Recommended badge */}
          {image.isDefault && !isSelected && (
            <div className="absolute left-1 top-1 rounded bg-primary/90 px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground shadow-md">
              Rec
            </div>
          )}
        </div>
      </button>

      {/* Expand button */}
      <button
        type="button"
        onClick={onPreview}
        className="absolute right-1 top-1 rounded-full bg-black/60 p-1.5 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
        aria-label="Preview fullscreen"
      >
        <ZoomIn className="h-3.5 w-3.5 text-white" />
      </button>
    </div>
  )
}

interface FullscreenPreviewProps {
  imageUrl: string
  onClose: () => void
}

const FullscreenPreview: React.FC<FullscreenPreviewProps> = ({ imageUrl, onClose }) => {
  // Handle ESC key and scroll lock
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in">
      {/* Backdrop - interactive to satisfy accessibility but marked as decoration */}
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/90"
        onClick={onClose}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Dialog container */}
      <div
        role="dialog"
        aria-label="Image preview"
        aria-modal="true"
        className="relative z-10 flex max-h-full max-w-full items-center justify-center"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -right-2 -top-12 rounded-full bg-white/10 p-2 backdrop-blur-sm transition-colors hover:bg-white/20 sm:-right-12 sm:top-0"
          aria-label="Close preview"
        >
          <X className="h-6 w-6 text-white" />
        </button>

        {/* Image container */}
        <div className="max-h-full max-w-full overflow-hidden rounded-lg shadow-2xl">
          <img
            src={imageUrl}
            alt="Recipe preview"
            className="max-h-[85dvh] w-auto max-w-full object-contain"
          />
        </div>
      </div>
    </div>
  )
}
