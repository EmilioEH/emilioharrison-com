import React, { useState, useMemo } from 'react'
import { Star, ChevronDown, ChevronUp } from 'lucide-react'
import { Inline, Stack } from '../ui/layout'
import { CookingHistoryCard } from './CookingHistoryCard'
import type { FamilyRecipeData } from '../../lib/types'

interface CookingHistorySummaryProps {
  averageRating: number
  totalRatings: number
  lastCooked?: string
  lastCookedBy?: string
  familyData?: FamilyRecipeData | null
}

export const CookingHistorySummary: React.FC<CookingHistorySummaryProps> = ({
  averageRating,
  totalRatings,
  lastCooked,
  lastCookedBy,
  familyData,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

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

  if (totalRatings === 0 && !familyData) return null

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

      {/* Expandable History */}
      {isExpanded && sessions.length > 0 && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
          <Stack spacing="sm">
            {displaySessions.map((session) => (
              <CookingHistoryCard
                key={session.id}
                user={session.user}
                date={session.date}
                rating={session.rating}
                note={session.note}
              />
            ))}
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
