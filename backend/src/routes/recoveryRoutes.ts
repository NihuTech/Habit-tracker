import { Router } from 'express'
import { HabitController } from '../controllers/habitController.js'

export function createRecoveryRoutes(habitController: HabitController): Router {
  const router = Router()

  // Suggestions are general deterministic resources and public
  router.get('/suggestions', habitController.getRecoverySuggestions)
  router.get('/suggestions/:reason', habitController.getRecoverySuggestionForReason)

  return router
}

