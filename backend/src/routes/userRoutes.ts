import { Router, Request, Response, NextFunction } from 'express'
import { IHabitRepository } from '../repositories/habitRepository.interface.js'

export function createUserRoutes(habitRepo: IHabitRepository): Router {
  const router = Router()

  /**
   * GET /api/users
   * Lists all available demo users.
   * Public endpoint (does not require X-User-Id).
   */
  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await habitRepo.listUsers()
      res.json({
        success: true,
        message: 'Demo users available for testing. Provide your chosen ID in the X-User-Id header.',
        data: users,
      })
    } catch (err) {
      next(err)
    }
  })

  /**
   * GET /api/users/:id
   * Get specific demo user profile info.
   */
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await habitRepo.findUserById(req.params.id)
      if (!user) {
        res.status(404).json({
          success: false,
          error: `Demo user '${req.params.id}' not found.`,
        })
        return
      }
      res.json({
        success: true,
        data: user,
      })
    } catch (err) {
      next(err)
    }
  })

  return router
}

