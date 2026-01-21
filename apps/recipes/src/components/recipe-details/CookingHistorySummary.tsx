import React, { useState, useMemo } from 'react'
import { Star, ChevronDown, ChevronUp } from 'lucide-react'
import { useStore } from '@nanostores/react'
import { Inline, Stack } from '../ui/layout'
import { cn } from '../../lib/utils'
import { $currentUserId } from '../../lib/familyStore'
import type { FamilyRecipeData } from '../../lib/types'

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
  const [editingRating, setEditingRating] = useState<string | null>(null)
  const [hoverRating, setHoverRating] = useState<number>(0)

  // Get current user ID from nanostore (set during app initialization)
  const currentUserId = useStore($currentUserId)

  // Merge ratings and notes into session cards
  const sessions = useMemo(() => {
    if (!familyData) return []

    const { ratings, notes } = familyData
    // Start with ratings as base sessions
    const grouped = ratings.map((r) => {
      // Find a matching note from same user within reasonable time (e.g. same day)
      // For simplicity, we just find the most recent note by this user for now
      // A more robust implementation would time-window match.
      const userNote = notes.find((n) => n.userName === r.userName)

      return {
        id: `r-${r.ratedAt}`,
        user: {
          name: r.userName,
          userId: r.userId,
          initial: r.userName.charAt(0).toUpperCase(),
          // deterministically assign color based on name length/char?
          color: getColorForUser(r.userName),
        },
        date: new Date(r.ratedAt).toLocaleDateString(),
        timestamp: new Date(r.ratedAt).getTime(),
        rating: r.rating,
        note: userNote?.text,
      }
    })

    // Also include notes that might not have ratings?
    // For MVP, focusing on rated sessions as "Cooking History" is cleaner.
    // If we want to capture notes without ratings, we'd add them here.

    return grouped.sort((a, b) => b.timestamp - a.timestamp)
  }, [familyData])

  const displaySessions = isExpanded ? sessions : []

  const handleEditRating = async (_userId: string, newRating: number) => {
    if (!recipeId) return

    try {
      const baseUrl = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`

      await fetch(`${baseUrl}api/recipes/${recipeId}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: newRating }),
      })

      // Instead of refreshing, trigger data reload
      onRefresh?.()
    } catch (error) {
      console.error('Failed to update rating:', error)
    } finally {
      setEditingRating(null)
    }
  }

  if (totalRatings === 0 && !familyData) return null

  // Check if current user has already rated
  const currentUserRating = sessions.find((s) => currentUserId && s.user.userId === currentUserId)

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
              <span className="text-xs text-muted-foreground">({totalRatings} ratings)</span>
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
          {sessions.length > 0 &&
            (isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ))}
        </Inline>
      </button>

      {/* Add Rating Section - Show if current user hasn't rated */}
      {currentUserId && !currentUserRating && (
        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <Stack spacing="sm">
            <p className="text-sm font-medium text-foreground">Rate this recipe</p>
            <Inline spacing="sm">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEditRating(currentUserId, star)
                  }}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    className={cn(
                      'h-6 w-6 transition-colors',
                      star <= (hoverRating || 0)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-border text-border',
                    )}
                  />
                </button>
              ))}
            </Inline>
            <p className="text-xs text-muted-foreground">Tap a star to add your rating</p>
          </Stack>
        </div>
      )}

      {/* Expandable History */}
      {isExpanded && sessions.length > 0 && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
          <Stack spacing="sm">
            {displaySessions.map((session) => {
              const isCurrentUserSession = currentUserId && session.user.userId === currentUserId
              const isEditing = editingRating === session.user.userId

              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-xl bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                >
                  <Inline spacing="sm" align="center">
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white',
                        session.user.color,
                      )}
                    >
                      {session.user.initial}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">
                        {session.user.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{session.date}</span>
                    </div>
                  </Inline>

                  {/* Interactive Stars */}
                  <Inline spacing="xs">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => {
                          if (isCurrentUserSession) {
                            if (isEditing || star !== session.rating) {
                              handleEditRating(session.user.userId, star)
                            }
                          }
                        }}
                        disabled={!isCurrentUserSession}
                        className={cn(
                          'transition-transform',
                          isCurrentUserSession && 'cursor-pointer hover:scale-110 active:scale-95',
                          !isCurrentUserSession && 'cursor-default',
                        )}
                        title={isCurrentUserSession ? 'Click to change your rating' : ''}
                      >
                        <Star
                          className={cn(
                            'h-4 w-4',
                            star <= session.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'fill-border text-border',
                          )}
                        />
                      </button>
                    ))}
                  </Inline>
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
