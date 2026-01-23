import React from 'react'
import { Check } from 'lucide-react'
import { Cluster } from '@/components/ui/layout'

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
  if (images.length === 0) return null

  return (
    <div className="w-full">
      {/* Mobile: Horizontal scroll with snap */}
      <div className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent flex gap-3 overflow-x-auto pb-2 sm:hidden">
        {images.map((image, index) => (
          <ImageCard
            key={image.url}
            image={image}
            isSelected={selectedImage === image.url}
            onSelect={() => onSelect(image.url)}
            index={index}
            isMobile
          />
        ))}
      </div>

      {/* Desktop: Grid layout */}
      <Cluster spacing="md" className="hidden sm:flex">
        {images.map((image, index) => (
          <ImageCard
            key={image.url}
            image={image}
            isSelected={selectedImage === image.url}
            onSelect={() => onSelect(image.url)}
            index={index}
          />
        ))}
      </Cluster>
    </div>
  )
}

interface ImageCardProps {
  image: CandidateImage
  isSelected: boolean
  onSelect: () => void
  index: number
  isMobile?: boolean
}

const ImageCard: React.FC<ImageCardProps> = ({
  image,
  isSelected,
  onSelect,
  index,
  isMobile = false,
}) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative overflow-hidden rounded-lg transition-all ${isMobile ? 'min-w-[80vw] snap-center' : 'min-w-[200px] max-w-[300px] flex-1'} ${
        isSelected
          ? 'shadow-lg ring-4 ring-primary'
          : 'shadow-md ring-2 ring-border hover:ring-primary/50'
      } `}
      aria-label={`Select image ${index + 1}${image.alt ? `: ${image.alt}` : ''}`}
      aria-pressed={isSelected}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted">
        <img
          src={image.url}
          alt={image.alt || `Recipe image ${index + 1}`}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />

        {/* Selected checkmark overlay */}
        {isSelected && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/20 animate-in fade-in">
            <div className="rounded-full bg-primary p-2 shadow-lg">
              <Check className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
        )}

        {/* Default badge */}
        {image.isDefault && !isSelected && (
          <div className="absolute left-2 top-2 rounded-md bg-primary/90 px-2 py-1 text-xs font-bold text-primary-foreground shadow-md">
            Recommended
          </div>
        )}
      </div>

      {/* Alt text label (if available) */}
      {image.alt && (
        <div className="bg-card p-2 text-left">
          <p className="line-clamp-1 text-xs text-muted-foreground">{image.alt}</p>
        </div>
      )}
    </button>
  )
}
