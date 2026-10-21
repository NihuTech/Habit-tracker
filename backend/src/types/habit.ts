export type Frequency = 'one-time' | 'daily' | 'weekly' | 'custom'
export type DurationUnit = 'minutes' | 'hours'

export type MissedReason =
  | 'exhausted'
  | 'upset'
  | 'procrastinating'
  | 'overwhelming'
  | 'no-time'
  | 'something-else'

export interface RecoveryRecord {
  promptShown: boolean
  handled: boolean
  reason: MissedReason
  explanation?: string
  adjustment?: string
  actionTaken?: string
  recordedAt: string
}

export interface Habit {
  id: string
  userId: string
  title: string
  notes: string
  durationValue: number
  durationUnit: DurationUnit
  frequency: Frequency
  startDate: string
  endDate: string | null
  oneTimeDate: string | null
  weekdays: number[]
  extraDates: string[]
  completions: Record<string, boolean>
  recoveries: Record<string, RecoveryRecord>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateHabitDTO {
  title: string
  notes?: string
  durationValue?: number
  durationUnit?: DurationUnit
  frequency: Frequency
  startDate: string
  endDate?: string | null
  oneTimeDate?: string | null
  weekdays?: number[]
  extraDates?: string[]
}

export interface UpdateHabitDTO {
  title?: string
  notes?: string
  durationValue?: number
  durationUnit?: DurationUnit
  frequency?: Frequency
  startDate?: string
  endDate?: string | null
  oneTimeDate?: string | null
  weekdays?: number[]
  extraDates?: string[]
  isActive?: boolean
}

export interface StreakInfo {
  habitId: string
  currentStreak: number
  longestStreak: number
  lastCompletedDate: string | null
  isCompletedToday: boolean
  todayScheduled: boolean
}

export interface MissedOccurrence {
  habitId: string
  habitTitle: string
  date: string
  hasRecovery: boolean
  recovery?: RecoveryRecord
}

export interface RecoverySuggestion {
  reason: MissedReason
  label: string
  suggestion: string
  recommendedActions: Array<'reschedule' | 'shorter' | 'steps' | 'reminder' | 'focus'>
  shorterMinutes?: number
}

export interface DemoUser {
  id: string
  name: string
  email: string
  description: string
}

