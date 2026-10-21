# Habit Logic Backend

A modular, production-ready backend service implementing core habit logic, recurring scheduling rules, streak calculations, missed habit detection, and deterministic recovery suggestions.

Built with **Node.js**, **Express**, **TypeScript**, and tested with **Vitest**.

> [!NOTE]
> **Demo Identity Notice (Option C)**:
> This backend uses a demo/testing identity model via the `X-User-Id` header to allow immediate testing without the complexity of JWTs, cookies, or OAuth. This is **for demo and testing purposes only** and is **NOT** secure production authentication.

---

## Architecture & Project Structure

All backend code is strictly isolated inside `backend/` to prevent collisions with the frontend (`origin/frontend-work`) and database teammate (`origin/manpra-database`).

```text
backend/
├── src/
│   ├── types/
│   │   └── habit.ts                   # Core domain types aligned with frontend
│   ├── utils/
│   │   ├── dateUtils.ts               # Pure UTC calendar & date math (no timezone bugs)
│   │   └── errors.ts                  # Standard AppError, NotFoundError, ConflictError
│   ├── repositories/
│   │   ├── habitRepository.interface.ts # Clean repository interface (for DB integration)
│   │   └── inMemoryHabitRepository.ts # In-memory store with seeded demo data
│   ├── services/
│   │   ├── scheduleLogic.ts           # Daily, weekly, custom, one-time schedule evaluation
│   │   ├── streakLogic.ts             # Current & longest streak calculation engine
│   │   ├── recoveryLogic.ts           # Deterministic recovery recommendations
│   │   └── habitService.ts            # Core Habit service orchestrator
│   ├── middleware/
│   │   ├── authMiddleware.ts          # X-User-Id validation & tenant isolation
│   │   └── errorHandler.ts            # Centralized JSON error response handler
│   ├── controllers/
│   │   └── habitController.ts         # HTTP request/response handlers
│   ├── routes/
│   │   ├── userRoutes.ts              # /api/users endpoints
│   │   ├── recoveryRoutes.ts          # /api/recovery endpoints
│   │   └── habitRoutes.ts             # /api/tasks endpoints (registered safely)
│   ├── app.ts                         # Express app builder with CORS & routing
│   └── server.ts                      # Server entry point on port 5000
├── tests/
│   ├── scheduleLogic.test.ts          # Schedule & calendar leap-year tests
│   ├── streakLogic.test.ts            # Comprehensive streak calculation tests
│   ├── habitService.test.ts           # Domain service tests (CRUD, completions, recoveries)
│   └── api.test.ts                    # End-to-end Supertest API integration tests
├── .env.example
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

## Seeded Demo Users (Option C)

To test the API, supply the `X-User-Id` HTTP header with one of the predefined IDs:

| User ID | Name | Role / Description |
| :--- | :--- | :--- |
| `user-001` | **Alex Johnson** | Seeded with active daily habits (`habit-101`, `habit-102`) and historical completions |
| `user-002` | **Taylor Smith** | Seeded with custom Mon/Wed/Fri strength workout (`habit-201`) |
| `user-003` | **Jordan Lee** | Clean slate user with 0 initial habits (ideal for testing creation) |

*If `X-User-Id` is missing, the API returns `400 Bad Request`.*
*If `X-User-Id` is unknown (e.g., `user-999`), the API returns `404 Not Found`.*

---

## Streak Calculation Rules

1. **Daily Habits**: Require completion on every calendar day.
2. **Weekly & Custom Habits**: Count **only their scheduled occurrences**. Unscheduled days (rest days) **do not break streaks**.
3. **One-Time Habits**: Non-repeating binary completion (streak is 1 when completed, 0 when not).
4. **Behavior for "Today"**:
   - If today is scheduled and **completed**: counts towards the current streak (+1).
   - If today is scheduled and **not yet completed**: today is still in progress. The current streak is **preserved from the previous scheduled day**. It resets to 0 only if a past scheduled occurrence was missed.
5. **Historical Longest Streak**: Tracks and permanently preserves the maximum consecutive streak achieved.
6. **Recovery Invariant**: Submitting a recovery for a missed habit **never inflates streaks** or marks the habit complete.

---

## Quickstart & Commands

### Prerequisites
- Node.js (v18+) & npm

### 1. Install Dependencies
```bash
cd backend
npm install
```
*(On Windows PowerShell, if script execution is restricted, run: `npm.cmd install` or `cmd /c npm install`)*

### 2. Run Automated Tests
```bash
npm test
```
Runs all 4 Vitest test suites (schedule logic, streak logic, domain service, and full REST API).

### 3. Build & Typecheck
```bash
npm run build
```
Compiles TypeScript into `dist/`.

### 4. Start the Server
* Development mode with hot-reloading:
  ```bash
  npm run dev
  ```
* Production mode:
  ```bash
  npm start
  ```
The server will run on `http://localhost:5000`.

---

## REST API Reference

All habit endpoints require the header `X-User-Id: <user-id>`.

### Public Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status |
| `GET` | `/api/users` | List available demo users |
| `GET` | `/api/users/:id` | Get details for a demo user |
| `GET` | `/api/recovery/suggestions` | Get deterministic recovery suggestions |
| `GET` | `/api/recovery/suggestions/:reason` | Get recovery suggestion for specific reason |

### Habit Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/tasks` | List all habits for current user (optional `?isActive=true`) |
| `GET` | `/api/tasks/missed` | Find missed occurrences in past dates (`?fromDate=&toDate=`) |
| `POST` | `/api/tasks` | Create a new habit |
| `GET` | `/api/tasks/:id` | Get habit by ID |
| `PATCH` | `/api/tasks/:id` | Update habit details or schedule |
| `DELETE` | `/api/tasks/:id` | Delete a habit |

### Completions & Streaks
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/tasks/:id/complete` | Record completion for a date (`{"date": "YYYY-MM-DD"}`) |
| `DELETE` | `/api/tasks/:id/complete/:date` | Remove/correct historical completion |
| `GET` | `/api/tasks/:id/completions` | Get list of all completion dates |
| `GET` | `/api/tasks/:id/streak` | Get `currentStreak`, `longestStreak`, and status |

### Recovery Tracking
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/tasks/:id/recovery` | Record reason and reflection for a missed occurrence |
| `GET` | `/api/tasks/:id/recoveries` | Get all recovery logs for a habit |

---

## Example API Requests

### 1. List Habits for Demo User
```bash
curl -X GET http://localhost:5000/api/tasks \
  -H "X-User-Id: user-001"
```

### 2. Create a Habit
```bash
curl -X POST http://localhost:5000/api/tasks \
  -H "X-User-Id: user-001" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Read 10 pages",
    "frequency": "daily",
    "startDate": "2026-10-01",
    "durationValue": 15,
    "durationUnit": "minutes"
  }'
```

### 3. Record a Completion
```bash
curl -X POST http://localhost:5000/api/tasks/habit-101/complete \
  -H "X-User-Id: user-001" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-10-21"
  }'
```

### 4. Record a Recovery for a Missed Date
```bash
curl -X POST http://localhost:5000/api/tasks/habit-101/recovery \
  -H "X-User-Id: user-001" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-10-14",
    "reason": "exhausted",
    "explanation": "Long work shift",
    "actionTaken": "shorter"
  }'
```

---

## Integration Guide

### How the Frontend Connects
The frontend (`src/storage.ts`) currently uses `localStorage`. Connecting to this backend is straightforward:
```typescript
const API_BASE = 'http://localhost:5000/api';
const CURRENT_USER = 'user-001';

export async function fetchHabits() {
  const res = await fetch(`${API_BASE}/tasks`, {
    headers: { 'X-User-Id': CURRENT_USER }
  });
  const json = await res.json();
  return json.data;
}
```

### How the Database Teammate Connects
All data storage is decoupled behind `IHabitRepository` in `src/repositories/habitRepository.interface.ts`.
When the database teammate (`origin/manpra-database`) implements their real database (e.g. PostgreSQL, Prisma, SQLite):
1. Implement `IHabitRepository` in a new class (e.g., `PostgresHabitRepository`).
2. Pass it to `createApp(new PostgresHabitRepository())` in `src/server.ts`.
3. **No changes are needed in `src/services/` or `src/controllers/`!**

