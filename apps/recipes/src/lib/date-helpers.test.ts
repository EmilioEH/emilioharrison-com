import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { getCurrentWeekDays } from './date-helpers'

describe('date-helpers', () => {
  describe('getCurrentWeekDays', () => {
    beforeEach(() => {
      // Mock the date to a fixed point in time: Wednesday, Jan 10, 2024
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-10T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should generate 7 days for the current week starting on Monday', () => {
      const week = getCurrentWeekDays()
      expect(week).toHaveLength(7)
      expect(week[0].fullLabel).toBe('Monday')
      expect(week[6].fullLabel).toBe('Sunday')
    })

    it('should correctly format the date labels', () => {
      const week = getCurrentWeekDays()
      // Monday of that week should be Jan 08, 2024
      expect(week[0].date).toBe('2024-01-08')
      expect(week[0].dateLabel).toBe('08.01.')
      expect(week[0].displayLabel).toContain('Mon 08.01.')
    })

    it('should handle month rollover correctly', () => {
      // Set date to Jan 31, 2024 (Wednesday)
      vi.setSystemTime(new Date('2024-01-31T12:00:00Z'))
      const week = getCurrentWeekDays()

      // Monday is Jan 29
      expect(week[0].date).toBe('2024-01-29')

      // Thursday is Feb 1
      expect(week[3].date).toBe('2024-02-01')
      expect(week[3].dateLabel).toBe('01.02.')
    })
  })
})
