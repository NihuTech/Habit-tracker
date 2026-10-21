import cors from 'cors'
import express, { Express, Request, Response } from 'express'
import { HabitController } from './controllers/habitController.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { IHabitRepository } from './repositories/habitRepository.interface.js'
import { InMemoryHabitRepository } from './repositories/inMemoryHabitRepository.js'
import { createHabitRoutes } from './routes/habitRoutes.js'
import { createRecoveryRoutes } from './routes/recoveryRoutes.js'
import { createUserRoutes } from './routes/userRoutes.js'
import { HabitService } from './services/habitService.js'

export interface AppContext {
  app: Express
  habitRepo: IHabitRepository
  habitService: HabitService
}

export function createApp(customRepo?: IHabitRepository): AppContext {
  const app = express()

  // 1. Core Middleware
  app.use(
    cors({
      origin: '*', // Allows local frontend (Vite http://localhost:5173) to connect easily
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-User-Id', 'Authorization'],
    }),
  )
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // 2. Dependency Injection
  const habitRepo = customRepo ?? new InMemoryHabitRepository()
  const habitService = new HabitService(habitRepo)
  const habitController = new HabitController(habitService)

  // 3. Health check (public)
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'habit-logic-backend',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    })
  })

  // 4. API Routes
  app.use('/api/users', createUserRoutes(habitRepo))
  app.use('/api/recovery', createRecoveryRoutes(habitController))
  app.use('/api/tasks', createHabitRoutes(habitController, habitRepo))

  // 5. 404 & Centralized Error Handlers
  app.use(notFoundHandler)
  app.use(errorHandler)

  return { app, habitRepo, habitService }
}

