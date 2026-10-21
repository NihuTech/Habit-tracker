import { DemoUser, Habit } from '../types/habit.js'

export interface IHabitRepository {
  // Demo User Management
  listUsers(): Promise<DemoUser[]>
  findUserById(userId: string): Promise<DemoUser | null>

  // Habit CRUD (isolated by userId)
  listHabits(userId: string, filter?: { isActive?: boolean }): Promise<Habit[]>
  findHabitById(userId: string, habitId: string): Promise<Habit | null>
  createHabit(habit: Habit): Promise<Habit>
  updateHabit(userId: string, habitId: string, updates: Partial<Habit>): Promise<Habit | null>
  deleteHabit(userId: string, habitId: string): Promise<boolean>

  // Test helper: reset state to initial seeded data
  reset(): Promise<void>
}

