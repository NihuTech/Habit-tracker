import { dateKey } from './schedule'
import type { DurationUnit, Frequency, Reminder, Task } from './types'

export const TASKS_KEY = 'habit-tracker.tasks'
export const REMINDERS_KEY = 'habit-tracker.reminders'

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

export function migrateTask(raw: Record<string, unknown>, today: string): Task {
  const durationValue = asNumber(
    raw.durationValue,
    Math.max(1, asNumber(raw.minutes, 15)),
  )
  const durationUnit: DurationUnit =
    raw.durationUnit === 'hours' ? 'hours' : 'minutes'
  const frequency: Frequency =
    raw.frequency === 'one-time' ||
    raw.frequency === 'weekly' ||
    raw.frequency === 'custom' ||
    raw.frequency === 'daily'
      ? raw.frequency
      : 'daily'
  const completions = asRecord(raw.completions) as Task['completions']
  if (raw.completed === true && !completions[today]) {
    completions[today] = true
  }

  return {
    id: asString(raw.id, crypto.randomUUID()),
    title: asString(raw.title, 'Untitled task'),
    notes: asString(raw.notes),
    durationValue: durationValue > 0 ? durationValue : 15,
    durationUnit,
    frequency,
    startDate: asString(raw.startDate, today),
    endDate: typeof raw.endDate === 'string' && raw.endDate ? raw.endDate : null,
    oneTimeDate:
      typeof raw.oneTimeDate === 'string' && raw.oneTimeDate
        ? raw.oneTimeDate
        : frequency === 'one-time'
          ? asString(raw.startDate, today)
          : null,
    weekdays: Array.isArray(raw.weekdays)
      ? raw.weekdays.filter((day): day is number => typeof day === 'number')
      : [],
    extraDates: Array.isArray(raw.extraDates)
      ? raw.extraDates.filter((day): day is string => typeof day === 'string')
      : [],
    completions,
    recoveries: (asRecord(raw.recoveries) as Task['recoveries']) ?? {},
    parentId: typeof raw.parentId === 'string' ? raw.parentId : undefined,
  }
}

export function starterTasks(today: string): Task[] {
  return [
    {
      id: '1',
      title: 'Drink a glass of water',
      notes: 'Start the day hydrated.',
      durationValue: 5,
      durationUnit: 'minutes',
      frequency: 'daily',
      startDate: today,
      endDate: null,
      oneTimeDate: null,
      weekdays: [],
      extraDates: [],
      completions: {},
      recoveries: {},
    },
    {
      id: '2',
      title: 'Move for 20 minutes',
      notes: 'Walk, stretch, or a short workout.',
      durationValue: 20,
      durationUnit: 'minutes',
      frequency: 'daily',
      startDate: today,
      endDate: null,
      oneTimeDate: null,
      weekdays: [],
      extraDates: [],
      completions: {},
      recoveries: {},
    },
    {
      id: '3',
      title: 'Read 10 pages',
      notes: 'Any book that feels good today.',
      durationValue: 15,
      durationUnit: 'minutes',
      frequency: 'daily',
      startDate: today,
      endDate: null,
      oneTimeDate: null,
      weekdays: [],
      extraDates: [],
      completions: {},
      recoveries: {},
    },
  ]
}

export function loadTasks(): Task[] {
  const today = dateKey()
  const raw = localStorage.getItem(TASKS_KEY)
  if (!raw) return starterTasks(today)
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return starterTasks(today)
    return parsed.map((item) =>
      migrateTask(asRecord(item as Record<string, unknown>), today),
    )
  } catch {
    return starterTasks(today)
  }
}

export function loadReminders(): Reminder[] {
  const raw = localStorage.getItem(REMINDERS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as Reminder[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
