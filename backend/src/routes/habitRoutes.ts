import { Router } from 'express'
import { HabitController } from '../controllers/habitController.js'
import { IHabitRepository } from '../repositories/habitRepository.interface.js'
import { createAuthMiddleware } from '../middleware/authMiddleware.js'

export function createHabitRoutes(
  habitController: HabitController,
  habitRepo: IHabitRepository,
): Router {
  const router = Router()

  // Protect all habit routes with Demo Identity verification
  const requireUser = createAuthMiddleware(habitRepo)
  router.use(requireUser)

  // 1. SPECIFIC / STATIC PATHS FIRST (preventing :id conflict)
  router.get('/missed', habitController.getMissedOccurrences)
  router.get('/', habitController.listHabits)
  router.post('/', habitController.createHabit)

  // 2. PARAMETERIZED HABIT PATHS
  router.get('/:id', habitController.getHabit)
  router.patch('/:id', habitController.updateHabit)
  router.delete('/:id', habitController.deleteHabit)

  // Completion routes
  router.post('/:id/complete', habitController.recordCompletion)
  router.delete('/:id/complete', habitController.removeCompletion)
  router.delete('/:id/complete/:date', habitController.removeCompletion)
  router.get('/:id/completions', habitController.getCompletions)

  // Streak routes
  router.get('/:id/streak', habitController.getStreak)

  // Recovery routes linked to a specific habit
  router.post('/:id/recovery', habitController.recordRecovery)
  router.get('/:id/recoveries', habitController.getRecoveries)

  return router
}

