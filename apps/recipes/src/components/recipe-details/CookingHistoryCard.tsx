import React from 'react'
import { Star } from 'lucide-react'
import { Inline, Stack } from '../ui/layout'
import { cn } from '../../lib/utils'

interface CookingHistoryCardProps {
  user: {
    name: string
    initial: string
    color?: string // 'bg-green-500', 'bg-blue-500', etc.
  }
  date: string
  rating: number
  note?: string
}

export const CookingHistoryCard: React.FC<CookingHistoryCardProps> = ({
  user,
  date,
  rating,
  note,
}) => {
  return (
    <div className="rounded-xl bg-muted/30 p-3 transition-colors hover:bg-muted/50">
      <Stack spacing="xs">
        <Inline spacing="sm" align="center">
          {/* Avatar Circle */}
          <div
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white',
              user.color || 'bg-primary',
            )}
          >
            {user.initial}
          </div>

          {/* Meta Line */}
          <div className="flex flex-1 items-center gap-2 text-xs text-foreground">
            <span className="font-semibold">{user.name}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{date}</span>
            <span className="text-muted-foreground">·</span>
            <Inline spacing="xs" className="items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    'h-3 w-3',
                    star <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-border text-border',
                  )}
                />
              ))}
            </Inline>
          </div>
        </Inline>

        {/* Note Content */}
        {note && <p className="pl-8 text-sm italic leading-snug text-muted-foreground">"{note}"</p>}
      </Stack>
    </div>
  )
}
