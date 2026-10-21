import type { DurationUnit, Frequency, RecoveryRecord, Task } from './types'

// Default to backend port 8080 (fallback to 5000 if 8080 not set)
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080/api'
export const DEFAULT_USER_ID = 'user-001'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  count?: number
}

export interface BackendHabit {
  id: string
  userId: string
  title: string
  notes?: string
  durationValue: number
  durationUnit: DurationUnit
  frequency: Frequency
  startDate: string
  endDate?: string | null
  oneTimeDate?: string | null
  weekdays?: number[]
  extraDates?: string[]
  completions?: Record<string, boolean>
  recoveries?: Record<string, {
    promptShown?: boolean
    handled?: boolean
    reason?: any
    explanation?: string
    adjustment?: string
    actionTaken?: string
    recordedAt?: string
  }>
  parentId?: string
  createdAt?: string
  updatedAt?: string
  isActive?: boolean
}

export interface StreakDto {
  habitId: string
  currentStreak: number
  longestStreak: number
  lastCompletedDate: string | null
  todayScheduled: boolean
  isCompletedToday: boolean
}

export interface CompletionResult {
  habit: BackendHabit
  streak: StreakDto
}

export interface RecoveryResult {
  habit: BackendHabit
  recovery: RecoveryRecord
  suggestion?: unknown
}

export interface CreateHabitPayload {
  title: string
  notes?: string
  durationValue: number
  durationUnit: DurationUnit
  frequency: Frequency
  startDate: string
  endDate?: string | null
  oneTimeDate?: string | null
  weekdays?: number[]
  extraDates?: string[]
}

export type UpdateHabitPayload = Partial<CreateHabitPayload>

export function mapBackendHabitToTask(habit: BackendHabit): Task {
  const recoveries: Record<string, RecoveryRecord> = {}
  if (habit.recoveries) {
    for (const [date, rec] of Object.entries(habit.recoveries)) {
      recoveries[date] = {
        promptShown: Boolean(rec.promptShown),
        handled: Boolean(rec.handled),
        reason: rec.reason,
        explanation: rec.explanation,
        adjustment: rec.adjustment,
        actionTaken: rec.actionTaken,
      }
    }
  }

  return {
    id: habit.id,
    title: habit.title ?? 'Untitled task',
    notes: habit.notes ?? '',
    durationValue: habit.durationValue ?? 15,
    durationUnit: habit.durationUnit ?? 'minutes',
    frequency: habit.frequency ?? 'daily',
    startDate: habit.startDate,
    endDate: habit.endDate ?? null,
    oneTimeDate: habit.oneTimeDate ?? null,
    weekdays: habit.weekdays ?? [],
    extraDates: habit.extraDates ?? [],
    completions: habit.completions ?? {},
    recoveries,
    parentId: habit.parentId,
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  userId: string = DEFAULT_USER_ID,
): Promise<T> {
  const url = `${API_BASE}${path}`
  const headers = new Headers(options.headers || {})
  headers.set('X-User-Id', userId)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let res: Response
  try {
    res = await fetch(url, { ...options, headers })
  } catch (err) {
    throw new Error(
      `Unable to reach the server at ${API_BASE}. Please ensure the backend is running. (${(err as Error).message})`,
    )
  }

  let json: ApiResponse<T>
  try {
    json = await res.json()
  } catch {
    throw new Error(`Server returned ${res.status} with non-JSON response.`)
  }

  if (!res.ok || json.success === false) {
    throw new Error(json.error || json.message || `Request failed with status ${res.status}`)
  }

  return json.data as T
}

export async function getHabits(userId = DEFAULT_USER_ID): Promise<Task[]> {
  const data = await request<BackendHabit[]>('/tasks', { method: 'GET' }, userId)
  return (data || []).map(mapBackendHabitToTask)
}

export async function createHabit(
  payload: CreateHabitPayload,
  userId = DEFAULT_USER_ID,
): Promise<Task> {
  const data = await request<BackendHabit>(
    '/tasks',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    userId,
  )
  return mapBackendHabitToTask(data)
}

export async function updateHabit(
  id: string,
  payload: UpdateHabitPayload,
  userId = DEFAULT_USER_ID,
): Promise<Task> {
  const data = await request<BackendHabit>(
    `/tasks/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    userId,
  )
  return mapBackendHabitToTask(data)
}

export async function deleteHabit(id: string, userId = DEFAULT_USER_ID): Promise<void> {
  await request<{ success: boolean; message: string }>(
    `/tasks/${id}`,
    { method: 'DELETE' },
    userId,
  )
}

export async function recordCompletion(
  habitId: string,
  date: string,
  referenceDate?: string,
  userId = DEFAULT_USER_ID,
): Promise<Task> {
  const data = await request<CompletionResult>(
    `/tasks/${habitId}/complete`,
    {
      method: 'POST',
      body: JSON.stringify({ date, referenceDate }),
    },
    userId,
  )
  return mapBackendHabitToTask(data.habit)
}

export async function removeCompletion(
  habitId: string,
  date: string,
  userId = DEFAULT_USER_ID,
): Promise<Task> {
  const data = await request<CompletionResult>(
    `/tasks/${habitId}/complete/${date}`,
    { method: 'DELETE' },
    userId,
  )
  return mapBackendHabitToTask(data.habit)
}

export async function getStreak(
  habitId: string,
  userId = DEFAULT_USER_ID,
): Promise<StreakDto> {
  return request<StreakDto>(`/tasks/${habitId}/streak`, { method: 'GET' }, userId)
}

export interface RecordRecoveryPayload {
  date: string
  reason: string
  explanation?: string
  adjustment?: string
  actionTaken?: string
  promptShown?: boolean
  handled?: boolean
  referenceDate?: string
}

export async function recordRecovery(
  habitId: string,
  payload: RecordRecoveryPayload,
  userId = DEFAULT_USER_ID,
): Promise<Task> {
  const data = await request<RecoveryResult>(
    `/tasks/${habitId}/recovery`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    userId,
  )
  return mapBackendHabitToTask(data.habit)
}
