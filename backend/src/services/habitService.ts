import { randomUUID } from 'node:crypto'
import { IHabitRepository } from '../repositories/habitRepository.interface.js'
import {
  CreateHabitDTO,
  Habit,
  MissedOccurrence,
  RecoveryRecord,
  RecoverySuggestion,
  StreakInfo,
  UpdateHabitDTO,
} from '../types/habit.js'
import {
  addDays,
  compareDates,
  getTodayUTC,
  isValidDateString,
} from '../utils/dateUtils.js'
import {
  AppError,
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../utils/errors.js'
import { getRecoverySuggestion, validateRecoveryInput } from './recoveryLogic.js'
import { getScheduledDates, isScheduledOn, validateSchedule } from './scheduleLogic.js'
import { calculateStreak } from './streakLogic.js'

export class HabitService {
  constructor(private habitRepo: IHabitRepository) {}

  public async listHabits(
    userId: string,
    filter?: { isActive?: boolean },
  ): Promise<Habit[]> {
    return this.habitRepo.listHabits(userId, filter)
  }

  public async getHabit(userId: string, habitId: string): Promise<Habit> {
    const habit = await this.habitRepo.findHabitById(userId, habitId)
    if (!habit) {
      throw new NotFoundError(`Habit with ID '${habitId}' not found for this user.`)
    }
    return habit
  }

  public async createHabit(userId: string, dto: CreateHabitDTO): Promise<Habit> {
    const validation = validateSchedule(dto, false)
    if (!validation.valid) {
      throw new BadRequestError(validation.error)
    }

    const now = new Date().toISOString()
    const newHabit: Habit = {
      id: randomUUID(),
      userId,
      title: dto.title.trim(),
      notes: dto.notes ? dto.notes.trim() : '',
      durationValue: dto.durationValue ?? 15,
      durationUnit: dto.durationUnit ?? 'minutes',
      frequency: dto.frequency,
      startDate: dto.startDate,
      endDate: dto.endDate ?? null,
      oneTimeDate:
        dto.frequency === 'one-time'
          ? (dto.oneTimeDate ?? dto.startDate)
          : null,
      weekdays: Array.isArray(dto.weekdays) ? [...dto.weekdays] : [],
      extraDates: Array.isArray(dto.extraDates) ? [...dto.extraDates] : [],
      completions: {},
      recoveries: {},
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }

    return this.habitRepo.createHabit(newHabit)
  }

  public async updateHabit(
    userId: string,
    habitId: string,
    dto: UpdateHabitDTO,
  ): Promise<Habit> {
    const existing = await this.getHabit(userId, habitId)

    const validation = validateSchedule(
      {
        ...existing,
        ...dto,
      },
      true,
    )

    if (!validation.valid) {
      throw new BadRequestError(validation.error)
    }

    const updates: Partial<Habit> = {}
    if (dto.title !== undefined) updates.title = dto.title.trim()
    if (dto.notes !== undefined) updates.notes = dto.notes.trim()
    if (dto.durationValue !== undefined) updates.durationValue = dto.durationValue
    if (dto.durationUnit !== undefined) updates.durationUnit = dto.durationUnit
    if (dto.frequency !== undefined) updates.frequency = dto.frequency
    if (dto.startDate !== undefined) updates.startDate = dto.startDate
    if (dto.endDate !== undefined) updates.endDate = dto.endDate
    if (dto.oneTimeDate !== undefined) updates.oneTimeDate = dto.oneTimeDate
    if (dto.weekdays !== undefined) updates.weekdays = [...dto.weekdays]
    if (dto.extraDates !== undefined) updates.extraDates = [...dto.extraDates]
    if (dto.isActive !== undefined) updates.isActive = dto.isActive

    const updated = await this.habitRepo.updateHabit(userId, habitId, updates)
    if (!updated) {
      throw new NotFoundError(`Habit with ID '${habitId}' not found.`)
    }
    return updated
  }

  public async deleteHabit(userId: string, habitId: string): Promise<boolean> {
    await this.getHabit(userId, habitId)
    return this.habitRepo.deleteHabit(userId, habitId)
  }

  public async recordCompletion(
    userId: string,
    habitId: string,
    date: string,
    referenceDate?: string,
  ): Promise<{ habit: Habit; streak: StreakInfo }> {
    const today = referenceDate ?? getTodayUTC()

    if (!isValidDateString(date)) {
      throw new BadRequestError(
        `Invalid completion date: '${date}'. Must be in YYYY-MM-DD format.`,
      )
    }

    if (compareDates(date, today) > 0) {
      throw new BadRequestError(
        `Cannot record completions for future dates (received: ${date}, today is: ${today}).`,
      )
    }

    const habit = await this.getHabit(userId, habitId)

    if (!habit.isActive) {
      throw new BadRequestError('Cannot record completion for an inactive habit.')
    }

    if (compareDates(date, habit.startDate) < 0) {
      throw new BadRequestError(
        `Cannot record completion before habit start date (${habit.startDate}).`,
      )
    }

    if (habit.endDate && compareDates(date, habit.endDate) > 0) {
      throw new BadRequestError(
        `Cannot record completion after habit end date (${habit.endDate}).`,
      )
    }

    if (habit.completions && habit.completions[date]) {
      throw new ConflictError(
        `Completion has already been recorded for habit '${habit.title}' on date ${date}.`,
      )
    }

    const completions = { ...(habit.completions || {}), [date]: true }
    const updated = await this.habitRepo.updateHabit(userId, habitId, {
      completions,
    })

    if (!updated) {
      throw new NotFoundError(`Habit with ID '${habitId}' could not be updated.`)
    }

    const streak = calculateStreak(updated, today)
    return { habit: updated, streak }
  }

  public async removeCompletion(
    userId: string,
    habitId: string,
    date: string,
    referenceDate?: string,
  ): Promise<{ habit: Habit; streak: StreakInfo }> {
    const today = referenceDate ?? getTodayUTC()

    if (!isValidDateString(date)) {
      throw new BadRequestError(
        `Invalid date: '${date}'. Must be in YYYY-MM-DD format.`,
      )
    }

    const habit = await this.getHabit(userId, habitId)

    if (!habit.completions || !habit.completions[date]) {
      throw new NotFoundError(
        `No completion record found for habit '${habit.title}' on date ${date}.`,
      )
    }

    const completions = { ...habit.completions }
    delete completions[date]

    const updated = await this.habitRepo.updateHabit(userId, habitId, {
      completions,
    })

    if (!updated) {
      throw new NotFoundError(`Habit with ID '${habitId}' could not be updated.`)
    }

    const streak = calculateStreak(updated, today)
    return { habit: updated, streak }
  }

  public async getCompletions(
    userId: string,
    habitId: string,
  ): Promise<{ habitId: string; completions: Record<string, boolean> }> {
    const habit = await this.getHabit(userId, habitId)
    return {
      habitId: habit.id,
      completions: habit.completions || {},
    }
  }

  public async getStreak(
    userId: string,
    habitId: string,
    referenceDate?: string,
  ): Promise<StreakInfo> {
    const habit = await this.getHabit(userId, habitId)
    return calculateStreak(habit, referenceDate)
  }

  public async getMissedOccurrences(
    userId: string,
    options?: {
      habitId?: string
      fromDate?: string
      toDate?: string
      referenceDate?: string
    },
  ): Promise<MissedOccurrence[]> {
    const today = options?.referenceDate ?? getTodayUTC()
    const habits = options?.habitId
      ? [await this.getHabit(userId, options.habitId)]
      : await this.listHabits(userId, { isActive: true })

    const missed: MissedOccurrence[] = []
    const yesterday = addDays(today, -1)

    for (const habit of habits) {
      // Look back default window of 30 days or habit startDate
      const defaultStart = addDays(today, -30)
      const habitStart = habit.frequency === 'one-time'
        ? (habit.oneTimeDate ?? habit.startDate)
        : habit.startDate

      let start = options?.fromDate ?? (compareDates(habitStart, defaultStart) < 0 ? defaultStart : habitStart)
      if (compareDates(start, habitStart) < 0) {
        start = habitStart
      }

      let end = options?.toDate ?? yesterday
      if (compareDates(end, yesterday) > 0) {
        end = yesterday // Missed habits are strictly past occurrences
      }

      if (habit.endDate && compareDates(end, habit.endDate) > 0) {
        end = habit.endDate
      }

      if (compareDates(start, end) > 0) {
        continue
      }

      const scheduledDates = getScheduledDates(habit, start, end)

      for (const d of scheduledDates) {
        // Occurrence is missed if scheduled, in the past, and not completed
        if (compareDates(d, today) < 0 && (!habit.completions || !habit.completions[d])) {
          const recovery = habit.recoveries ? habit.recoveries[d] : undefined
          missed.push({
            habitId: habit.id,
            habitTitle: habit.title,
            date: d,
            hasRecovery: Boolean(recovery),
            recovery,
          })
        }
      }
    }

    return missed
  }

  public async recordRecovery(
    userId: string,
    habitId: string,
    date: string,
    recoveryInput: {
      reason: unknown
      explanation?: unknown
      adjustment?: unknown
      actionTaken?: unknown
      promptShown?: unknown
      handled?: unknown
    },
    referenceDate?: string,
  ): Promise<{
    habit: Habit
    recovery: RecoveryRecord
    suggestion: RecoverySuggestion
  }> {
    const today = referenceDate ?? getTodayUTC()

    if (!isValidDateString(date)) {
      throw new BadRequestError(`Invalid date: '${date}'. Must be in YYYY-MM-DD format.`)
    }

    if (compareDates(date, today) >= 0) {
      throw new BadRequestError(
        `Recovery can only be recorded for past missed occurrences (date must be before ${today}).`,
      )
    }

    const habit = await this.getHabit(userId, habitId)

    if (!isScheduledOn(habit, date)) {
      throw new BadRequestError(
        `Habit '${habit.title}' was not scheduled on ${date}. Recovery cannot be recorded.`,
      )
    }

    if (habit.completions && habit.completions[date]) {
      throw new BadRequestError(
        `Habit '${habit.title}' was completed on ${date}. Recovery is only for missed occurrences.`,
      )
    }

    const validation = validateRecoveryInput(recoveryInput)
    if (!validation.valid || !validation.data) {
      throw new BadRequestError(validation.error)
    }

    const recoveryRecord: RecoveryRecord = {
      promptShown: validation.data.promptShown ?? true,
      handled: validation.data.handled ?? true,
      reason: validation.data.reason!,
      explanation: validation.data.explanation,
      adjustment: validation.data.adjustment,
      actionTaken: validation.data.actionTaken,
      recordedAt: new Date().toISOString(),
    }

    const recoveries = {
      ...(habit.recoveries || {}),
      [date]: recoveryRecord,
    }

    // NOTE: In accordance with habit tracker domain rules, saving a recovery
    // NEVER marks the habit complete and NEVER inflates streaks.
    const updated = await this.habitRepo.updateHabit(userId, habitId, {
      recoveries,
    })

    if (!updated) {
      throw new NotFoundError(`Habit with ID '${habitId}' could not be updated.`)
    }

    const suggestion = getRecoverySuggestion(recoveryRecord.reason)

    return {
      habit: updated,
      recovery: recoveryRecord,
      suggestion,
    }
  }

  public async getRecoveries(
    userId: string,
    habitId: string,
  ): Promise<Record<string, RecoveryRecord>> {
    const habit = await this.getHabit(userId, habitId)
    return habit.recoveries || {}
  }
}

