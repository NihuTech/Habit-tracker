import dotenv from 'dotenv'
import { createApp } from './app.js'

dotenv.config()

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000
const { app } = createApp()

const server = app.listen(PORT, () => {
  console.log(`====================================================`)
  console.log(` Habit Logic Backend Server Running`)
  console.log(` Port: http://localhost:${PORT}`)
  console.log(` Health: http://localhost:${PORT}/api/health`)
  console.log(` Users: http://localhost:${PORT}/api/users`)
  console.log(` Tasks: http://localhost:${PORT}/api/tasks (requires X-User-Id)`)
  console.log(` Demo Users: user-001, user-002, user-003`)
  console.log(`====================================================`)
})

// Graceful shutdown handling
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Process terminated gracefully.')
  })
})

process.on('SIGINT', () => {
  server.close(() => {
    console.log('Server stopped.')
  })
})

