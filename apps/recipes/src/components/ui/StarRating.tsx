import React from 'react'
import { Star } from 'lucide-react'

interface StarRatingProps {
  rating?: number
  onRate?: (rating: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating = 0,
  onRate,
  readonly = false,
  size = 'md',
}) => {
  const [hoverRating, setHoverRating] = React.useState<number>(0)

  const stars = [1, 2, 3, 4, 5]

  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'

  return (
    <div className="flex items-center" onMouseLeave={() => setHoverRating(0)}>
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (!readonly && onRate) onRate(star)
          }}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          className={`p-0.5 transition-all ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          disabled={readonly}
          aria-label={`Rate ${star} stars`}
        >
          <Star
            className={`${iconSize} ${
              (hoverRating || rating) >= star
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-transparent text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  )
}
