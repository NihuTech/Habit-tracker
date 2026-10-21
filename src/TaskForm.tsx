import { useState } from 'react'
import type { FormEvent } from 'react'
import { defaultWeekdays, WEEKDAYS } from './schedule'
import type { DurationUnit, Frequency, Task } from './types'

export type TaskDraft = {
  title: string
  notes: string
  durationValue: number
  durationUnit: DurationUnit
  frequency: Frequency
  startDate: string
  endDate: string
  oneTimeDate: string
  weekdays: number[]
}

type TaskFormProps = {
  initial: TaskDraft
  submitLabel: string
  onSubmit: (draft: TaskDraft) => void
  onCancel: () => void
}

export function taskToDraft(task: Task): TaskDraft {
  return {
    title: task.title,
    notes: task.notes,
    durationValue: task.durationValue,
    durationUnit: task.durationUnit,
    frequency: task.frequency,
    startDate: task.startDate,
    endDate: task.endDate ?? '',
    oneTimeDate: task.oneTimeDate ?? task.startDate,
    weekdays: task.weekdays,
  }
}

export function TaskForm({ initial, submitLabel, onSubmit, onCancel }: TaskFormProps) {
  const [draft, setDraft] = useState<TaskDraft>(initial)
  const [error, setError] = useState('')

  function update<K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setError('')
  }

  function toggleDay(day: number) {
    setDraft((current) => {
      const exists = current.weekdays.includes(day)
      return {
        ...current,
        weekdays: exists
          ? current.weekdays.filter((value) => value !== day)
          : [...current.weekdays, day],
      }
    })
  }

  function handleFrequency(frequency: Frequency) {
    setDraft((current) => ({
      ...current,
      frequency,
      weekdays:
        frequency === 'weekly' || frequency === 'custom'
          ? current.weekdays.length > 0
            ? current.weekdays
            : defaultWeekdays(frequency)
          : [],
    }))
    setError('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = draft.title.trim()
    if (!title) {
      setError('Please enter a task name.')
      return
    }
    if (!Number.isFinite(draft.durationValue) || draft.durationValue <= 0) {
      setError('Duration must be greater than zero.')
      return
    }
    if (draft.frequency === 'one-time' && !draft.oneTimeDate) {
      setError('Choose a date for this one-time task.')
      return
    }
    if (draft.frequency !== 'one-time' && !draft.startDate) {
      setError('Choose a start date.')
      return
    }
    if (draft.endDate && draft.startDate && draft.endDate < draft.startDate) {
      setError('End date cannot be before the start date.')
      return
    }
    if (
      (draft.frequency === 'weekly' || draft.frequency === 'custom') &&
      draft.weekdays.length === 0
    ) {
      setError('Select at least one day for this task to repeat.')
      return
    }
    onSubmit({ ...draft, title, notes: draft.notes.trim() })
  }

  const showDays = draft.frequency === 'weekly' || draft.frequency === 'custom'

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Task name</span>
        <input
          value={draft.title}
          onChange={(event) => update('title', event.target.value)}
          placeholder="Task name"
          required
        />
      </label>
      <label className="field">
        <span>Notes (optional)</span>
        <textarea
          value={draft.notes}
          onChange={(event) => update('notes', event.target.value)}
          placeholder="A short note (optional)"
        />
      </label>

      <div className="form-row">
        <label className="field grow">
          <span>Duration</span>
          <input
            type="number"
            min={1}
            step={1}
            value={draft.durationValue}
            onChange={(event) => update('durationValue', Number(event.target.value))}
            aria-label="Duration amount"
          />
        </label>
        <label className="field">
          <span>Unit</span>
          <select
            value={draft.durationUnit}
            onChange={(event) =>
              update('durationUnit', event.target.value as DurationUnit)
            }
            aria-label="Duration unit"
          >
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
          </select>
        </label>
      </div>

      <label className="field">
        <span>Frequency</span>
        <select
          value={draft.frequency}
          onChange={(event) => handleFrequency(event.target.value as Frequency)}
        >
          <option value="one-time">One-time</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="custom">Custom days</option>
        </select>
      </label>

      {draft.frequency === 'one-time' ? (
        <label className="field">
          <span>Task date</span>
          <input
            type="date"
            value={draft.oneTimeDate}
            onChange={(event) => update('oneTimeDate', event.target.value)}
            required
          />
        </label>
      ) : (
        <div className="form-row">
          <label className="field grow">
            <span>Start date</span>
            <input
              type="date"
              value={draft.startDate}
              onChange={(event) => update('startDate', event.target.value)}
              required
            />
          </label>
          <label className="field grow">
            <span>End date (optional)</span>
            <input
              type="date"
              value={draft.endDate}
              onChange={(event) => update('endDate', event.target.value)}
            />
          </label>
        </div>
      )}

      {showDays ? (
        <div className="field">
          <span>
            {draft.frequency === 'weekly' ? 'Repeats every' : 'Repeats on'}
          </span>
          <div className="day-chips">
            {WEEKDAYS.map((day) => (
              <button
                key={day.value}
                type="button"
                className={`day-chip${draft.weekdays.includes(day.value) ? ' active' : ''}`}
                onClick={() => toggleDay(day.value)}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-row">
        <button type="submit" className="primary-btn">
          {submitLabel}
        </button>
        <button type="button" className="ghost-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
