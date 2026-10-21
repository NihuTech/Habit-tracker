import type { DurationUnit, Frequency, RecoveryRecord, Task } from './types'

// ── Config ───────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:5000/api'

// ── Session helpers ──────────────────────────────────────────────────────────
// ONE place that knows about session storage and the active user.
// App.tsx calls setSession() after login/signup and clearSession() on logout.

export interface SessionUser {
  id: string
  name: string
  email: string
  description?: string | null
}

interface StoredSession {
  token: string
  user: SessionUser
}

const SESSION_KEY = 'ht_session'

export function getSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as StoredSession) : null
  } catch {
    return null
  }
}

export function setSession(user: SessionUser, token: string): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token, user }))
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

// Called by App.tsx when a 401 is caught from any API call so it can reset
// auth state. Set this before making any requests.
let _on401: (() => void) | null = null
export function registerOn401Handler(fn: () => void): void {
  _on401 = fn
}

// ── Shared types ─────────────────────────────────────────────────────────────

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
    reason?: unknown
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
        reason: rec.reason as import('./types').MissedReason | undefined,
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

// ── Core fetch wrapper ───────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const session = getSession()
  const url = `${API_BASE}${path}`
  const headers = new Headers(options.headers || {})

  // Auth header — bearer token from the logged-in session
  if (session?.token) {
    headers.set('Authorization', `Bearer ${session.token}`)
  }
  // X-User-Id — kept in one spot so it's easy to drop later
  // Uses the logged-in user's real id, falls back to 'user-001' for compat
  headers.set('X-User-Id', session?.user.id ?? 'user-001')

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

  // Handle 401 globally — clear session and show login
  if (res.status === 401) {
    clearSession()
    _on401?.()
    throw new Error('Session expired. Please log in again.')
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

// ── Auth API ─────────────────────────────────────────────────────────────────

interface AuthApiResponse {
  token: string
  user: SessionUser
}

export async function authSignup(payload: {
  name: string
  email: string
  password: string
}): Promise<{ token: string; user: SessionUser }> {
  const url = `${API_BASE}/auth/signup`
  const headers = new Headers({ 'Content-Type': 'application/json' })
  let res: Response
  try {
    res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) })
  } catch (err) {
    throw new Error(`Unable to reach the server. (${(err as Error).message})`)
  }
  const json: ApiResponse<AuthApiResponse> = await res.json()
  if (!res.ok || json.success === false) {
    throw new Error(json.error || json.message || `Signup failed (${res.status})`)
  }
  return json.data!
}

export async function authLogin(payload: {
  email: string
  password: string
}): Promise<{ token: string; user: SessionUser }> {
  const url = `${API_BASE}/auth/login`
  const headers = new Headers({ 'Content-Type': 'application/json' })
  let res: Response
  try {
    res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) })
  } catch (err) {
    throw new Error(`Unable to reach the server. (${(err as Error).message})`)
  }
  const json: ApiResponse<AuthApiResponse> = await res.json()
  if (!res.ok || json.success === false) {
    throw new Error(json.error || json.message || `Login failed (${res.status})`)
  }
  return json.data!
}

export async function authMe(): Promise<SessionUser> {
  // Use raw fetch to avoid the circular 401-handler loop
  const session = getSession()
  if (!session) throw new Error('No session')
  const url = `${API_BASE}/auth/me`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.token}`,
      'X-User-Id': session.user.id,
    },
  })
  const json: ApiResponse<SessionUser> = await res.json()
  if (!res.ok || json.success === false) throw new Error(json.error || 'Unauthorized')
  return json.data!
}

export async function authLogout(): Promise<void> {
  const session = getSession()
  if (!session) return
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.token}` },
    })
  } catch {
    // ignore network errors on logout
  }
  clearSession()
}

// ── Habit API ─────────────────────────────────────────────────────────────────

export async function getHabits(): Promise<Task[]> {
  const data = await request<BackendHabit[]>('/tasks', { method: 'GET' })
  return (data || []).map(mapBackendHabitToTask)
}

export async function createHabit(payload: CreateHabitPayload): Promise<Task> {
  const data = await request<BackendHabit>('/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return mapBackendHabitToTask(data)
}

export async function updateHabit(id: string, payload: UpdateHabitPayload): Promise<Task> {
  const data = await request<BackendHabit>(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return mapBackendHabitToTask(data)
}

export async function deleteHabit(id: string): Promise<void> {
  await request<{ success: boolean; message: string }>(`/tasks/${id}`, { method: 'DELETE' })
}

export async function recordCompletion(
  habitId: string,
  date: string,
  referenceDate?: string,
): Promise<Task> {
  const data = await request<CompletionResult>(`/tasks/${habitId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ date, referenceDate }),
  })
  return mapBackendHabitToTask(data.habit)
}

export async function removeCompletion(habitId: string, date: string): Promise<Task> {
  const data = await request<CompletionResult>(`/tasks/${habitId}/complete/${date}`, {
    method: 'DELETE',
  })
  return mapBackendHabitToTask(data.habit)
}

export async function getStreak(habitId: string): Promise<StreakDto> {
  return request<StreakDto>(`/tasks/${habitId}/streak`, { method: 'GET' })
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
): Promise<Task> {
  const data = await request<RecoveryResult>(`/tasks/${habitId}/recovery`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return mapBackendHabitToTask(data.habit)
}
