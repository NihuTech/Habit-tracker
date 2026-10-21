import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { InMemoryHabitRepository } from '../src/repositories/inMemoryHabitRepository.js'

describe('Habit Logic Backend REST API', () => {
  let repo: InMemoryHabitRepository
  let app: ReturnType<typeof createApp>['app']

  beforeEach(async () => {
    repo = new InMemoryHabitRepository()
    await repo.reset()
    const ctx = createApp(repo)
    app = ctx.app
  })

  describe('System & Public Endpoints', () => {
    it('GET /api/health returns 200 with service info', async () => {
      const res = await request(app).get('/api/health')
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('ok')
      expect(res.body.service).toBe('habit-logic-backend')
    })

    it('GET /api/users returns list of seeded demo users', async () => {
      const res = await request(app).get('/api/users')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThanOrEqual(3)

      const ids = res.body.data.map((u: { id: string }) => u.id)
      expect(ids).toContain('user-001')
      expect(ids).toContain('user-002')
      expect(ids).toContain('user-003')
    })

    it('GET /api/recovery/suggestions returns deterministic options', async () => {
      const res = await request(app).get('/api/recovery/suggestions')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
      const reasons = res.body.data.map((s: { reason: string }) => s.reason)
      expect(reasons).toContain('exhausted')
      expect(reasons).toContain('procrastinating')
    })
  })

  describe('Demo Identity & Header Validation (Option C)', () => {
    it('rejects requests with missing X-User-Id header with 400 Bad Request', async () => {
      const res = await request(app).get('/api/tasks')
      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toContain("Missing required 'X-User-Id' header")
    })

    it('rejects requests with unknown user ID with 404 Not Found', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('X-User-Id', 'unknown-user-999')
      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toContain("Demo user 'unknown-user-999' not found")
    })
  })

  describe('User Data Isolation (Strict Multi-Tenant Separation)', () => {
    it('ensures user-001 and user-002 see only their own habits', async () => {
      const res1 = await request(app)
        .get('/api/tasks')
        .set('X-User-Id', 'user-001')
      expect(res1.status).toBe(200)
      const user1HabitIds = res1.body.data.map((h: { id: string }) => h.id)
      expect(user1HabitIds).toContain('habit-101')
      expect(user1HabitIds).not.toContain('habit-201') // Belongs to user-002

      const res2 = await request(app)
        .get('/api/tasks')
        .set('X-User-Id', 'user-002')
      expect(res2.status).toBe(200)
      const user2HabitIds = res2.body.data.map((h: { id: string }) => h.id)
      expect(user2HabitIds).toContain('habit-201')
      expect(user2HabitIds).not.toContain('habit-101') // Belongs to user-001
    })

    it('prevents user-002 from accessing or completing user-001 habit (404)', async () => {
      // user-002 tries to get user-001's habit-101
      const getRes = await request(app)
        .get('/api/tasks/habit-101')
        .set('X-User-Id', 'user-002')
      expect(getRes.status).toBe(404)

      // user-002 tries to record a completion for user-001's habit-101
      const postRes = await request(app)
        .post('/api/tasks/habit-101/complete')
        .set('X-User-Id', 'user-002')
        .send({ date: '2026-10-20' })
      expect(postRes.status).toBe(404)

      // user-002 tries to delete user-001's habit-101
      const deleteRes = await request(app)
        .delete('/api/tasks/habit-101')
        .set('X-User-Id', 'user-002')
      expect(deleteRes.status).toBe(404)
    })
  })

  describe('Route Conflict Avoidance', () => {
    it('GET /api/tasks/missed resolves to missed occurrences rather than :id parameter', async () => {
      const res = await request(app)
        .get('/api/tasks/missed?referenceDate=2026-10-21')
        .set('X-User-Id', 'user-001')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body).toHaveProperty('count')
      expect(Array.isArray(res.body.data)).toBe(true)
      // If it had conflicted with /api/tasks/:id, it would have returned 404 "Habit with ID 'missed' not found"
    })
  })

  describe('Habit Lifecycle & Operations', () => {
    it('creates, reads, updates, and deletes a habit via REST API', async () => {
      // 1. Create
      const createRes = await request(app)
        .post('/api/tasks')
        .set('X-User-Id', 'user-003')
        .send({
          title: 'Daily Meditation',
          notes: 'Mindful breathing',
          durationValue: 15,
          durationUnit: 'minutes',
          frequency: 'daily',
          startDate: '2026-10-01',
        })

      expect(createRes.status).toBe(201)
      expect(createRes.body.data.id).toBeDefined()
      const newId = createRes.body.data.id

      // 2. Read
      const getRes = await request(app)
        .get(`/api/tasks/${newId}`)
        .set('X-User-Id', 'user-003')
      expect(getRes.status).toBe(200)
      expect(getRes.body.data.title).toBe('Daily Meditation')

      // 3. Update
      const patchRes = await request(app)
        .patch(`/api/tasks/${newId}`)
        .set('X-User-Id', 'user-003')
        .send({ title: 'Morning Mindful Meditation', durationValue: 20 })
      expect(patchRes.status).toBe(200)
      expect(patchRes.body.data.title).toBe('Morning Mindful Meditation')
      expect(patchRes.body.data.durationValue).toBe(20)

      // 4. Record Completion
      const completeRes = await request(app)
        .post(`/api/tasks/${newId}/complete`)
        .set('X-User-Id', 'user-003')
        .send({ date: '2026-10-20', referenceDate: '2026-10-20' })
      expect(completeRes.status).toBe(201)
      expect(completeRes.body.data.streak.currentStreak).toBe(1)

      // 5. Query Streak
      const streakRes = await request(app)
        .get(`/api/tasks/${newId}/streak?referenceDate=2026-10-20`)
        .set('X-User-Id', 'user-003')
      expect(streakRes.status).toBe(200)
      expect(streakRes.body.data.currentStreak).toBe(1)
      expect(streakRes.body.data.longestStreak).toBe(1)

      // 6. Delete
      const delRes = await request(app)
        .delete(`/api/tasks/${newId}`)
        .set('X-User-Id', 'user-003')
      expect(delRes.status).toBe(200)

      // 7. Verify Gone
      const verifyRes = await request(app)
        .get(`/api/tasks/${newId}`)
        .set('X-User-Id', 'user-003')
      expect(verifyRes.status).toBe(404)
    })

    it('records recovery record linked to habit and returns suggestion', async () => {
      const res = await request(app)
        .post('/api/tasks/habit-101/recovery')
        .set('X-User-Id', 'user-001')
        .send({
          date: '2026-10-15', // Past date
          reason: 'procrastinating',
          explanation: 'Got stuck reading articles online',
          actionTaken: 'focus',
          referenceDate: '2026-10-21',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.recovery.reason).toBe('procrastinating')
      expect(res.body.data.suggestion.shorterMinutes).toBe(5)
    })
  })
})

