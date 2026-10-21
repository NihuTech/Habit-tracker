import { useState } from 'react'
import { recoveryOption, RECOVERY_OPTIONS } from './recovery'
import { formatShortDate } from './schedule'
import type { MissedOccurrence, MissedReason, RecoveryRecord } from './types'

type RecoveryPromptProps = {
  missed: MissedOccurrence
  existing?: RecoveryRecord
  onClose: () => void
  onSave: (record: RecoveryRecord) => void
  onReschedule: (date: string) => void
  onShorterVersion: (minutes: number) => void
  onBreakIntoSteps: (steps: string[]) => void
  onSetReminder: (isoLocal: string) => string | null
  onStartFocus: (minutes: number) => void
}

export function RecoveryPrompt({
  missed,
  existing,
  onClose,
  onSave,
  onReschedule,
  onShorterVersion,
  onBreakIntoSteps,
  onSetReminder,
  onStartFocus,
}: RecoveryPromptProps) {
  const [reason, setReason] = useState<MissedReason | undefined>(existing?.reason)
  const [explanation, setExplanation] = useState(existing?.explanation ?? '')
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [stepOne, setStepOne] = useState('')
  const [stepTwo, setStepTwo] = useState('')
  const [stepThree, setStepThree] = useState('')
  const [reminderAt, setReminderAt] = useState('')
  const [message, setMessage] = useState('')
  const [actionTaken, setActionTaken] = useState(existing?.actionTaken ?? '')

  const selected = reason ? recoveryOption(reason) : null

  function note(text: string) {
    setMessage(text)
    setActionTaken(text)
  }

  function handleOkay() {
    if (!reason) {
      setMessage('Please choose a reason first.')
      return
    }
    onSave({
      promptShown: true,
      handled: true,
      reason,
      explanation: explanation.trim() || undefined,
      actionTaken: actionTaken || undefined,
    })
  }

  return (
    <section className="recovery-card" aria-labelledby="recovery-title">
      <p className="eyebrow">Missed task recovery</p>
      <h3 id="recovery-title">Why couldn't you complete this task?</h3>
      <p className="task-notes">
        {missed.task.title} · {formatShortDate(missed.date)}
      </p>

      <div className="reason-list">
        {RECOVERY_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`reason-btn${reason === option.id ? ' active' : ''}`}
            onClick={() => {
              setReason(option.id)
              setMessage('')
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {selected ? (
        <div className="suggestion-box">
          <p className="suggestion-text">{selected.suggestion}</p>

          {reason === 'something-else' ? (
            <label className="field">
              <span>Short explanation (optional)</span>
              <textarea
                value={explanation}
                onChange={(event) => setExplanation(event.target.value)}
                placeholder="What got in the way?"
              />
            </label>
          ) : null}

          <div className="recovery-actions">
            {selected.actions.includes('shorter') ? (
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  const minutes = selected.shorterMinutes ?? 2
                  onShorterVersion(minutes)
                  note(`Saved a ${minutes}-minute version of this habit.`)
                }}
              >
                Use a {selected.shorterMinutes ?? 2}-minute version
              </button>
            ) : null}

            {selected.actions.includes('focus') ? (
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  onStartFocus(5)
                  note('Started a 5-minute focus timer for this task.')
                }}
              >
                Start a 5-minute focus block
              </button>
            ) : null}

            {selected.actions.includes('reschedule') ? (
              <div className="action-row">
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(event) => setRescheduleDate(event.target.value)}
                  aria-label="Reschedule date"
                />
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    if (!rescheduleDate) {
                      setMessage('Choose a date to reschedule.')
                      return
                    }
                    onReschedule(rescheduleDate)
                    note(`Rescheduled to ${rescheduleDate}.`)
                  }}
                >
                  Reschedule
                </button>
              </div>
            ) : null}

            {selected.actions.includes('reminder') ? (
              <div className="action-row">
                <input
                  type="datetime-local"
                  value={reminderAt}
                  onChange={(event) => setReminderAt(event.target.value)}
                  aria-label="Reminder time"
                />
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    const result = onSetReminder(reminderAt)
                    if (result) {
                      setMessage(result)
                      return
                    }
                    note('Reminder saved.')
                  }}
                >
                  Set reminder
                </button>
              </div>
            ) : null}

            {selected.actions.includes('steps') ? (
              <div className="steps-box">
                <input
                  value={stepOne}
                  onChange={(event) => setStepOne(event.target.value)}
                  placeholder="Step 1"
                  aria-label="Step 1"
                />
                <input
                  value={stepTwo}
                  onChange={(event) => setStepTwo(event.target.value)}
                  placeholder="Step 2"
                  aria-label="Step 2"
                />
                <input
                  value={stepThree}
                  onChange={(event) => setStepThree(event.target.value)}
                  placeholder="Step 3"
                  aria-label="Step 3"
                />
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    const steps = [stepOne, stepTwo, stepThree]
                      .map((step) => step.trim())
                      .filter(Boolean)
                    if (steps.length === 0) {
                      setMessage('Add at least one smaller step.')
                      return
                    }
                    onBreakIntoSteps(steps)
                    note('Created smaller steps as new tasks.')
                  }}
                >
                  Break into steps
                </button>
              </div>
            ) : null}
          </div>

          {message ? <p className="recovery-message">{message}</p> : null}

          <button type="button" className="primary-btn" onClick={handleOkay}>
            Okay
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className="text-btn"
        onClick={() => {
          onSave({
            promptShown: true,
            handled: existing?.handled ?? false,
            reason: existing?.reason,
            explanation: existing?.explanation,
            actionTaken: existing?.actionTaken,
          })
          onClose()
        }}
      >
        Not now
      </button>
    </section>
  )
}
