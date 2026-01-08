import React, { useState, useRef } from 'react'
import { Plus, Image as ImageIcon } from 'lucide-react'
import { Button } from './button'

interface CarouselProps {
  images: string[]
  onAddPhoto?: () => void
  onImageClick?: (image: string) => void
  className?: string
}

export const Carousel: React.FC<CarouselProps> = ({
  images,
  onAddPhoto,
  onImageClick,
  className = '',
}) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const handleScroll = () => {
    if (!scrollContainerRef.current) return
    const { scrollLeft, clientWidth } = scrollContainerRef.current
    const index = Math.round(scrollLeft / clientWidth)
    setActiveIndex(index)
  }

  // Combined list of items: existing images + "Add Photo" placeholder if empty?
  // Actually, usually "Add Photo" is an action, not a slide, or maybe the last slide?
  // Requirements say "allow user to add photos... if added, put it first".
  // So we just show the images. If images array is empty, maybe show a placeholder with "Add".

  const hasImages = images.length > 0

  return (
    <div className={`group relative ${className}`}>
      {/* Scroll Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="scrollbar-hide flex aspect-video w-full touch-pan-x snap-x snap-mandatory overflow-x-auto bg-muted/30"
      >
        {hasImages ? (
          images.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className="relative h-full w-full flex-shrink-0 snap-center"
            >
              <button
                onClick={() => onImageClick?.(src)}
                className="block h-full w-full cursor-zoom-in"
                aria-label={`View photo ${index + 1}`}
              >
                <img
                  src={src}
                  alt={`Recipe view ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            </div>
          ))
        ) : (
          <div className="flex h-full w-full flex-shrink-0 snap-center flex-col items-center justify-center gap-2 bg-muted/50 text-muted-foreground">
            <ImageIcon className="h-12 w-12 opacity-50" />
            <span className="text-sm font-medium">No photos yet</span>
          </div>
        )}
      </div>

      {/* Pagination Dots */}
      {hasImages && images.length > 1 && (
        <div className="pointers-events-none absolute bottom-4 left-0 right-0 z-10 flex justify-center gap-1.5">
          {images.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === activeIndex
                  ? 'w-6 bg-white shadow-sm'
                  : 'w-1.5 bg-white/50 backdrop-blur-sm'
              }`}
            />
          ))}
        </div>
      )}

      {/* Add Photo FAB - positioned absolute */}
      {onAddPhoto && (
        <div className="absolute right-4 top-4 z-10">
          <Button
            size="sm"
            variant="secondary"
            className="h-9 rounded-full bg-white/90 px-3 text-foreground shadow-lg backdrop-blur transition-transform hover:bg-white active:scale-95"
            onClick={onAddPhoto}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Add Photo</span>
          </Button>
        </div>
      )}
    </div>
  )
}
