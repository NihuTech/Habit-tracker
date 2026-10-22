
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
import { CalendarHeatmapPopover } from './CalendarHeatmapPopover'
import { RecoveryPrompt } from './RecoveryPrompt'
import {
  computeStreak,
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
  REMINDERS_KEY,
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

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('habit-tracker-theme')
    return savedTheme === 'dark' ? 'dark' : 'light'
  })

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'insights' | 'statistics' | 'friends'
  >('dashboard')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('habit-tracker-theme', theme)
  }, [theme])

  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

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

  const sectionTitle =
    viewDate === realToday
      ? 'Today'
      : new Intl.DateTimeFormat('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }).format(parseDateKey(viewDate))

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

  const streakCount = useMemo(
    () => computeStreak(tasks, realToday),
    [tasks, realToday],
  )

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

      if (
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
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

  async function toggleTask(id: string) {
    if (viewDate > realToday) return

    const currentTask = tasks.find((task) => task.id === id)
    if (!currentTask) return

    const isCompleted = isCompletedOn(currentTask, viewDate)

    try {
      let updatedTask: Task

      if (isCompleted) {
        updatedTask = await removeCompletion(id, viewDate)
      } else {
        updatedTask = await recordCompletion(id, viewDate, realToday)
      }

      const nextTasks = tasks.map((task) =>
        task.id === id ? updatedTask : task,
      )

      setTasks(nextTasks)
    } catch (err) {
      setErrorMessage((err as Error).message)
    }
  }

  async function removeTask(id: string) {
    try {
      await deleteHabit(id)

      const nextTasks = tasks.filter(
        (task) => task.id !== id && task.parentId !== id,
      )

      setTasks(nextTasks)

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
          startDate:
            draft.frequency === 'one-time'
              ? draft.oneTimeDate
              : draft.startDate,
          endDate: draft.endDate || null,
          oneTimeDate:
            draft.frequency === 'one-time' ? draft.oneTimeDate : null,
          weekdays:
            draft.frequency === 'weekly' || draft.frequency === 'custom'
              ? draft.weekdays
              : [],
        }

        const updated = await updateHabit(editingTask.id, payload)

        const nextTasks = tasks.map((task) =>
          task.id === editingTask.id ? updated : task,
        )

        setTasks(nextTasks)
      } else {
        const payload = {
          title: draft.title,
          notes: draft.notes,
          durationValue: draft.durationValue,
          durationUnit: draft.durationUnit,
          frequency: draft.frequency,
          startDate:
            draft.frequency === 'one-time'
              ? draft.oneTimeDate
              : draft.startDate,
          endDate: draft.endDate || null,
          oneTimeDate:
            draft.frequency === 'one-time' ? draft.oneTimeDate : null,
          weekdays:
            draft.frequency === 'weekly' || draft.frequency === 'custom'
              ? draft.weekdays
              : [],
        }

        const created = await createHabit(payload)
        const nextTasks = [...tasks, created]
        setTasks(nextTasks)
      }

      setFormMode('closed')
      setEditingId(null)
    } catch (err) {
      setErrorMessage((err as Error).message)
    }
  }

  async function saveRecovery(
    occurrence: MissedOccurrence,
    record: RecoveryRecord,
  ) {
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

      const nextTasks = tasks.map((task) =>
        task.id === occurrence.task.id ? updated : task,
      )

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

      const nextTasks = tasks.map((item) =>
        item.id === task.id ? updated : item,
      )

      setTasks(nextTasks)
    } catch (err) {
      setErrorMessage((err as Error).message)
    }
  }

  async function shorterVersion(
    occurrence: MissedOccurrence,
    minutes: number,
  ) {
    try {
      const updated = await updateHabit(occurrence.task.id, {
        durationValue: minutes,
        durationUnit: 'minutes',
      })

      const nextTasks = tasks.map((task) =>
        task.id === occurrence.task.id ? updated : task,
      )

      setTasks(nextTasks)
    } catch (err) {
      setErrorMessage((err as Error).message)
    }
  }

  async function breakIntoSteps(
    occurrence: MissedOccurrence,
    steps: string[],
  ) {
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

    if (
      typeof Notification !== 'undefined' &&
      Notification.permission === 'default'
    ) {
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
            className="date-chip date-chip-btn"
            onClick={() => setIsCalendarOpen((prev) => !prev)}
            aria-label="Choose date"
            aria-haspopup="dialog"
            aria-expanded={isCalendarOpen}
          >
            <span>
              {formatLongDate(parseDateKey(viewDate))}
              {viewDate === realToday ? ' · Today' : ''}
            </span>

            <svg
              className="chevron-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {viewDate !== realToday ? (
            <button
              type="button"
              className="ghost-btn"
              onClick={() => setViewDate(realToday)}
            >
              Today
            </button>
          ) : null}

          <button
            type="button"
            className="theme-toggle"
            onClick={() =>
              setTheme((current) => (current === 'light' ? 'dark' : 'light'))
            }
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙 Dark mode' : '☀️ Light mode'}
          </button>

          <div className="header-user">
            <span className="header-user-name">{currentUser.name}</span>
            <button
              type="button"
              className="logout-btn"
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <nav className="dashboard-tabs" aria-label="Dashboard sections">
        <button
          type="button"
          className={
            activeTab === 'dashboard' ? 'tab-button active' : 'tab-button'
          }
          aria-pressed={activeTab === 'dashboard'}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>

        <button
          type="button"
          className={
            activeTab === 'insights' ? 'tab-button active' : 'tab-button'
          }
          aria-pressed={activeTab === 'insights'}
          onClick={() => setActiveTab('insights')}
        >
          User Insights
        </button>

        <button
          type="button"
          className={
            activeTab === 'statistics' ? 'tab-button active' : 'tab-button'
          }
          aria-pressed={activeTab === 'statistics'}
          onClick={() => setActiveTab('statistics')}
        >
          User Statistics
        </button>

        <button
          type="button"
          className={
            activeTab === 'friends' ? 'tab-button active' : 'tab-button'
          }
          aria-pressed={activeTab === 'friends'}
          onClick={() => setActiveTab('friends')}
        >
          Friends
        </button>
      </nav>

      {isCalendarOpen ? (
        <CalendarHeatmapPopover
          selectedDate={viewDate}
          today={realToday}
          tasks={tasks}
          onSelectDate={(date) => {
            setViewDate(date)
            setIsCalendarOpen(false)
          }}
          onClose={() => setIsCalendarOpen(false)}
        />
      ) : null}

      {activeTab === 'dashboard' && (
        <main className="layout">
          <section>
            <article className="card hero-card">
              <h2>{sectionTitle}</h2>

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
                  <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                  />
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
                  onSave={(record) =>
                    void saveRecovery(autoRecovery, record)
                  }
                  onReschedule={(date) =>
                    void reschedule(autoRecovery, date)
                  }
                  onShorterVersion={(minutes) =>
                    void shorterVersion(autoRecovery, minutes)
                  }
                  onBreakIntoSteps={(steps) =>
                    void breakIntoSteps(autoRecovery, steps)
                  }
                  onSetReminder={(value) =>
                    setReminder(autoRecovery, value)
                  }
                  onStartFocus={(minutes) =>
                    startTimerFor(autoRecovery.task, minutes)
                  }
                />
              </div>
            ) : null}

            {missed.length > 0 ? (
              <article
                className="card tasks-card"
                style={{ marginTop: 20 }}
              >
                <h2>Missed tasks</h2>
                <p className="task-notes">
                  These stayed incomplete after their scheduled day ended.
                </p>

                <div className="task-list" style={{ marginTop: 12 }}>
                  {missed.map((item) => {
                    const record = item.task.recoveries[item.date]

                    return (
                      <div
                        key={`${item.task.id}-${item.date}`}
                        className="missed-row"
                      >
                        <div>
                          <p className="task-title">{item.task.title}</p>
                          <p className="task-notes">
                            {formatShortDate(item.date)}
                          </p>
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

            <article
              className="card tasks-card"
              style={{ marginTop: 20 }}
            >
              <div className="tasks-head">
                <h2>Your tasks</h2>

                <button
                  type="button"
                  className="add-btn"
                  onClick={() => {
                    setEditingId(null)
                    setFormMode((mode) =>
                      mode === 'add' ? 'closed' : 'add',
                    )
                  }}
                >
                  {formMode === 'add' ? 'Close' : 'Add Task'}
                </button>
              </div>

              {formMode !== 'closed' ? (
                <TaskForm
                  key={formMode === 'edit' ? editingId ?? 'edit' : 'add'}
                  initial={formInitial}
                  submitLabel={
                    formMode === 'edit' ? 'Save changes' : 'Save task'
                  }
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
                <p className="empty-state">
                  No tasks scheduled for this day.
                </p>
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

                          {task.notes ? (
                            <p className="task-notes">{task.notes}</p>
                          ) : null}

                          <div className="task-meta">
                            <span className="pill">
                              {formatDuration(
                                task.durationValue,
                                task.durationUnit,
                              )}
                            </span>

                            <span className="pill">
                              {formatFrequencyLabel(task)}
                            </span>

                            {task.frequency !== 'one-time' ? (
                              <span className="pill">
                                {formatScheduleDetail(task)}
                              </span>
                            ) : null}

                            {done ? <span className="pill">Done</span> : null}

                            {isMissed ? (
                              <span className="pill missed">Missed</span>
                            ) : null}
                          </div>

                          {expandedId === task.id ? (
                            <div className="task-details">
                              <p className="task-notes">
                                {formatScheduleDetail(task)}
                              </p>

                              {recovery?.handled ? (
                                <button
                                  type="button"
                                  className="ghost-btn"
                                  onClick={() =>
                                    setReviewing({ task, date: viewDate })
                                  }
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
                              setExpandedId((current) =>
                                current === task.id ? null : task.id,
                              )
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

              <p className="stat-number">
                <svg
                  className="streak-flame"
                  width="1em"
                  height="1em"
                  viewBox="0 0 24 24"
                  fill={streakCount > 0 ? '#f97316' : '#9ca3af'}
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.177A7.547 7.547 0 0 1 6.648 6.61a.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248zM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.545 3.75 3.75 0 0 1 3.255 3.717z"
                  />
                </svg>

                <span>{streakCount}</span>
              </p>

              <p className="streak-note">
                {allDone
                  ? 'Beautiful work. Today is complete.'
                  : 'Finish every task today to grow your streak.'}
              </p>
            </article>

            <article className="card side-card">
              <p className="eyebrow">Focus timer</p>
              <p className="timer-display">{formatTimer(secondsLeft)}</p>

              <div
                className="form-grid-2"
                style={{ marginBottom: 12 }}
              >
                <label className="field">
                  <span>Duration</span>
                  <input
                    type="number"
                    min={1}
                    value={timerValue}
                    onChange={(event) =>
                      setTimerValue(Number(event.target.value))
                    }
                    aria-label="Timer length"
                  />
                </label>

                <label className="field">
                  <span>Unit</span>
                  <select
                    value={timerUnit}
                    onChange={(event) =>
                      setTimerUnit(event.target.value as DurationUnit)
                    }
                    aria-label="Timer unit"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                  </select>
                </label>
              </div>

              {timerError ? (
                <p className="form-error">{timerError}</p>
              ) : null}

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
                        ? durationToSeconds(
                            activeTask.durationValue,
                            activeTask.durationUnit,
                          )
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
      )}

      {activeTab === 'insights' && (
        <main className="tab-page">
          <section className="tab-placeholder">
            <p className="eyebrow">YOUR JOURNEY</p>
            <h2>User Insights</h2>
            <p>Your habit journey, all in one place.</p>
            <p>Keep showing up, one day at a time. 💗</p>
          </section>
        </main>
      )}

      {activeTab === 'statistics' && (
        <main className="tab-page">
          <section className="tab-placeholder">
            <p className="eyebrow">YOUR PROGRESS</p>
            <h2>User Statistics</h2>
            <p>Your progress matters, even when it's small.</p>
            <p>Keep building consistency with your daily habits.</p>
          </section>
        </main>
      )}

      {activeTab === 'friends' && (
        <main className="tab-page">
          <section className="tab-placeholder">
            <p className="eyebrow">COMING SOON</p>
            <h2>Friends 💗</h2>
            <p>Coming Soon</p>
          </section>
        </main>
      )}
    </div>
  )
}

export default App
