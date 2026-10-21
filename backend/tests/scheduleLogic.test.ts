import { describe, expect, it } from 'vitest'
import {
  getScheduledDates,
  isScheduledOn,
  validateSchedule,
} from '../src/services/scheduleLogic.js'
import { Habit } from '../src/types/habit.js'
import {
  addDays,
  compareDates,
  daysInMonth,
  isLeapYear,
  isValidDateString,
} from '../src/utils/dateUtils.js'

describe('Schedule Logic & Date Utilities', () => {
  describe('Date Utilities & Leap Year Handling', () => {
    it('correctly identifies leap years', () => {
      expect(isLeapYear(2024)).toBe(true)
      expect(isLeapYear(2020)).toBe(true)
      expect(isLeapYear(2000)).toBe(true)
      expect(isLeapYear(1900)).toBe(false) // Century non-leap
      expect(isLeapYear(2025)).toBe(false)
      expect(isLeapYear(2026)).toBe(false)
    })

    it('returns correct days in month including February leap day', () => {
      expect(daysInMonth(2024, 2)).toBe(29) // Leap year
      expect(daysInMonth(2025, 2)).toBe(28) // Non-leap year
      expect(daysInMonth(2026, 4)).toBe(30)
      expect(daysInMonth(2026, 12)).toBe(31)
    })

    it('validates YYYY-MM-DD date strings strictly', () => {
      expect(isValidDateString('2026-10-21')).toBe(true)
      expect(isValidDateString('2024-02-29')).toBe(true) // Valid leap day
      expect(isValidDateString('2025-02-29')).toBe(false) // Invalid (non-leap)
      expect(isValidDateString('2026-13-01')).toBe(false) // Month 13
      expect(isValidDateString('2026-04-31')).toBe(false) // April has 30 days
      expect(isValidDateString('invalid-date')).toBe(false)
      expect(isValidDateString(null)).toBe(false)
      expect(isValidDateString(12345)).toBe(false)
    })

    it('correctly advances across month and year boundaries without timezone drift', () => {
      expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
      expect(addDays('2024-02-28', 1)).toBe('2024-02-29') // Leap day
      expect(addDays('2024-02-29', 1)).toBe('2024-03-01')
      expect(addDays('2026-12-31', 1)).toBe('2027-01-01') // Year boundary
      expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    })

    it('compares dates accurately', () => {
      expect(compareDates('2026-01-01', '2026-01-02')).toBe(-1)
      expect(compareDates('2026-05-10', '2026-05-10')).toBe(0)
      expect(compareDates('2027-01-01', '2026-12-31')).toBe(1)
    })
  })

  describe('isScheduledOn', () => {
    const baseHabit: Habit = {
      id: 'h-1',
      userId: 'u-1',
      title: 'Test Habit',
      notes: '',
      durationValue: 10,
      durationUnit: 'minutes',
      frequency: 'daily',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      oneTimeDate: null,
      weekdays: [],
      extraDates: [],
      completions: {},
      recoveries: {},
      isActive: true,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    }

    it('handles daily frequency within range', () => {
      expect(isScheduledOn(baseHabit, '2026-09-30')).toBe(false) // Before start
      expect(isScheduledOn(baseHabit, '2026-10-01')).toBe(true) // On start
      expect(isScheduledOn(baseHabit, '2026-10-15')).toBe(true) // During
      expect(isScheduledOn(baseHabit, '2026-10-31')).toBe(true) // On end
      expect(isScheduledOn(baseHabit, '2026-11-01')).toBe(false) // After end
    })

    it('handles weekly frequency respecting scheduled weekdays (Mon=1, Wed=3, Fri=5)', () => {
      const weeklyHabit: Habit = {
        ...baseHabit,
        frequency: 'weekly',
        weekdays: [1, 3, 5], // Mon, Wed, Fri
      }

      // 2026-10-12 is Monday
      expect(isScheduledOn(weeklyHabit, '2026-10-12')).toBe(true)
      // 2026-10-13 is Tuesday (not scheduled)
      expect(isScheduledOn(weeklyHabit, '2026-10-13')).toBe(false)
      // 2026-10-14 is Wednesday
      expect(isScheduledOn(weeklyHabit, '2026-10-14')).toBe(true)
      // 2026-10-18 is Sunday (0)
      expect(isScheduledOn(weeklyHabit, '2026-10-18')).toBe(false)
    })

    it('handles custom frequency with weekdays', () => {
      const customHabit: Habit = {
        ...baseHabit,
        frequency: 'custom',
        weekdays: [0, 6], // Weekends: Sun(0), Sat(6)
      }

      // 2026-10-17 is Saturday
      expect(isScheduledOn(customHabit, '2026-10-17')).toBe(true)
      // 2026-10-18 is Sunday
      expect(isScheduledOn(customHabit, '2026-10-18')).toBe(true)
      // 2026-10-19 is Monday
      expect(isScheduledOn(customHabit, '2026-10-19')).toBe(false)
    })

    it('handles one-time frequency only on the designated date', () => {
      const oneTimeHabit: Habit = {
        ...baseHabit,
        frequency: 'one-time',
        oneTimeDate: '2026-10-25',
      }

      expect(isScheduledOn(oneTimeHabit, '2026-10-24')).toBe(false)
      expect(isScheduledOn(oneTimeHabit, '2026-10-25')).toBe(true)
      expect(isScheduledOn(oneTimeHabit, '2026-10-26')).toBe(false)
    })

    it('allows extraDates to schedule occurrences outside regular rules', () => {
      const weeklyHabit: Habit = {
        ...baseHabit,
        frequency: 'weekly',
        weekdays: [1], // Monday only
        extraDates: ['2026-10-15'], // Thursday extra date
      }

      // 2026-10-15 is Thursday, not in weekdays, but in extraDates
      expect(isScheduledOn(weeklyHabit, '2026-10-15')).toBe(true)
    })
  })

  describe('getScheduledDates', () => {
    it('returns all scheduled dates in interval', () => {
      const habit: Habit = {
        id: 'h-1',
        userId: 'u-1',
        title: 'Mon & Fri',
        notes: '',
        durationValue: 20,
        durationUnit: 'minutes',
        frequency: 'weekly',
        startDate: '2026-10-01',
        endDate: null,
        oneTimeDate: null,
        weekdays: [1, 5], // Monday & Friday
        extraDates: [],
        completions: {},
        recoveries: {},
        isActive: true,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      }

      // Range: 2026-10-12 (Mon) to 2026-10-19 (Mon)
      // Expected: 10-12 (Mon), 10-16 (Fri), 10-19 (Mon)
      const dates = getScheduledDates(habit, '2026-10-12', '2026-10-19')
      expect(dates).toEqual(['2026-10-12', '2026-10-16', '2026-10-19'])
    })
  })

  describe('validateSchedule', () => {
    it('rejects empty title', () => {
      const result = validateSchedule({
        title: '   ',
        startDate: '2026-10-21',
        frequency: 'daily',
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Habit title is required')
    })

    it('rejects invalid startDate', () => {
      const result = validateSchedule({
        title: 'Run',
        startDate: 'not-a-date',
        frequency: 'daily',
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('startDate must be a valid date')
    })

    it('rejects endDate prior to startDate', () => {
      const result = validateSchedule({
        title: 'Run',
        startDate: '2026-10-20',
        endDate: '2026-10-10',
        frequency: 'daily',
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('cannot be before startDate')
    })

    it('rejects weekly habit with empty weekdays array', () => {
      const result = validateSchedule({
        title: 'Run',
        startDate: '2026-10-20',
        frequency: 'weekly',
        weekdays: [],
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('weekdays array with at least one day')
    })

    it('accepts valid daily habit', () => {
      const result = validateSchedule({
        title: 'Drink Water',
        startDate: '2026-10-20',
        frequency: 'daily',
      })
      expect(result.valid).toBe(true)
    })
  })
})

