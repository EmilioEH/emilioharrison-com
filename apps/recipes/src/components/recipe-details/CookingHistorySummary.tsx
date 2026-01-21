import React, { useState, useMemo, useRef } from 'react'
import { Star, ChevronDown, ChevronUp, Camera, X } from 'lucide-react'
import { useStore } from '@nanostores/react'
import { Inline, Stack } from '../ui/layout'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { $currentUserId } from '../../lib/familyStore'
import type { FamilyRecipeData, Review } from '../../lib/types'

interface CookingHistorySummaryProps {
  averageRating: number
  totalRatings: number
  lastCooked?: string
  lastCookedBy?: string
  familyData?: FamilyRecipeData | null
  recipeId?: string
  onRefresh?: () => void
}

export const CookingHistorySummary: React.FC<CookingHistorySummaryProps> = ({
  averageRating,
  totalRatings,
  lastCooked,
  lastCookedBy,
  familyData,
  recipeId,
  onRefresh,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [hoverRating, setHoverRating] = useState<number>(0)

  // NEW: Review form state
  const [reviewRating, setReviewRating] = useState<number>(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewPhoto, setReviewPhoto] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Get current user ID from nanostore (set during app initialization)
  const currentUserId = useStore($currentUserId)

  // NEW: Get reviews from family data (with fallback to legacy ratings)
  const reviews = useMemo((): Review[] => {
    if (!familyData) return []

    // Prefer new reviews array
    if (familyData.reviews?.length) {
      return familyData.reviews.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    }

    // Fallback: convert legacy ratings to review format for display
    return (familyData.ratings || []).map(
      (r): Review => ({
        id: `legacy-${r.ratedAt}`,
        recipeId: recipeId || '',
        userId: r.userId,
        userName: r.userName,
        rating: r.rating,
        comment: undefined,
        photoUrl: undefined,
        difficulty: undefined,
        source: 'quick' as const,
        createdAt: r.ratedAt,
      }),
    )
  }, [familyData, recipeId])

  const displayReviews = isExpanded ? reviews : []

  // Check if current user has already reviewed
  const currentUserReview = reviews.find((r) => currentUserId && r.userId === currentUserId)

  // Handle photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setReviewPhoto(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Cancel review
  const handleCancelReview = () => {
    setReviewRating(0)
    setReviewComment('')
    setReviewPhoto(null)
  }

  // Submit review
  const handleSubmitReview = async () => {
    if (!recipeId || reviewRating === 0) return

    setIsSubmitting(true)
    try {
      const baseUrl = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`

      await fetch(`${baseUrl}api/recipes/${recipeId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment || undefined,
          photoBase64: reviewPhoto || undefined,
          source: 'quick',
        }),
      })

      // Reset form
      setReviewRating(0)
      setReviewComment('')
      setReviewPhoto(null)

      // Trigger data reload
      onRefresh?.()
    } catch (error) {
      console.error('Failed to submit review:', error)
      alert('Failed to submit review. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (totalRatings === 0 && !familyData) return null

  // Progressive disclosure: show comment field after rating selected
  const showCommentField = reviewRating > 0

  return (
    <div className="mb-6 border-b border-border pb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left transition-opacity hover:opacity-80"
      >
        <Inline spacing="sm" align="center" justify="between">
          <Inline spacing="sm" align="center">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-bold text-foreground">{averageRating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">
                ({totalRatings} {totalRatings === 1 ? 'review' : 'reviews'})
              </span>
            </div>
            {lastCooked && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  Last: {new Date(lastCooked).toLocaleDateString()}
                  {lastCookedBy ? ` by ${lastCookedBy}` : ''}
                </span>
              </>
            )}
          </Inline>
          {reviews.length > 0 &&
            (isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ))}
        </Inline>
      </button>

      {/* Add Review Section - Show if current user hasn't reviewed */}
      {currentUserId && !currentUserReview && (
        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <Stack spacing="md">
            <p className="text-sm font-medium text-foreground">Leave a review</p>

            {/* Star Rating */}
            <Inline spacing="sm">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={(e) => {
                    e.stopPropagation()
                    setReviewRating(star)
                  }}
                  className="transition-transform hover:scale-110 active:scale-95"
                  disabled={isSubmitting}
                >
                  <Star
                    className={cn(
                      'h-6 w-6 transition-colors',
                      star <= (hoverRating || reviewRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-border text-border',
                    )}
                  />
                </button>
              ))}
            </Inline>

            {/* Comment Field - Progressive Disclosure */}
            {showCommentField && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <Stack spacing="sm">
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="What did you think? (optional)"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    rows={3}
                    maxLength={500}
                    disabled={isSubmitting}
                  />

                  {/* Photo Upload */}
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoSelect}
                    disabled={isSubmitting}
                  />

                  {reviewPhoto ? (
                    <div className="relative">
                      <img
                        src={reviewPhoto}
                        alt="Review preview"
                        className="h-32 w-full rounded-lg object-cover"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReviewPhoto(null)}
                        className="absolute right-2 top-2 bg-background/80"
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => photoInputRef.current?.click()}
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      <Camera className="h-4 w-4" />
                      Add photo (optional)
                    </Button>
                  )}

                  <Inline spacing="sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelReview}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSubmitReview}
                      disabled={reviewRating === 0 || isSubmitting}
                      className="flex-1"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Review'}
                    </Button>
                  </Inline>
                </Stack>
              </div>
            )}

            {!showCommentField && (
              <p className="text-xs text-muted-foreground">Tap a star to start your review</p>
            )}
          </Stack>
        </div>
      )}

      {/* Expandable Review History */}
      {isExpanded && reviews.length > 0 && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
          <Stack spacing="sm">
            {displayReviews.map((review) => {
              const isCurrentUserReview = currentUserId && review.userId === currentUserId
              const hasBeenEdited = review.updatedAt && review.updatedAt !== review.createdAt

              return (
                <div
                  key={review.id}
                  className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/20"
                >
                  <Stack spacing="sm">
                    {/* Header: Avatar + Name + Date */}
                    <Inline spacing="sm" align="center" justify="between">
                      <Inline spacing="sm" align="center">
                        <div
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white',
                            getColorForUser(review.userName),
                          )}
                        >
                          {review.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground">
                            {review.userName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString()}
                            {hasBeenEdited && ' · edited'}
                          </span>
                        </div>
                      </Inline>

                      {/* Stars */}
                      <Inline spacing="xs">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              'h-4 w-4',
                              star <= review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'fill-border text-border',
                            )}
                          />
                        ))}
                      </Inline>
                    </Inline>

                    {/* Comment */}
                    {review.comment && (
                      <p className="text-sm leading-relaxed text-foreground">{review.comment}</p>
                    )}

                    {/* Photo */}
                    {review.photoUrl && (
                      <img
                        src={review.photoUrl}
                        alt="Finished dish"
                        className="rounded-lg object-cover"
                      />
                    )}

                    {/* Edit button for current user */}
                    {isCurrentUserReview && (
                      <Button variant="ghost" size="sm" className="self-start">
                        Edit Review
                      </Button>
                    )}
                  </Stack>
                </div>
              )
            })}
          </Stack>
        </div>
      )}
    </div>
  )
}

function getColorForUser(name: string): string {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}
