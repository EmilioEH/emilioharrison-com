import React from 'react'
import { motion } from 'framer-motion'
import { parseISO, isSameWeek } from 'date-fns'
import { ChevronDown, CalendarDays } from 'lucide-react'
import { weekLabel } from '../../lib/week-labels'

interface PlanningWeekChipProps {
  activeWeekStart: string
  onOpenPicker: () => void
}

/**
 * Says which week the library's `+` buttons add to, and opens the week picker.
 *
 * The active week is a persisted, app-wide setting, but until now it was only visible *inside*
 * the week view — so a cook who had switched to next week saw a library that behaved differently
 * with nothing on screen to explain why, and no way to change it back without leaving.
 */
export const PlanningWeekChip: React.FC<PlanningWeekChipProps> = ({
  activeWeekStart,
  onOpenPicker,
}) => {
  const isThisWeek = isSameWeek(parseISO(activeWeekStart), new Date(), { weekStartsOn: 1 })

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onOpenPicker}
      data-testid="planning-week-chip"
      aria-label={`Planning ${weekLabel(activeWeekStart)}. Change week`}
      className={`flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors ${
        // Planning a week other than this one is the state worth noticing, so that is the one
        // that gets the primary tint. The common case stays quiet.
        isThisWeek
          ? 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
          : 'border-primary/20 bg-primary/10 text-primary hover:bg-primary/20'
      }`}
    >
      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
      {/* The prefix only appears when the week is not the obvious one. Planning this week needs
       * no explanation and the category pills beside it need the room; planning any other week
       * is the case a cook can be surprised by, and there the words earn their width. */}
      <span className="whitespace-nowrap">
        {isThisWeek ? 'This week' : `Adding to: ${weekLabel(activeWeekStart)}`}
      </span>
      <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
    </motion.button>
  )
}
