import React, { useState } from 'react'
import { Check, Camera, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@nanostores/react'
import { $cookingSession } from '../../stores/cookingSession'

interface CookingReviewProps {
  onComplete: (data: { rating: number; notes: string; image: string | null }) => void
}

export const CookingReview: React.FC<CookingReviewProps> = ({ onComplete }) => {
  const session = useStore($cookingSession)
  const recipe = session.recipe

  const [rating, setRating] = useState(recipe?.rating || 0)
  const [notes, setNotes] = useState(recipe?.userNotes || '')
  const [image, setImage] = useState<string | null>(recipe?.finishedImage || null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = () => {
    onComplete({ rating, notes, image })
  }

  if (!recipe) return null

  return (
    <div className="flex h-full flex-col bg-background duration-500 animate-in fade-in">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-6 text-center">
          <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
            <Check className="h-10 w-10 stroke-[3]" />
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-3xl font-bold">All Done!</h2>
            <p className="text-muted-foreground">How did {recipe.title} turn out?</p>
          </div>

          {/* Rating */}
          <div className="flex w-full flex-col gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Rate this recipe
            </h3>
            <div className="flex justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-2 transition-transform active:scale-95"
                >
                  <Star
                    className={`h-8 w-8 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Photo */}
          <div className="flex w-full flex-col gap-2">
            <label
              htmlFor="review-photo-upload"
              className="text-sm font-bold uppercase tracking-wider text-muted-foreground"
            >
              Add a photo
            </label>
            <div
              className="relative flex aspect-video w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/30 transition-colors hover:bg-muted/50"
              onClick={() => document.getElementById('review-photo-upload')?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  document.getElementById('review-photo-upload')?.click()
                }
              }}
            >
              {image ? (
                <img
                  src={image}
                  className="absolute inset-0 h-full w-full object-cover"
                  alt="Finished dish"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Camera className="h-8 w-8" />
                  <span className="text-sm font-medium">Tap to snap</span>
                </div>
              )}
              <input
                id="review-photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="flex w-full flex-col gap-2">
            <label
              htmlFor="review-notes"
              className="text-sm font-bold uppercase tracking-wider text-muted-foreground"
            >
              Private Notes
            </label>
            <textarea
              id="review-notes"
              placeholder="What would you change next time?"
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="safe-area-pb border-t border-border bg-background p-4">
        <Button
          size="lg"
          className="h-14 w-full rounded-xl text-lg font-bold shadow-lg shadow-primary/20"
          onClick={handleSubmit}
        >
          Complete Review
        </Button>
      </div>
    </div>
  )
}
