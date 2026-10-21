import { NextFunction, Request, Response } from 'express'
import { HabitService } from '../services/habitService.js'
import { listRecoverySuggestions, getRecoverySuggestion } from '../services/recoveryLogic.js'
import { BadRequestError } from '../utils/errors.js'
import { MissedReason } from '../types/habit.js'

export class HabitController {
  constructor(private habitService: HabitService) {}

  public listHabits = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.userId!
      const isActiveQuery = req.query.isActive
      let isActive: boolean | undefined = undefined
      if (isActiveQuery === 'true') isActive = true
      if (isActiveQuery === 'false') isActive = false

      const habits = await this.habitService.listHabits(userId, { isActive })
      res.json({
        success: true,
        data: habits,
      })
    } catch (err) {
      next(err)
    }
  }

  public getHabit = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.userId!
      const habit = await this.habitService.getHabit(userId, req.params.id)
      res.json({
        success: true,
        data: habit,
      })
    } catch (err) {
      next(err)
    }
  }

  public createHabit = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.userId!
      const habit = await this.habitService.createHabit(userId, req.body)
      res.status(201).json({
        success: true,
        data: habit,
      })
    } catch (err) {
      next(err)
    }
  }

  public updateHabit = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.userId!
      const habit = await this.habitService.updateHabit(
        userId,
        req.params.id,
        req.body,
      )
      res.json({
        success: true,
        data: habit,
      })
    } catch (err) {
      next(err)
    }
  }

  public deleteHabit = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.userId!
      await this.habitService.deleteHabit(userId, req.params.id)
      res.json({
        success: true,
        message: 'Habit deleted successfully.',
      })
    } catch (err) {
      next(err)
    }
  }

  public recordCompletion = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.userId!
      const { date, referenceDate } = req.body

      if (!date || typeof date !== 'string') {
        throw new BadRequestError(
          "Field 'date' is required in request body (YYYY-MM-DD format).",
        )
      }

      const result = await this.habitService.recordCompletion(
        userId,
        req.params.id,
        date,
        referenceDate,
      )

      res.status(201).json({
        success: true,
        data: result,
      })
    } catch (err) {
      next(err)
    }
  }

  public removeCompletion = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.userId!
      const date = (req.params.date || req.body?.date || req.query?.date) as string

      if (!date || typeof date !== 'string') {
        throw new BadRequestError(
          "Completion date is required as URL parameter, body field, or query string.",
        )
      }

      const referenceDate = req.body?.referenceDate || (req.query?.referenceDate as string)
      const result = await this.habitService.removeCompletion(
        userId,
        req.params.id,
        date,
        referenceDate,
      )

      res.json({
        success: true,
        message: `Completion for date ${date} removed successfully.`,
        data: result,
      })
    } catch (err) {
      next(err)
    }
  }

  public getCompletions = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.userId!
      const result = await this.habitService.getCompletions(
        userId,
        req.params.id,
      )
      res.json({
        success: true,
        data: result,
      })
    } catch (err) {
      next(err)
    }
  }

  public getStreak = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.userId!
      const referenceDate = req.query.referenceDate as string | undefined
      const streak = await this.habitService.getStreak(
        userId,
        req.params.id,
        referenceDate,
      )
      res.json({
        success: true,
        data: streak,
      })
    } catch (err) {
      next(err)
    }
  }

  public getMissedOccurrences = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.userId!
      const habitId = req.query.habitId as string | undefined
      const fromDate = req.query.fromDate as string | undefined
      const toDate = req.query.toDate as string | undefined
      const referenceDate = req.query.referenceDate as string | undefined

      const missed = await this.habitService.getMissedOccurrences(userId, {
        habitId,
        fromDate,
        toDate,
        referenceDate,
      })

      res.json({
        success: true,
        count: missed.length,
        data: missed,
      })
    } catch (err) {
      next(err)
    }
  }

  public recordRecovery = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.userId!
      const {
        date,
        reason,
        explanation,
        adjustment,
        actionTaken,
        promptShown,
        handled,
        referenceDate,
      } = req.body

      if (!date || typeof date !== 'string') {
        throw new BadRequestError("Field 'date' is required in request body.")
      }

      const result = await this.habitService.recordRecovery(
        userId,
        req.params.id,
        date,
        {
          reason,
          explanation,
          adjustment,
          actionTaken,
          promptShown,
          handled,
        },
        referenceDate,
      )

      res.status(201).json({
        success: true,
        data: result,
      })
    } catch (err) {
      next(err)
    }
  }

  public getRecoveries = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.userId!
      const recoveries = await this.habitService.getRecoveries(
        userId,
        req.params.id,
      )
      res.json({
        success: true,
        data: recoveries,
      })
    } catch (err) {
      next(err)
    }
  }

  public getRecoverySuggestions = (
    _req: Request,
    res: Response,
  ): void => {
    const suggestions = listRecoverySuggestions()
    res.json({
      success: true,
      data: suggestions,
    })
  }

  public getRecoverySuggestionForReason = (
    req: Request,
    res: Response,
  ): void => {
    const reason = req.params.reason as MissedReason
    const suggestion = getRecoverySuggestion(reason)
    res.json({
      success: true,
      data: suggestion,
    })
  }
}

