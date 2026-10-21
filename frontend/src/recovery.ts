import type { MissedReason } from './types'

export const RECOVERY_OPTIONS: {
  id: MissedReason
  label: string
  suggestion: string
  actions: Array<'reschedule' | 'shorter' | 'steps' | 'reminder' | 'focus'>
  shorterMinutes?: number
}[] = [
  {
    id: 'exhausted',
    label: 'I felt exhausted',
    suggestion:
      "Take a 10-minute rest and drink some water. If you're still tired, reschedule the habit. If you feel better, try a 2-minute version.",
    actions: ['reschedule', 'shorter'],
    shorterMinutes: 2,
  },
  {
    id: 'upset',
    label: 'I felt emotionally upset',
    suggestion:
      "Pause for 2 minutes and take five slow breaths. Write down what's bothering you, then choose one small task—or give yourself permission to rest.",
    actions: ['reschedule', 'shorter'],
    shorterMinutes: 2,
  },
  {
    id: 'procrastinating',
    label: 'I kept procrastinating or scrolling',
    suggestion:
      'Put your phone away or enable Focus mode for 10 minutes. Open the task you need to do and work on it for just 5 minutes.',
    actions: ['focus', 'shorter'],
    shorterMinutes: 5,
  },
  {
    id: 'overwhelming',
    label: 'The task felt too difficult or overwhelming',
    suggestion:
      'Break the task into three smaller steps. Pick the easiest one and work on it for 5 minutes. Save the remaining steps for later.',
    actions: ['steps'],
  },
  {
    id: 'no-time',
    label: "I didn't have enough time",
    suggestion:
      'Choose a 2-minute version of your habit if possible. Otherwise, schedule a specific time tomorrow and set a reminder.',
    actions: ['shorter', 'reschedule', 'reminder'],
    shorterMinutes: 2,
  },
  {
    id: 'something-else',
    label: 'Something else',
    suggestion:
      'Identify the main thing that stopped you. Select a new option, write a short explanation, or choose one adjustment to make your next attempt easier.',
    actions: ['reschedule', 'shorter', 'steps', 'reminder'],
    shorterMinutes: 2,
  },
]

export function recoveryOption(id: MissedReason) {
  return RECOVERY_OPTIONS.find((option) => option.id === id) ?? RECOVERY_OPTIONS[5]
}
