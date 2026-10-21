import { DemoUser, Habit } from '../types/habit.js'
import { IHabitRepository } from './habitRepository.interface.js'

export const SEED_USERS: DemoUser[] = [
  {
    id: 'user-001',
    name: 'Alex Johnson',
    email: 'alex.johnson@example.com',
    description: 'Demo User 1 - Daily habits and active streaks',
  },
  {
    id: 'user-002',
    name: 'Taylor Smith',
    email: 'taylor.smith@example.com',
    description: 'Demo User 2 - Custom workout and weekly routines',
  },
  {
    id: 'user-003',
    name: 'Jordan Lee',
    email: 'jordan.lee@example.com',
    description: 'Demo User 3 - New user with a clean slate',
  },
]

export const SEED_HABITS: Habit[] = [
  {
    id: 'habit-101',
    userId: 'user-001',
    title: 'Drink 8 glasses of water',
    notes: 'Stay hydrated throughout the day.',
    durationValue: 5,
    durationUnit: 'minutes',
    frequency: 'daily',
    startDate: '2026-10-01',
    endDate: null,
    oneTimeDate: null,
    weekdays: [],
    extraDates: [],
    completions: {
      '2026-10-18': true,
      '2026-10-19': true,
      '2026-10-20': true,
    },
    recoveries: {},
    isActive: true,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-20T20:00:00.000Z',
  },
  {
    id: 'habit-102',
    userId: 'user-001',
    title: 'Morning Yoga',
    notes: 'Stretch and breathe for 15 minutes.',
    durationValue: 15,
    durationUnit: 'minutes',
    frequency: 'daily',
    startDate: '2026-10-10',
    endDate: null,
    oneTimeDate: null,
    weekdays: [],
    extraDates: [],
    completions: {
      '2026-10-15': true,
      '2026-10-16': true,
      // Missed 10-17, 10-18
      '2026-10-19': true,
      '2026-10-20': true,
    },
    recoveries: {
      '2026-10-17': {
        promptShown: true,
        handled: true,
        reason: 'exhausted',
        explanation: 'Worked late on Friday evening.',
        adjustment: 'Took a short rest and drank water.',
        actionTaken: 'shorter',
        recordedAt: '2026-10-18T09:00:00.000Z',
      },
    },
    isActive: true,
    createdAt: '2026-10-10T07:30:00.000Z',
    updatedAt: '2026-10-20T21:00:00.000Z',
  },
  {
    id: 'habit-201',
    userId: 'user-002',
    title: 'Gym Strength Workout',
    notes: 'Focus on compound exercises (Mon, Wed, Fri).',
    durationValue: 45,
    durationUnit: 'minutes',
    frequency: 'custom',
    startDate: '2026-10-01',
    endDate: null,
    oneTimeDate: null,
    weekdays: [1, 3, 5], // Monday, Wednesday, Friday
    extraDates: [],
    completions: {
      '2026-10-12': true, // Mon
      '2026-10-14': true, // Wed
      '2026-10-16': true, // Fri
      '2026-10-19': true, // Mon
    },
    recoveries: {},
    isActive: true,
    createdAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-19T18:00:00.000Z',
  },
]

export class InMemoryHabitRepository implements IHabitRepository {
  private users: Map<string, DemoUser> = new Map()
  private habits: Map<string, Habit> = new Map()

  constructor() {
    this.initSeeds()
  }

  private initSeeds(): void {
    this.users.clear()
    this.habits.clear()

    for (const u of SEED_USERS) {
      this.users.set(u.id, { ...u })
    }

    for (const h of SEED_HABITS) {
      this.habits.set(h.id, JSON.parse(JSON.stringify(h)))
    }
  }

  public async listUsers(): Promise<DemoUser[]> {
    return Array.from(this.users.values()).map((u) => ({ ...u }))
  }

  public async findUserById(userId: string): Promise<DemoUser | null> {
    const user = this.users.get(userId)
    return user ? { ...user } : null
  }

  public async listHabits(
    userId: string,
    filter?: { isActive?: boolean },
  ): Promise<Habit[]> {
    const results: Habit[] = []
    for (const habit of this.habits.values()) {
      if (habit.userId !== userId) continue
      if (filter?.isActive !== undefined && habit.isActive !== filter.isActive) {
        continue
      }
      results.push(JSON.parse(JSON.stringify(habit)))
    }
    return results
  }

  public async findHabitById(
    userId: string,
    habitId: string,
  ): Promise<Habit | null> {
    const habit = this.habits.get(habitId)
    if (!habit || habit.userId !== userId) {
      return null
    }
    return JSON.parse(JSON.stringify(habit))
  }

  public async createHabit(habit: Habit): Promise<Habit> {
    const copy = JSON.parse(JSON.stringify(habit))
    this.habits.set(habit.id, copy)
    return JSON.parse(JSON.stringify(copy))
  }

  public async updateHabit(
    userId: string,
    habitId: string,
    updates: Partial<Habit>,
  ): Promise<Habit | null> {
    const existing = this.habits.get(habitId)
    if (!existing || existing.userId !== userId) {
      return null
    }

    const updated: Habit = {
      ...existing,
      ...updates,
      id: existing.id,
      userId: existing.userId,
      updatedAt: new Date().toISOString(),
    }

    this.habits.set(habitId, updated)
    return JSON.parse(JSON.stringify(updated))
  }

  public async deleteHabit(userId: string, habitId: string): Promise<boolean> {
    const existing = this.habits.get(habitId)
    if (!existing || existing.userId !== userId) {
      return false
    }
    return this.habits.delete(habitId)
  }

  public async reset(): Promise<void> {
    this.initSeeds()
  }
}

