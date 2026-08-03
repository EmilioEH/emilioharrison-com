import { format, parseISO, addWeeks, isSameWeek } from 'date-fns'

/**
 * How a week is named on screen: "This week" / "Next week" / "Aug 18".
 *
 * Deliberately the same words `getPlannedWeeksForRecipe` puts on the card badges, so the chip
 * saying which week the `+` adds to and the badge confirming that it did never disagree.
 */
export function weekLabel(weekStart: string): string {
  const start = parseISO(weekStart)
  const today = new Date()
  if (isSameWeek(start, today, { weekStartsOn: 1 })) return 'This week'
  if (isSameWeek(start, addWeeks(today, 1), { weekStartsOn: 1 })) return 'Next week'
  return format(start, 'MMM d')
}

/** Title Case for the bottom tab, which sits beside "Library" and reads as a destination. */
export function weekTabLabel(weekStart: string): string {
  return weekLabel(weekStart).replace(/\bweek\b/, 'Week')
}
