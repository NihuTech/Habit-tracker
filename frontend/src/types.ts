export type Frequency = 'one-time' | 'daily' | 'weekly' | 'custom'
export type DurationUnit = 'minutes' | 'hours'

export type MissedReason =
  | 'exhausted'
  | 'upset'
  | 'procrastinating'
  | 'overwhelming'
  | 'no-time'
  | 'something-else'

export type RecoveryRecord = {
  promptShown: boolean
  handled: boolean
  reason?: MissedReason
  explanation?: string
  adjustment?: string
  actionTaken?: string
}

export type Task = {
  id: string
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
  parentId?: string
}

export type StreakState = {
  count: number
  lastCompleteDate: string | null
}

export type Reminder = {
  id: string
  taskId: string
  title: string
  at: number
  delivered: boolean
}

export type MissedOccurrence = {
  task: Task
  date: string
}
