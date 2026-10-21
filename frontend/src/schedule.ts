import type { DurationUnit, Frequency, Task } from './types'

export const WEEKDAYS = [
  { value: 1, label: 'Mon', name: 'Monday' },
  { value: 2, label: 'Tue', name: 'Tuesday' },
  { value: 3, label: 'Wed', name: 'Wednesday' },
  { value: 4, label: 'Thu', name: 'Thursday' },
  { value: 5, label: 'Fri', name: 'Friday' },
  { value: 6, label: 'Sat', name: 'Saturday' },
  { value: 0, label: 'Sun', name: 'Sunday' },
]




export function dateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateKey(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addDays(key: string, amount: number) {
  const date = parseDateKey(key)
  date.setDate(date.getDate() + amount)
  return dateKey(date)
}

export function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatShortDate(key: string) {
  const date = parseDateKey(key)
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
  }).format(date)
}

export function weekdayOf(key: string) {
  return parseDateKey(key).getDay()
}

export function toTotalMinutes(value: number, unit: DurationUnit) {
  return unit === 'hours' ? value * 60 : value
}

export function durationToSeconds(value: number, unit: DurationUnit) {
  return Math.round(toTotalMinutes(value, unit) * 60)
}

export function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.round(totalMinutes % 60)
  const hourLabel = hours === 0 ? '' : hours === 1 ? '1 hour' : `${hours} hours`
  const minuteLabel =
    minutes === 0 ? '' : minutes === 1 ? '1 minute' : `${minutes} minutes`
  return [hourLabel, minuteLabel].filter(Boolean).join(' ') || '0 minutes'
}

export function formatDuration(value: number, unit: DurationUnit) {
  return formatMinutes(toTotalMinutes(value, unit))
}

export function formatTimer(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatDayList(days: number[]) {
  const names = WEEKDAYS.filter((day) => days.includes(day.value)).map(
    (day) => day.name,
  )
  if (names.length === 0) return 'selected days'
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

function formatRange(task: Task) {
  if (!task.endDate) return `from ${formatShortDate(task.startDate)}`
  return `${formatShortDate(task.startDate)} – ${formatShortDate(task.endDate)}`
}

export function formatFrequencyLabel(task: Task) {
  if (task.frequency === 'one-time') {
    const date = task.oneTimeDate ?? task.startDate
    return `One-time · ${formatShortDate(date)}`
  }
  if (task.frequency === 'daily') return 'Daily'
  return `Every ${formatDayList(task.weekdays)}`
}

export function formatScheduleDetail(task: Task) {
  if (task.frequency === 'one-time') return formatFrequencyLabel(task)
  return `${formatFrequencyLabel(task)} · ${formatRange(task)}`
}

export function isScheduledOn(task: Task, date: string) {
  if (task.extraDates.includes(date)) return true
  if (task.frequency === 'one-time') {
    return (task.oneTimeDate ?? task.startDate) === date
  }
  if (date < task.startDate) return false
  if (task.endDate && date > task.endDate) return false
  if (task.frequency === 'daily') return true
  return task.weekdays.includes(weekdayOf(date))
}

export function isCompletedOn(task: Task, date: string) {
  return Boolean(task.completions[date])
}

export function eachDate(from: string, to: string) {
  const dates: string[] = []
  let current = from
  while (current <= to) {
    dates.push(current)
    current = addDays(current, 1)
  }
  return dates
}

export function findMissedOccurrences(tasks: Task[], today: string) {
  const windowStart = addDays(today, -30)
  const yesterday = addDays(today, -1)
  const missed = []

  for (const task of tasks) {
    const start = task.frequency === 'one-time'
      ? (task.oneTimeDate ?? task.startDate)
      : task.startDate < windowStart
        ? windowStart
        : task.startDate
    const end = yesterday < start ? start : yesterday
    if (start >= today) continue

    for (const date of eachDate(start, end)) {
      if (date >= today) continue
      if (!isScheduledOn(task, date)) continue
      if (isCompletedOn(task, date)) continue
      missed.push({ task, date })
    }
  }

  return missed
}

export function defaultWeekdays(frequency: Frequency) {
  if (frequency === 'weekly') return [1]
  if (frequency === 'custom') return [1, 3]
  return []
}

export function computeStreak(tasks: Task[], today: string): number {
  if (!tasks.length) return 0

  let earliestStartDate = ''
  for (const task of tasks) {
    const s =
      task.frequency === 'one-time'
        ? (task.oneTimeDate ?? task.startDate)
        : task.startDate
    if (s && (!earliestStartDate || s < earliestStartDate)) {
      earliestStartDate = s
    }
  }
  if (!earliestStartDate) return 0

  function getDayStatus(d: string): 'complete' | 'empty' | 'incomplete' {
    const scheduled = tasks.filter((t) => isScheduledOn(t, d))
    if (scheduled.length === 0) return 'empty'
    return scheduled.every((t) => isCompletedOn(t, d)) ? 'complete' : 'incomplete'
  }

  let count = 0

  // Today counts if complete. If today isn't complete yet, it does not break the streak.
  const todayStatus = getDayStatus(today)
  if (todayStatus === 'complete') {
    count += 1
  }

  // Count back from yesterday down to earliestStartDate
  let checkDate = addDays(today, -1)
  while (checkDate >= earliestStartDate) {
    const status = getDayStatus(checkDate)
    if (status === 'complete') {
      count += 1
      checkDate = addDays(checkDate, -1)
    } else if (status === 'empty') {
      // A day with no scheduled tasks is skipped: it neither adds to the streak nor breaks it.
      checkDate = addDays(checkDate, -1)
    } else {
      // Incomplete day breaks the streak.
      break
    }
  }

  return count
}
