import { NextFunction, Request, Response } from 'express'
import { IHabitRepository } from '../repositories/habitRepository.interface.js'
import { BadRequestError, NotFoundError } from '../utils/errors.js'

// Extend Express Request to carry the validated demo userId
declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

/**
 * Demo Identity Middleware (Option C)
 *
 * NOTE: This is a DEMO/TEST identity system intended for prototyping and evaluation.
 * It is NOT secure production authentication. Production systems should use JWT tokens,
 * session cookies, or OAuth providers.
 *
 * Requirements:
 * - Each request must send an `X-User-Id` header (e.g. 'user-001').
 * - Missing header results in a 400 Bad Request error.
 * - Unknown user ID results in a 404 Not Found error.
 */
export function createAuthMiddleware(habitRepo: IHabitRepository) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawHeader = req.headers['x-user-id']
      const userId = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader

      if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
        throw new BadRequestError(
          "Missing required 'X-User-Id' header. Please provide a valid demo user ID (e.g., 'user-001', 'user-002', 'user-003').",
        )
      }

      const cleanUserId = userId.trim()
      const user = await habitRepo.findUserById(cleanUserId)

      if (!user) {
        throw new NotFoundError(
          `Demo user '${cleanUserId}' not found. Please use one of the seeded users: user-001, user-002, or user-003.`,
        )
      }

      // Attach validated userId to request
      req.userId = cleanUserId
      next()
    } catch (err) {
      next(err)
    }
  }
}

