import { MissedReason, RecoveryRecord, RecoverySuggestion } from '../types/habit.js'

export const RECOVERY_SUGGESTIONS: Record<MissedReason, RecoverySuggestion> = {
  exhausted: {
    reason: 'exhausted',
    label: 'I felt exhausted',
    suggestion:
      "Take a 10-minute rest and drink some water. If you're still tired, reschedule the habit. If you feel better, try a 2-minute version.",
    recommendedActions: ['reschedule', 'shorter'],
    shorterMinutes: 2,
  },
  upset: {
    reason: 'upset',
    label: 'I felt emotionally upset',
    suggestion:
      "Pause for 2 minutes and take five slow breaths. Write down what's bothering you, then choose one small task—or give yourself permission to rest.",
    recommendedActions: ['reschedule', 'shorter'],
    shorterMinutes: 2,
  },
  procrastinating: {
    reason: 'procrastinating',
    label: 'I kept procrastinating or scrolling',
    suggestion:
      'Put your phone away or enable Focus mode for 10 minutes. Open the task you need to do and work on it for just 5 minutes.',
    recommendedActions: ['focus', 'shorter'],
    shorterMinutes: 5,
  },
  overwhelming: {
    reason: 'overwhelming',
    label: 'The task felt too difficult or overwhelming',
    suggestion:
      'Break the task into three smaller steps. Pick the easiest one and work on it for 5 minutes. Save the remaining steps for later.',
    recommendedActions: ['steps'],
  },
  'no-time': {
    reason: 'no-time',
    label: "I didn't have enough time",
    suggestion:
      'Choose a 2-minute version of your habit if possible. Otherwise, schedule a specific time tomorrow and set a reminder.',
    recommendedActions: ['shorter', 'reschedule', 'reminder'],
    shorterMinutes: 2,
  },
  'something-else': {
    reason: 'something-else',
    label: 'Something else',
    suggestion:
      'Identify the main thing that stopped you. Select a new option, write a short explanation, or choose one adjustment to make your next attempt easier.',
    recommendedActions: ['reschedule', 'shorter', 'steps', 'reminder'],
    shorterMinutes: 2,
  },
}

export function getRecoverySuggestion(reason: MissedReason): RecoverySuggestion {
  return (
    RECOVERY_SUGGESTIONS[reason] ?? RECOVERY_SUGGESTIONS['something-else']
  )
}

export function listRecoverySuggestions(): RecoverySuggestion[] {
  return Object.values(RECOVERY_SUGGESTIONS)
}

export function validateRecoveryInput(body: {
  reason: unknown
  explanation?: unknown
  adjustment?: unknown
  actionTaken?: unknown
  promptShown?: unknown
  handled?: unknown
}): { valid: boolean; error?: string; data?: Partial<RecoveryRecord> } {
  const validReasons: MissedReason[] = [
    'exhausted',
    'upset',
    'procrastinating',
    'overwhelming',
    'no-time',
    'something-else',
  ]

  if (!body.reason || typeof body.reason !== 'string' || !validReasons.includes(body.reason as MissedReason)) {
    return {
      valid: false,
      error: `Reason is required and must be one of: ${validReasons.join(', ')}.`,
    }
  }

  const record: Partial<RecoveryRecord> = {
    reason: body.reason as MissedReason,
    promptShown: typeof body.promptShown === 'boolean' ? body.promptShown : true,
    handled: typeof body.handled === 'boolean' ? body.handled : true,
    explanation: typeof body.explanation === 'string' ? body.explanation.trim() : undefined,
    adjustment: typeof body.adjustment === 'string' ? body.adjustment.trim() : undefined,
    actionTaken: typeof body.actionTaken === 'string' ? body.actionTaken.trim() : undefined,
    recordedAt: new Date().toISOString(),
  }

  return { valid: true, data: record }
}

