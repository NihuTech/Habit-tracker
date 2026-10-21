import { Habit, StreakInfo } from '../types/habit.js'
import { compareDates, getTodayUTC } from '../utils/dateUtils.js'
import { getScheduledDates, isScheduledOn } from './scheduleLogic.js'

/**
 * Calculates current and longest streak for a habit.
 *
 * Current Streak Behavior for Today:
 * - If today is a scheduled day and is completed: today counts (+1).
 * - If today is a scheduled day and has NOT yet been completed: today is still in progress,
 *   so the streak is NOT broken. The current streak reflects the continuous streak up to
 *   the previous scheduled occurrence. Once today is completed, it immediately increments.
 * - If today is NOT a scheduled day (e.g. rest day): unscheduled days do NOT break a streak.
 *   The streak reflects the continuous streak up to the most recent scheduled occurrence.
 * - If a previous scheduled occurrence was missed: current streak resets to 0.
 *
 * @param habit The habit entity containing schedule and completions
 * @param referenceDate Reference date string ('YYYY-MM-DD'). Defaults to today in UTC.
 */
export function calculateStreak(habit: Habit, referenceDate?: string): StreakInfo {
  const today = referenceDate ?? getTodayUTC()
  const isCompletedToday = Boolean(habit.completions && habit.completions[today])
  const todayScheduled = isScheduledOn(habit, today)

  // 1. One-time habits have binary streak (1 if completed, 0 if not)
  if (habit.frequency === 'one-time') {
    const targetDate = habit.oneTimeDate ?? habit.startDate
    const completed = Boolean(habit.completions && habit.completions[targetDate])
    return {
      habitId: habit.id,
      currentStreak: completed ? 1 : 0,
      longestStreak: completed ? 1 : 0,
      lastCompletedDate: completed ? targetDate : null,
      isCompletedToday,
      todayScheduled: targetDate === today,
    }
  }

  // 2. Determine effective date bounds for historical evaluation
  const effectiveEnd =
    habit.endDate && compareDates(habit.endDate, today) < 0
      ? habit.endDate
      : today

  if (compareDates(habit.startDate, effectiveEnd) > 0) {
    return {
      habitId: habit.id,
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: null,
      isCompletedToday: false,
      todayScheduled: false,
    }
  }

  // All scheduled occurrences in chronological order from startDate up to effectiveEnd
  const scheduledDates = getScheduledDates(habit, habit.startDate, effectiveEnd)

  // Find all completed dates for calculating lastCompletedDate
  const completedScheduledDates = scheduledDates.filter(
    (d) => habit.completions && habit.completions[d],
  )
  const lastCompletedDate =
    completedScheduledDates.length > 0
      ? completedScheduledDates[completedScheduledDates.length - 1]
      : null

  // 3. Calculate Longest Streak across all scheduled dates up to today
  let longestStreak = 0
  let currentRunning = 0

  for (const date of scheduledDates) {
    if (habit.completions && habit.completions[date]) {
      currentRunning++
      if (currentRunning > longestStreak) {
        longestStreak = currentRunning
      }
    } else {
      currentRunning = 0
    }
  }

  // 4. Calculate Current Streak
  // We work backwards from the most recent relevant scheduled date.
  let currentStreak = 0

  if (scheduledDates.length > 0) {
    let startIndex = scheduledDates.length - 1
    const lastScheduled = scheduledDates[startIndex]

    if (lastScheduled === today) {
      if (isCompletedToday) {
        // Today is completed, count backwards from today
        startIndex = scheduledDates.length - 1
      } else {
        // Today is scheduled but not completed yet:
        // Do not break the streak. Count backwards starting from the previous scheduled day.
        startIndex = scheduledDates.length - 2
      }
    } else {
      // Today is not scheduled (or habit ended in past):
      // Count backwards starting from the last scheduled day.
      startIndex = scheduledDates.length - 1
    }

    // Traverse backwards through scheduled occurrences
    for (let i = startIndex; i >= 0; i--) {
      const scheduledDate = scheduledDates[i]
      if (habit.completions && habit.completions[scheduledDate]) {
        currentStreak++
      } else {
        // A scheduled day was not completed: streak is broken!
        break
      }
    }
  }

  return {
    habitId: habit.id,
    currentStreak,
    longestStreak,
    lastCompletedDate,
    isCompletedToday,
    todayScheduled,
  }
}

