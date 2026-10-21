import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryHabitRepository } from '../src/repositories/inMemoryHabitRepository.js'
import { HabitService } from '../src/services/habitService.js'
import { BadRequestError, ConflictError, NotFoundError } from '../src/utils/errors.js'

describe('HabitService Domain Logic', () => {
  let repo: InMemoryHabitRepository
  let service: HabitService
  const testUser = 'user-001'

  beforeEach(async () => {
    repo = new InMemoryHabitRepository()
    await repo.reset()
    service = new HabitService(repo)
  })

  describe('Habit Management', () => {
    it('creates a habit with validated fields', async () => {
      const habit = await service.createHabit(testUser, {
        title: 'Morning Walk',
        notes: 'Walk around park for 20 minutes',
        durationValue: 20,
        durationUnit: 'minutes',
        frequency: 'daily',
        startDate: '2026-10-01',
      })

      expect(habit.id).toBeDefined()
      expect(habit.userId).toBe(testUser)
      expect(habit.title).toBe('Morning Walk')
      expect(habit.isActive).toBe(true)
      expect(habit.completions).toEqual({})
      expect(habit.recoveries).toEqual({})
    })

    it('rejects invalid schedule when creating habit', async () => {
      await expect(
        service.createHabit(testUser, {
          title: '',
          frequency: 'daily',
          startDate: '2026-10-01',
        }),
      ).rejects.toThrow(BadRequestError)
    })

    it('retrieves habit by ID for authorized user', async () => {
      const habits = await service.listHabits(testUser)
      const target = habits[0]

      const habit = await service.getHabit(testUser, target.id)
      expect(habit.id).toBe(target.id)
      expect(habit.title).toBe(target.title)
    })

    it('throws NotFoundError for non-existent habit', async () => {
      await expect(
        service.getHabit(testUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('Completion Tracking & Validation', () => {
    it('records valid completion and returns updated streak', async () => {
      const habit = await service.createHabit(testUser, {
        title: 'Drink Herbal Tea',
        frequency: 'daily',
        startDate: '2026-10-10',
      })

      const refDate = '2026-10-15'
      const { habit: updated, streak } = await service.recordCompletion(
        testUser,
        habit.id,
        '2026-10-15',
        refDate,
      )

      expect(updated.completions['2026-10-15']).toBe(true)
      expect(streak.currentStreak).toBe(1)
      expect(streak.isCompletedToday).toBe(true)
    })

    it('rejects duplicate completions on the same date with ConflictError (409)', async () => {
      const habit = await service.createHabit(testUser, {
        title: 'Daily Journal',
        frequency: 'daily',
        startDate: '2026-10-10',
      })

      const refDate = '2026-10-12'
      await service.recordCompletion(testUser, habit.id, '2026-10-12', refDate)

      await expect(
        service.recordCompletion(testUser, habit.id, '2026-10-12', refDate),
      ).rejects.toThrow(ConflictError)
    })

    it('rejects future completions relative to reference date', async () => {
      const habit = await service.createHabit(testUser, {
        title: 'Meditation',
        frequency: 'daily',
        startDate: '2026-10-01',
      })

      // Reference date is 2026-10-15; trying to complete for 2026-10-16
      await expect(
        service.recordCompletion(
          testUser,
          habit.id,
          '2026-10-16',
          '2026-10-15',
        ),
      ).rejects.toThrow(BadRequestError)
    })

    it('rejects invalid date formats', async () => {
      const habit = await service.createHabit(testUser, {
        title: 'Meditation',
        frequency: 'daily',
        startDate: '2026-10-01',
      })

      await expect(
        service.recordCompletion(testUser, habit.id, '15/10/2026', '2026-10-20'),
      ).rejects.toThrow(BadRequestError)
    })

    it('safely removes historical completion and recalculates streak', async () => {
      const habit = await service.createHabit(testUser, {
        title: 'Reading',
        frequency: 'daily',
        startDate: '2026-10-01',
      })

      // Complete 3 consecutive days
      await service.recordCompletion(testUser, habit.id, '2026-10-01', '2026-10-03')
      await service.recordCompletion(testUser, habit.id, '2026-10-02', '2026-10-03')
      await service.recordCompletion(testUser, habit.id, '2026-10-03', '2026-10-03')

      const streakBefore = await service.getStreak(testUser, habit.id, '2026-10-03')
      expect(streakBefore.currentStreak).toBe(3)

      // Remove middle day 2026-10-02 (e.g. historical correction)
      const { streak: streakAfter } = await service.removeCompletion(
        testUser,
        habit.id,
        '2026-10-02',
        '2026-10-03',
      )

      // Streak was broken in the middle: on 10-03, only 10-03 is completed consecutively
      expect(streakAfter.currentStreak).toBe(1)
    })
  })

  describe('Missed Habits Detection', () => {
    it('detects scheduled occurrences that were not completed', async () => {
      const habit = await service.createHabit(testUser, {
        title: 'Study Math',
        frequency: 'daily',
        startDate: '2026-10-10',
      })

      // Complete 10-10, miss 10-11 and 10-12. Reference date is 2026-10-13.
      await service.recordCompletion(testUser, habit.id, '2026-10-10', '2026-10-13')

      const missed = await service.getMissedOccurrences(testUser, {
        habitId: habit.id,
        referenceDate: '2026-10-13',
      })

      const missedDates = missed.map((m) => m.date)
      expect(missedDates).toContain('2026-10-11')
      expect(missedDates).toContain('2026-10-12')
      expect(missedDates).not.toContain('2026-10-10') // Completed
      expect(missedDates).not.toContain('2026-10-13') // Today is in progress, NOT missed
      expect(missedDates).not.toContain('2026-10-14') // Future date is NOT missed
    })

    it('does not classify unscheduled days as missed for weekly habits', async () => {
      // Weekly habit on Mondays only (1)
      // 2026-10-12 is Monday. 2026-10-13 (Tue), 10-14 (Wed) are unscheduled.
      // Reference date: 2026-10-15 (Thu)
      const habit = await service.createHabit(testUser, {
        title: 'Weekly Team Sync Review',
        frequency: 'weekly',
        startDate: '2026-10-01',
        weekdays: [1], // Monday
      })

      const missed = await service.getMissedOccurrences(testUser, {
        habitId: habit.id,
        fromDate: '2026-10-12',
        toDate: '2026-10-14',
        referenceDate: '2026-10-15',
      })

      // Only Monday 10-12 was scheduled and missed
      const missedDates = missed.map((m) => m.date)
      expect(missedDates).toEqual(['2026-10-12'])
    })
  })

  describe('Recovery Logic & Invariants', () => {
    it('records recovery record with deterministic suggestion', async () => {
      const habit = await service.createHabit(testUser, {
        title: 'Coding Exercise',
        frequency: 'daily',
        startDate: '2026-10-10',
      })

      // Missed yesterday: 2026-10-14. Today: 2026-10-15.
      const { recovery, suggestion, habit: updated } = await service.recordRecovery(
        testUser,
        habit.id,
        '2026-10-14',
        {
          reason: 'exhausted',
          explanation: 'Overworked at the office',
          adjustment: 'Will do 2-minute version tomorrow',
          actionTaken: 'shorter',
        },
        '2026-10-15',
      )

      expect(recovery.reason).toBe('exhausted')
      expect(recovery.handled).toBe(true)
      expect(suggestion.reason).toBe('exhausted')
      expect(suggestion.shorterMinutes).toBe(2)
      expect(updated.recoveries['2026-10-14']).toBeDefined()
    })

    it('CRITICAL: recovery action does NOT mark habit completed and does NOT inflate streak', async () => {
      const habit = await service.createHabit(testUser, {
        title: 'Floss Teeth',
        frequency: 'daily',
        startDate: '2026-10-10',
      })

      // Reference date is 2026-10-15
      // Completed 10-10, 10-11. Missed 10-12, 10-13, 10-14.
      await service.recordCompletion(testUser, habit.id, '2026-10-10', '2026-10-15')
      await service.recordCompletion(testUser, habit.id, '2026-10-11', '2026-10-15')

      // Record recovery for 2026-10-14
      await service.recordRecovery(
        testUser,
        habit.id,
        '2026-10-14',
        {
          reason: 'no-time',
        },
        '2026-10-15',
      )

      const habitAfter = await service.getHabit(testUser, habit.id)
      // Must NOT be marked complete in completions
      expect(habitAfter.completions['2026-10-14']).toBeUndefined()

      const streak = await service.getStreak(testUser, habit.id, '2026-10-15')
      // Current streak must remain 0 because 10-12, 10-13, 10-14 were not completed!
      expect(streak.currentStreak).toBe(0)
    })
  })
})

