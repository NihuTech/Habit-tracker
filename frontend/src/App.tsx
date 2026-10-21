import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import './auth.css'
import {
  authLogout,
  authMe,
  clearSession,
  createHabit,
  deleteHabit,
  getHabits,
  getSession,
  recordCompletion,
  recordRecovery,
  registerOn401Handler,
  removeCompletion,
  setSession,
  updateHabit,
} from './api'
import type { SessionUser } from './api'
import { AuthPage } from './AuthPage'
import { RecoveryPrompt } from './RecoveryPrompt'
import {
  addDays,
  dateKey,
  durationToSeconds,
  findMissedOccurrences,
  formatDuration,
  formatFrequencyLabel,
  formatLongDate,
  formatScheduleDetail,
  formatShortDate,
  formatTimer,
  isCompletedOn,
  isScheduledOn,
  parseDateKey,
} from './schedule'
import {
  loadReminders,
  loadStreak,
  REMINDERS_KEY,
  STREAK_KEY,
} from './storage'
import { TaskForm, taskToDraft } from './TaskForm'
import type { TaskDraft } from './TaskForm'
import type {
  DurationUnit,
  MissedOccurrence,
  RecoveryRecord,
  Reminder,
  Task,
} from './types'

function emptyDraft(today: string): TaskDraft {
  return {
    title: '',
    notes: '',
    durationValue: 15,
    durationUnit: 'minutes',
    frequency: 'daily',
    startDate: today,
    endDate: '',
    oneTimeDate: today,
    weekdays: [],
  }
}

function App() {
  const realToday = dateKey()
  const [viewDate, setViewDate] = useState(realToday)
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  // ── Auth state ───────────────────────────────────────────────────────────
  const [authChecking, setAuthChecking] = useState(true)
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null)

  function handleAuthenticated(user: SessionUser, token: string) {
    setSession(user, token)
    setCurrentUser(user)
  }

  function handleLogout() {
    void authLogout().finally(() => {
      clearSession()
      setCurrentUser(null)
      setTasks([])
    })
  }

  // Verify stored session on mount
  useEffect(() => {
    registerOn401Handler(() => {
      clearSession()
      setCurrentUser(null)
      setTasks([])
    })
    const stored = getSession()
    if (!stored) {
      setAuthChecking(false)
      return
    }
    authMe()
      .then((user) => {
        setCurrentUser(user)
      })
      .catch(() => {
        clearSession()
        setCurrentUser(null)
      })
      .finally(() => {
        setAuthChecking(false)
      })
  }, [])
  const [streak, setStreak] = useState(loadStreak)
  const [reminders, setReminders] = useState<Reminder[]>(loadReminders)
  const [reminderBanner, setReminderBanner] = useState('')
  const [formMode, setFormMode] = useState<'closed' | 'add' | 'edit'>('closed')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState<MissedOccurrence | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(15 * 60)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerValue, setTimerValue] = useState(15)
  const [timerUnit, setTimerUnit] = useState<DurationUnit>('minutes')
  const [timerError, setTimerError] = useState('')

  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const fetched = await getHabits()
      setTasks(fetched)
    } catch (err) {
      setErrorMessage((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Only fetch habits once the user is confirmed logged in
  useEffect(() => {
    if (currentUser) void fetchTasks()
  }, [fetchTasks, currentUser])

  const now = new Date()
  const hour = now.getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const visibleTasks = useMemo(
    () => tasks.filter((task) => isScheduledOn(task, viewDate)),
    [tasks, viewDate],
  )
  const todayTasks = useMemo(
    () => tasks.filter((task) => isScheduledOn(task, realToday)),
    [tasks, realToday],
  )
  const completedCount = visibleTasks.filter((task) =>
    isCompletedOn(task, viewDate),
  ).length
  const progress =
    visibleTasks.length === 0
      ? 0
      : Math.round((completedCount / visibleTasks.length) * 100)
  const todayCompleted = todayTasks.filter((task) =>
    isCompletedOn(task, realToday),
  ).length
  const allDone = todayTasks.length > 0 && todayCompleted === todayTasks.length
  const activeTask = tasks.find((task) => task.id === activeTaskId) ?? null
  const missed = useMemo(
    () => findMissedOccurrences(tasks, realToday),
    [tasks, realToday],
  )
  const autoRecovery =
    reviewing ??
    missed.find((item) => {
      const record = item.task.recoveries[item.date]
      return !record?.promptShown && !record?.handled
    }) ??
    null
  const editingTask = tasks.find((task) => task.id === editingId)

  useEffect(() => {
    localStorage.setItem(STREAK_KEY, JSON.stringify(streak))
  }, [streak])

  useEffect(() => {
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders))
  }, [reminders])

  useEffect(() => {
    if (!timerRunning) return
    const interval = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          setTimerRunning(false)
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [timerRunning])

  useEffect(() => {
    function deliver(reminder: Reminder) {
      setReminders((current) =>
        current.map((item) =>
          item.id === reminder.id ? { ...item, delivered: true } : item,
        ),
      )
      setReminderBanner(`Reminder: ${reminder.title}`)
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(`Habit Tracker: ${reminder.title}`)
      }
    }

    const timeouts = reminders
      .filter((reminder) => !reminder.delivered && reminder.at > Date.now())
      .map((reminder) =>
        window.setTimeout(
          () => deliver(reminder),
          Math.max(0, reminder.at - Date.now()),
        ),
      )

    reminders
      .filter((reminder) => !reminder.delivered && reminder.at <= Date.now())
      .forEach(deliver)

    return () => timeouts.forEach((timeout) => window.clearTimeout(timeout))
  }, [reminders])

  function updateStreakFrom(nextTasks: Task[]) {
    const scheduledToday = nextTasks.filter((task) => isScheduledOn(task, realToday))
    const done =
      scheduledToday.length > 0 &&
      scheduledToday.every((task) => isCompletedOn(task, realToday))
    if (!done) return
    setStreak((current) => {
      if (current.lastCompleteDate === realToday) return current
      const yesterday = addDays(realToday, -1)
      const nextCount = current.lastCompleteDate === yesterday ? current.count + 1 : 1
      return { count: nextCount, lastCompleteDate: realToday }
    })
  }

  async function toggleTask(id: string) {
    if (viewDate > realToday) return
    const currentTask = tasks.find((t) => t.id === id)
    if (!currentTask) return
    const isCompleted = isCompletedOn(currentTask, viewDate)

    try {
      let updatedTask: Task
      if (isCompleted) {
        updatedTask = await removeCompletion(id, viewDate)
      } else {
        updatedTask = await recordCompletion(id, viewDate, realToday)
      }
      const nextTasks = tasks.map((t) => (t.id === id ? updatedTask : t))
      setTasks(nextTasks)
      updateStreakFrom(nextTasks)
    } catch (err) {
      setErrorMessage((err as Error).message)
    }
  }

  async function removeTask(id: string) {
    try {
      await deleteHabit(id)
      const nextTasks = tasks.filter((task) => task.id !== id && task.parentId !== id)
      setTasks(nextTasks)
      updateStreakFrom(nextTasks)
      if (activeTaskId === id) {
        setActiveTaskId(null)
        setTimerRunning(false)
      }
    } catch (err) {
      setErrorMessage((err as Error).message)
    }
  }

  function validDuration(value: number) {
    return Number.isFinite(value) && value > 0
  }

  function startTimerFor(task: Task, minutesOverride?: number) {
    const seconds =
      minutesOverride !== undefined
        ? minutesOverride * 60
        : durationToSeconds(task.durationValue, task.durationUnit)
    setActiveTaskId(task.id)
    setTimerValue(minutesOverride ?? task.durationValue)
    setTimerUnit(minutesOverride !== undefined ? 'minutes' : task.durationUnit)
    setSecondsLeft(seconds)
    setTimerRunning(true)
    setTimerError('')
  }

  function startCustomTimer() {
    if (!validDuration(timerValue)) {
      setTimerError('Duration must be greater than zero.')
      return
    }
    setActiveTaskId(null)
    setSecondsLeft(durationToSeconds(timerValue, timerUnit))
    setTimerRunning(true)
    setTimerError('')
  }

  async function saveTask(draft: TaskDraft) {
    try {
      if (formMode === 'edit' && editingTask) {
        const payload = {
          title: draft.title,
          notes: draft.notes,
          durationValue: draft.durationValue,
          durationUnit: draft.durationUnit,
          frequency: draft.frequency,
          startDate: draft.frequency === 'one-time' ? draft.oneTimeDate : draft.startDate,
          endDate: draft.endDate || null,
          oneTimeDate: draft.frequency === 'one-time' ? draft.oneTimeDate : null,
          weekdays:
            draft.frequency === 'weekly' || draft.frequency === 'custom'
              ? draft.weekdays
              : [],
        }
        const updated = await updateHabit(editingTask.id, payload)
        const nextTasks = tasks.map((t) => (t.id === editingTask.id ? updated : t))
        setTasks(nextTasks)
        updateStreakFrom(nextTasks)
      } else {
        const payload = {
          title: draft.title,
          notes: draft.notes,
          durationValue: draft.durationValue,
          durationUnit: draft.durationUnit,
          frequency: draft.frequency,
          startDate: draft.frequency === 'one-time' ? draft.oneTimeDate : draft.startDate,
          endDate: draft.endDate || null,
          oneTimeDate: draft.frequency === 'one-time' ? draft.oneTimeDate : null,
          weekdays:
            draft.frequency === 'weekly' || draft.frequency === 'custom'
              ? draft.weekdays
              : [],
        }
        const created = await createHabit(payload)
        const nextTasks = [...tasks, created]
        setTasks(nextTasks)
        updateStreakFrom(nextTasks)
      }
      setFormMode('closed')
      setEditingId(null)
    } catch (err) {
      setErrorMessage((err as Error).message)
    }
  }

  async function saveRecovery(occurrence: MissedOccurrence, record: RecoveryRecord) {
    try {
      const updated = await recordRecovery(occurrence.task.id, {
        date: occurrence.date,
        reason: record.reason ?? 'something-else',
        explanation: record.explanation,
        adjustment: record.adjustment,
        actionTaken: record.actionTaken,
        promptShown: record.promptShown,
        handled: record.handled,
        referenceDate: realToday,
      })
      const nextTasks = tasks.map((t) => (t.id === occurrence.task.id ? updated : t))
      setTasks(nextTasks)
      setReviewing(null)
    } catch (err) {
      setErrorMessage((err as Error).message)
    }
  }

  async function reschedule(occurrence: MissedOccurrence, date: string) {
    try {
      const task = occurrence.task
      let payload
      if (task.frequency === 'one-time') {
        payload = { oneTimeDate: date, startDate: date }
      } else {
        const extraDates = task.extraDates.includes(date)
          ? task.extraDates
          : [...task.extraDates, date]
        payload = { extraDates }
      }
      const updated = await updateHabit(task.id, payload)
      const nextTasks = tasks.map((t) => (t.id === task.id ? updated : t))
      setTasks(nextTasks)
    } catch (err) {
      setErrorMessage((err as Error).message)
    }
  }

  async function shorterVersion(occurrence: MissedOccurrence, minutes: number) {
    try {
      const updated = await updateHabit(occurrence.task.id, {
        durationValue: minutes,
        durationUnit: 'minutes',
      })
      const nextTasks = tasks.map((t) => (t.id === occurrence.task.id ? updated : t))
      setTasks(nextTasks)
    } catch (err) {
      setErrorMessage((err as Error).message)
    }
  }

  async function breakIntoSteps(occurrence: MissedOccurrence, steps: string[]) {
    try {
      const createdSteps: Task[] = []
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]
        const stepTask = await createHabit({
          title: `${occurrence.task.title}: ${step}`,
          notes: `Smaller step ${i + 1} from a missed habit.`,
          durationValue: 5,
          durationUnit: 'minutes',
          frequency: 'one-time',
          startDate: realToday,
          endDate: null,
          oneTimeDate: realToday,
          weekdays: [],
        })
        createdSteps.push(stepTask)
      }
      const nextTasks = [...tasks, ...createdSteps]
      setTasks(nextTasks)
      updateStreakFrom(nextTasks)
    } catch (err) {
      setErrorMessage((err as Error).message)
    }
  }

  function setReminder(occurrence: MissedOccurrence, isoLocal: string) {
    if (!isoLocal) return 'Choose a date and time for the reminder.'
    const at = new Date(isoLocal).getTime()
    if (Number.isNaN(at) || at <= Date.now()) {
      return 'Choose a future date and time.'
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
    setReminders((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        taskId: occurrence.task.id,
        title: occurrence.task.title,
        at,
        delivered: false,
      },
    ])
    return null
  }

  const formInitial =
    formMode === 'edit' && editingTask
      ? taskToDraft(editingTask)
      : emptyDraft(realToday)

  // ── Auth gate ────────────────────────────────────────────────────────────
  if (authChecking) {
    return <div className="auth-loading">Loading…</div>
  }
  if (!currentUser) {
    return <AuthPage onAuthenticated={handleAuthenticated} />
  }

  return (
    <div className="app-shell">
      {errorMessage ? (
        <div className="empty-state" style={{ marginBottom: 20 }}>
          <p>{errorMessage}</p>
          <button
            type="button"
            className="ghost-btn"
            style={{ marginTop: 8 }}
            onClick={() => void fetchTasks()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {reminderBanner ? (
        <div className="empty-state" style={{ marginBottom: 20 }}>
          <span>{reminderBanner}</span>
          <button
            type="button"
            className="ghost-btn"
            style={{ marginLeft: 12 }}
            onClick={() => setReminderBanner('')}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <header className="app-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            HT
          </div>
          <div>
            <p className="eyebrow">Daily habits</p>
            <h1>Habit Tracker</h1>
          </div>
        </div>
        <div className="date-nav">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setViewDate(addDays(viewDate, -1))}
            aria-label="Previous day"
          >
            ‹
          </button>
          <p className="date-chip">
            {formatLongDate(parseDateKey(viewDate))}
            {viewDate === realToday ? ' · Today' : ''}
          </p>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setViewDate(addDays(viewDate, 1))}
            aria-label="Next day"
          >
            ›
          </button>
          {viewDate !== realToday ? (
            <button type="button" className="ghost-btn" onClick={() => setViewDate(realToday)}>
              Today
            </button>
          ) : null}
          <div className="header-user">
            <span className="header-user-name">{currentUser.name}</span>
            <button type="button" className="logout-btn" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="layout">
        <section>
          <article className="card hero-card">
            <p className="eyebrow">
              {viewDate === realToday ? "Today's Tasks" : 'Scheduled tasks'}
            </p>
            <h2 className="welcome">{greeting} — let's keep your streak glowing.</h2>
            <p className="welcome-copy">
              Check off what you finish, add anything that matters today, and use the timer
              when you want a focused block of time.
            </p>
            <div className="progress-wrap">
              <div className="progress-meta">
                <span>Daily progress</span>
                <span>
                  {completedCount}/{visibleTasks.length} tasks · {progress}%
                </span>
              </div>
              <div
                className="progress-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
              >
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </article>

          {autoRecovery ? (
            <div style={{ marginTop: 20 }}>
              <RecoveryPrompt
                key={`${autoRecovery.task.id}-${autoRecovery.date}-${reviewing ? 'review' : 'auto'}`}
                missed={autoRecovery}
                existing={autoRecovery.task.recoveries[autoRecovery.date]}
                onClose={() => setReviewing(null)}
                onSave={(record) => void saveRecovery(autoRecovery, record)}
                onReschedule={(date) => void reschedule(autoRecovery, date)}
                onShorterVersion={(minutes) => void shorterVersion(autoRecovery, minutes)}
                onBreakIntoSteps={(steps) => void breakIntoSteps(autoRecovery, steps)}
                onSetReminder={(value) => setReminder(autoRecovery, value)}
                onStartFocus={(minutes) => startTimerFor(autoRecovery.task, minutes)}
              />
            </div>
          ) : null}

          {missed.length > 0 ? (
            <article className="card tasks-card" style={{ marginTop: 20 }}>
              <h2>Missed tasks</h2>
              <p className="task-notes">
                These stayed incomplete after their scheduled day ended.
              </p>
              <div className="task-list" style={{ marginTop: 12 }}>
                {missed.map((item) => {
                  const record = item.task.recoveries[item.date]
                  return (
                    <div key={`${item.task.id}-${item.date}`} className="missed-row">
                      <div>
                        <p className="task-title">{item.task.title}</p>
                        <p className="task-notes">{formatShortDate(item.date)}</p>
                      </div>
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => setReviewing(item)}
                      >
                        {record?.handled ? 'Revisit suggestion' : 'Recover'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </article>
          ) : null}

          <article className="card tasks-card" style={{ marginTop: 20 }}>
            <div className="tasks-head">
              <h2>Your tasks</h2>
              <button
                type="button"
                className="add-btn"
                onClick={() => {
                  setEditingId(null)
                  setFormMode((mode) => (mode === 'add' ? 'closed' : 'add'))
                }}
              >
                {formMode === 'add' ? 'Close' : 'Add Task'}
              </button>
            </div>

            {formMode !== 'closed' ? (
              <TaskForm
                key={formMode === 'edit' ? editingId ?? 'edit' : 'add'}
                initial={formInitial}
                submitLabel={formMode === 'edit' ? 'Save changes' : 'Save task'}
                onSubmit={(draft) => void saveTask(draft)}
                onCancel={() => {
                  setFormMode('closed')
                  setEditingId(null)
                }}
              />
            ) : null}

            {isLoading ? (
              <p className="empty-state">Loading tasks...</p>
            ) : visibleTasks.length === 0 ? (
              <p className="empty-state">No tasks scheduled for this day.</p>
            ) : (
              <div className="task-list">
                {visibleTasks.map((task) => {
                  const done = isCompletedOn(task, viewDate)
                  const isMissed = viewDate < realToday && !done
                  const recovery = task.recoveries[viewDate]
                  return (
                    <article
                      key={task.id}
                      className={`task-card${done ? ' done' : ''}${isMissed ? ' missed' : ''}`}
                    >
                      <input
                        className="checkbox"
                        type="checkbox"
                        checked={done}
                        disabled={viewDate > realToday}
                        onChange={() => void toggleTask(task.id)}
                        aria-label={`Mark ${task.title} complete`}
                      />
                      <div>
                        <p className="task-title">{task.title}</p>
                        {task.notes ? <p className="task-notes">{task.notes}</p> : null}
                        <div className="task-meta">
                          <span className="pill">
                            {formatDuration(task.durationValue, task.durationUnit)}
                          </span>
                          <span className="pill">{formatFrequencyLabel(task)}</span>
                          {task.frequency !== 'one-time' ? (
                            <span className="pill">{formatScheduleDetail(task)}</span>
                          ) : null}
                          {done ? <span className="pill">Done</span> : null}
                          {isMissed ? <span className="pill missed">Missed</span> : null}
                        </div>
                        {expandedId === task.id ? (
                          <div className="task-details">
                            <p className="task-notes">{formatScheduleDetail(task)}</p>
                            {recovery?.handled ? (
                              <button
                                type="button"
                                className="ghost-btn"
                                onClick={() => setReviewing({ task, date: viewDate })}
                              >
                                Revisit recovery suggestion
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="task-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => startTimerFor(task)}
                          aria-label={`Start timer for ${task.title}`}
                        >
                          ▶
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => {
                            setEditingId(task.id)
                            setFormMode('edit')
                          }}
                          aria-label={`Edit ${task.title}`}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() =>
                            setExpandedId((current) => (current === task.id ? null : task.id))
                          }
                          aria-label={`Details for ${task.title}`}
                        >
                          i
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => void removeTask(task.id)}
                          aria-label={`Remove ${task.title}`}
                        >
                          ✕
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </article>
        </section>

        <aside className="side-stack">
          <article className="card side-card">
            <p className="eyebrow">Streak</p>
            <p className="stat-number">{streak.count}</p>
            <p className="streak-note">
              {allDone
                ? 'Beautiful work. Today is complete.'
                : 'Finish every task today to grow your streak.'}
            </p>
          </article>

          <article className="card side-card">
            <p className="eyebrow">Focus timer</p>
            <p className="timer-display">{formatTimer(secondsLeft)}</p>
            <div className="form-row" style={{ marginBottom: 12 }}>
              <input
                type="number"
                min={1}
                value={timerValue}
                onChange={(event) => setTimerValue(Number(event.target.value))}
                aria-label="Timer length"
              />
              <select
                value={timerUnit}
                onChange={(event) => setTimerUnit(event.target.value as DurationUnit)}
                aria-label="Timer unit"
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
              </select>
            </div>
            {timerError ? <p className="form-error">{timerError}</p> : null}
            <div className="timer-controls">
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  if (timerRunning) {
                    setTimerRunning(false)
                    return
                  }
                  if (activeTask) {
                    setTimerRunning(true)
                    return
                  }
                  startCustomTimer()
                }}
              >
                {timerRunning ? 'Pause' : 'Start'}
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setTimerRunning(false)
                  if (!validDuration(timerValue)) {
                    setTimerError('Duration must be greater than zero.')
                    return
                  }
                  setSecondsLeft(
                    activeTask
                      ? durationToSeconds(activeTask.durationValue, activeTask.durationUnit)
                      : durationToSeconds(timerValue, timerUnit),
                  )
                }}
              >
                Reset
              </button>
            </div>
            <p className="timer-task">
              {activeTask
                ? `Timing: ${activeTask.title} · ${formatDuration(activeTask.durationValue, activeTask.durationUnit)}`
                : `Custom focus · ${validDuration(timerValue) ? formatDuration(timerValue, timerUnit) : 'set a duration'}`}
            </p>
            <p className="timer-help">
              Use this when you want a quiet, timed session for one habit.
            </p>
          </article>
        </aside>
      </main>
    </div>
  )
}

export default App
