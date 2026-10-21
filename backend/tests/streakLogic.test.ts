import { describe, expect, it } from 'vitest'
import { calculateStreak } from '../src/services/streakLogic.js'
import { Habit } from '../src/types/habit.js'

describe('Streak Calculation Logic', () => {
  const createDailyHabit = (
    completions: Record<string, boolean> = {},
    startDate = '2026-10-01',
  ): Habit => ({
    id: 'habit-daily-1',
    userId: 'user-001',
    title: 'Daily Meditation',
    notes: '',
    durationValue: 10,
    durationUnit: 'minutes',
    frequency: 'daily',
    startDate,
    endDate: null,
    oneTimeDate: null,
    weekdays: [],
    extraDates: [],
    completions,
    recoveries: {},
    isActive: true,
    createdAt: `${startDate}T08:00:00Z`,
    updatedAt: `${startDate}T08:00:00Z`,
  })

  it('calculates 0 for habit with zero completions', () => {
    const habit = createDailyHabit({}, '2026-10-01')
    const streak = calculateStreak(habit, '2026-10-05')

    expect(streak.currentStreak).toBe(0)
    expect(streak.longestStreak).toBe(0)
    expect(streak.lastCompletedDate).toBe(null)
    expect(streak.isCompletedToday).toBe(false)
  })

  it('calculates first completion properly (streak = 1)', () => {
    const habit = createDailyHabit({ '2026-10-05': true }, '2026-10-01')
    const streak = calculateStreak(habit, '2026-10-05')

    expect(streak.currentStreak).toBe(1)
    expect(streak.longestStreak).toBe(1)
    expect(streak.lastCompletedDate).toBe('2026-10-05')
    expect(streak.isCompletedToday).toBe(true)
  })

  it('increments streak for consecutive daily completions', () => {
    const habit = createDailyHabit(
      {
        '2026-10-01': true,
        '2026-10-02': true,
        '2026-10-03': true,
        '2026-10-04': true,
        '2026-10-05': true,
      },
      '2026-10-01',
    )
    const streak = calculateStreak(habit, '2026-10-05')

    expect(streak.currentStreak).toBe(5)
    expect(streak.longestStreak).toBe(5)
    expect(streak.lastCompletedDate).toBe('2026-10-05')
  })

  it('preserves current streak when today is scheduled but not completed yet', () => {
    // Reference date: 2026-10-05
    // Completed up to yesterday (2026-10-04)
    // Today (2026-10-05) is NOT completed yet
    const habit = createDailyHabit(
      {
        '2026-10-01': true,
        '2026-10-02': true,
        '2026-10-03': true,
        '2026-10-04': true,
      },
      '2026-10-01',
    )

    const streak = calculateStreak(habit, '2026-10-05')

    // Today is in progress, so user has not failed yet; streak is preserved from yesterday (4)
    expect(streak.currentStreak).toBe(4)
    expect(streak.longestStreak).toBe(4)
    expect(streak.isCompletedToday).toBe(false)
    expect(streak.todayScheduled).toBe(true)
    expect(streak.lastCompletedDate).toBe('2026-10-04')
  })

  it('resets current streak to 0 if yesterday was scheduled and missed', () => {
    // Reference date: 2026-10-05
    // Completed 10-01, 10-02, 10-03. Missed yesterday (10-04). Not completed today (10-05).
    const habit = createDailyHabit(
      {
        '2026-10-01': true,
        '2026-10-02': true,
        '2026-10-03': true,
        // Missed 10-04
      },
      '2026-10-01',
    )

    const streak = calculateStreak(habit, '2026-10-05')

    expect(streak.currentStreak).toBe(0)
    expect(streak.longestStreak).toBe(3) // Longest remains preserved!
    expect(streak.lastCompletedDate).toBe('2026-10-03')
  })

  it('preserves longest streak after broken streak and restarts new current streak', () => {
    // Historical run of 5 days, break, then new run of 2 days
    const habit = createDailyHabit(
      {
        '2026-10-01': true,
        '2026-10-02': true,
        '2026-10-03': true,
        '2026-10-04': true,
        '2026-10-05': true,
        // Missed 10-06
        '2026-10-07': true,
        '2026-10-08': true,
      },
      '2026-10-01',
    )

    const streak = calculateStreak(habit, '2026-10-08')

    expect(streak.currentStreak).toBe(2)
    expect(streak.longestStreak).toBe(5) // Historical record preserved!
    expect(streak.lastCompletedDate).toBe('2026-10-08')
  })

  it('handles weekly and custom habits without breaking on unscheduled days', () => {
    // Scheduled Mon (1) and Wed (3)
    // 2026-10-12: Monday (completed)
    // 2026-10-13: Tuesday (unscheduled - rest day)
    // 2026-10-14: Wednesday (completed)
    // 2026-10-15: Thursday (unscheduled - rest day)
    const habit: Habit = {
      id: 'habit-weekly-1',
      userId: 'user-001',
      title: 'Strength Training',
      notes: '',
      durationValue: 45,
      durationUnit: 'minutes',
      frequency: 'weekly',
      startDate: '2026-10-01',
      endDate: null,
      oneTimeDate: null,
      weekdays: [1, 3], // Mon, Wed
      extraDates: [],
      completions: {
        '2026-10-12': true,
        '2026-10-14': true,
      },
      recoveries: {},
      isActive: true,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-14T00:00:00Z',
    }

    // On Tuesday 10-13 (unscheduled day), streak must NOT break:
    const tuesdayStreak = calculateStreak(habit, '2026-10-13')
    expect(tuesdayStreak.currentStreak).toBe(1)
    expect(tuesdayStreak.todayScheduled).toBe(false)

    // On Wednesday 10-14 (completed scheduled day):
    const wednesdayStreak = calculateStreak(habit, '2026-10-14')
    expect(wednesdayStreak.currentStreak).toBe(2)
    expect(wednesdayStreak.longestStreak).toBe(2)

    // On Thursday 10-15 (unscheduled day):
    const thursdayStreak = calculateStreak(habit, '2026-10-15')
    expect(thursdayStreak.currentStreak).toBe(2)
    expect(thursdayStreak.todayScheduled).toBe(false)
  })

  it('breaks weekly habit streak only when a scheduled day was missed', () => {
    // Scheduled Mon (1) and Wed (3)
    // Mon 10-12 completed
    // Wed 10-14 MISSED!
    // Fri 10-16 checked:
    const habit: Habit = {
      id: 'habit-weekly-2',
      userId: 'user-001',
      title: 'Weekly Task',
      notes: '',
      durationValue: 30,
      durationUnit: 'minutes',
      frequency: 'weekly',
      startDate: '2026-10-01',
      endDate: null,
      oneTimeDate: null,
      weekdays: [1, 3], // Mon, Wed
      extraDates: [],
      completions: {
        '2026-10-12': true, // Mon completed
        // Wed 10-14 MISSED
      },
      recoveries: {},
      isActive: true,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-12T00:00:00Z',
    }

    const streak = calculateStreak(habit, '2026-10-16') // Friday
    expect(streak.currentStreak).toBe(0) // Broken by missed Wednesday
    expect(streak.longestStreak).toBe(1)
  })

  it('correctly handles one-time habits (binary streak, non-repeating)', () => {
    const uncompleted: Habit = {
      id: 'one-time-1',
      userId: 'user-001',
      title: 'File Tax Return',
      notes: '',
      durationValue: 60,
      durationUnit: 'minutes',
      frequency: 'one-time',
      startDate: '2026-10-25',
      endDate: null,
      oneTimeDate: '2026-10-25',
      weekdays: [],
      extraDates: [],
      completions: {},
      recoveries: {},
      isActive: true,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    }

    const streakUncompleted = calculateStreak(uncompleted, '2026-10-25')
    expect(streakUncompleted.currentStreak).toBe(0)
    expect(streakUncompleted.longestStreak).toBe(0)

    const completed: Habit = {
      ...uncompleted,
      completions: { '2026-10-25': true },
    }
    const streakCompleted = calculateStreak(completed, '2026-10-25')
    expect(streakCompleted.currentStreak).toBe(1)
    expect(streakCompleted.longestStreak).toBe(1)
  })

  it('handles leap day across calendar boundaries accurately', () => {
    // 2024 is a leap year. February has 29 days!
    const leapHabit = createDailyHabit(
      {
        '2024-02-28': true,
        '2024-02-29': true, // Leap day
        '2024-03-01': true,
      },
      '2024-02-01',
    )

    const streak = calculateStreak(leapHabit, '2024-03-01')
    expect(streak.currentStreak).toBe(3)
    expect(streak.longestStreak).toBe(3)
  })

  it('handles year boundary seamlessly', () => {
    const yearHabit = createDailyHabit(
      {
        '2026-12-31': true,
        '2027-01-01': true,
      },
      '2026-12-01',
    )

    const streak = calculateStreak(yearHabit, '2027-01-01')
    expect(streak.currentStreak).toBe(2)
  })
})

