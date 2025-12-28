export interface Day {
  date: string
  fullLabel: string
  dateLabel: string
  displayLabel: string
}

/**
 * Returns an array of day objects for the current week (starting Monday).
 * Each object contains:
 * - date: String (YYYY-MM-DD), used as the key.
 * - fullLabel: String (e.g., "Monday").
 * - dateLabel: String (e.g., "01.12.").
 * - displayLabel: String (e.g., "Mon 01.12.").
 *
 * @returns Array<Day>
 */
export const getCurrentWeekDays = (): Day[] => {
  const now = new Date()
  const currentDay = now.getDay() // 0 is Sunday, 1 is Monday
  const distanceToMonday = (currentDay + 6) % 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - distanceToMonday)

  const days: Day[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)

    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const dateKey = `${yyyy}-${mm}-${dd}`

    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' })
    const shortDayName = d.toLocaleDateString('en-US', { weekday: 'short' })
    const displayDate = `${dd}.${mm}.`

    days.push({
      date: dateKey,
      fullLabel: dayName,
      dateLabel: displayDate,
      displayLabel: `${shortDayName} ${displayDate}`,
    })
  }
  return days
}
