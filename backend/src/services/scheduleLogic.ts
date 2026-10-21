import { CreateHabitDTO, Habit, UpdateHabitDTO } from '../types/habit.js'
import {
  compareDates,
  dateRange,
  getWeekday,
  isValidDateString,
} from '../utils/dateUtils.js'

export function isScheduledOn(habit: Habit, date: string): boolean {
  // Extra dates explicitly added override regular schedules
  if (habit.extraDates && habit.extraDates.includes(date)) {
    return true
  }

  // One-time habits occur only on their specific designated date
  if (habit.frequency === 'one-time') {
    const targetDate = habit.oneTimeDate ?? habit.startDate
    return targetDate === date
  }

  // Habits do not occur before their start date
  if (compareDates(date, habit.startDate) < 0) {
    return false
  }

  // Habits do not occur after their end date (if defined)
  if (habit.endDate && compareDates(date, habit.endDate) > 0) {
    return false
  }

  // Daily habits occur every single day in the interval
  if (habit.frequency === 'daily') {
    return true
  }

  // Weekly and Custom habits occur on the configured weekdays
  if (habit.frequency === 'weekly' || habit.frequency === 'custom') {
    const weekday = getWeekday(date)
    return habit.weekdays.includes(weekday)
  }

  return false
}

export function getScheduledDates(
  habit: Habit,
  fromDate: string,
  toDate: string,
): string[] {
  if (compareDates(fromDate, toDate) > 0) return []
  return dateRange(fromDate, toDate).filter((date) => isScheduledOn(habit, date))
}

export function validateSchedule(
  dto: CreateHabitDTO | UpdateHabitDTO,
  isUpdate = false,
): { valid: boolean; error?: string } {
  if (!isUpdate || dto.title !== undefined) {
    if (!dto.title || typeof dto.title !== 'string' || dto.title.trim().length === 0) {
      return { valid: false, error: 'Habit title is required and cannot be empty.' }
    }
  }

  if (!isUpdate || dto.startDate !== undefined) {
    if (!dto.startDate || !isValidDateString(dto.startDate)) {
      return {
        valid: false,
        error: `startDate must be a valid date in YYYY-MM-DD format (received: ${dto.startDate}).`,
      }
    }
  }

  if (dto.endDate !== undefined && dto.endDate !== null) {
    if (!isValidDateString(dto.endDate)) {
      return {
        valid: false,
        error: `endDate must be a valid date in YYYY-MM-DD format (received: ${dto.endDate}).`,
      }
    }
    const start = dto.startDate ?? '1970-01-01'
    if (compareDates(dto.endDate, start) < 0) {
      return {
        valid: false,
        error: `endDate (${dto.endDate}) cannot be before startDate (${start}).`,
      }
    }
  }

  if (!isUpdate || dto.frequency !== undefined) {
    const validFreqs = ['one-time', 'daily', 'weekly', 'custom']
    if (!dto.frequency || !validFreqs.includes(dto.frequency)) {
      return {
        valid: false,
        error: `frequency must be one of: ${validFreqs.join(', ')}.`,
      }
    }

    if (dto.frequency === 'one-time') {
      const oneTimeDate = dto.oneTimeDate ?? dto.startDate
      if (!oneTimeDate || !isValidDateString(oneTimeDate)) {
        return {
          valid: false,
          error: 'one-time habits require a valid oneTimeDate or startDate in YYYY-MM-DD format.',
        }
      }
    }

    if (dto.frequency === 'weekly') {
      if (
        !Array.isArray(dto.weekdays) ||
        dto.weekdays.length === 0 ||
        !dto.weekdays.every((d) => typeof d === 'number' && d >= 0 && d <= 6)
      ) {
        return {
          valid: false,
          error: 'weekly habits require weekdays array with at least one day (0=Sun, ..., 6=Sat).',
        }
      }
    }

    if (dto.frequency === 'custom') {
      const hasWeekdays =
        Array.isArray(dto.weekdays) &&
        dto.weekdays.length > 0 &&
        dto.weekdays.every((d) => typeof d === 'number' && d >= 0 && d <= 6)
      const hasExtra =
        Array.isArray(dto.extraDates) &&
        dto.extraDates.length > 0 &&
        dto.extraDates.every(isValidDateString)

      if (!hasWeekdays && !hasExtra) {
        return {
          valid: false,
          error: 'custom habits require valid weekdays or extraDates.',
        }
      }
    }
  }

  if (dto.durationValue !== undefined) {
    if (typeof dto.durationValue !== 'number' || dto.durationValue <= 0) {
      return {
        valid: false,
        error: 'durationValue must be a positive number greater than 0.',
      }
    }
  }

  if (dto.durationUnit !== undefined) {
    if (dto.durationUnit !== 'minutes' && dto.durationUnit !== 'hours') {
      return {
        valid: false,
        error: "durationUnit must be either 'minutes' or 'hours'.",
      }
    }
  }

  if (dto.extraDates !== undefined) {
    if (
      !Array.isArray(dto.extraDates) ||
      !dto.extraDates.every(isValidDateString)
    ) {
      return {
        valid: false,
        error: 'extraDates must be an array of valid YYYY-MM-DD date strings.',
      }
    }
  }

  return { valid: true }
}

