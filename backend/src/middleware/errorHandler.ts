import { NextFunction, Request, Response } from 'express'
import { AppError } from '../utils/errors.js'

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Endpoint '${req.method} ${req.originalUrl}' not found.`,
  })
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Handle known operational application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    })
    return
  }

  // Handle express JSON body parsing errors
  if ('type' in err && (err as { type: string }).type === 'entity.parse.failed') {
    res.status(400).json({
      success: false,
      error: 'Malformed JSON payload in request body.',
    })
    return
  }

  // Handle unexpected internal server errors
  console.error('[Unhandled Server Error]', err)
  res.status(500).json({
    success: false,
    error: 'Internal server error occurred.',
  })
}

