# Choretastic 🏆

A gamified household chore tracker. Earn points, build streaks, and compete with your housemates to see who keeps the place cleanest!

## Features

### 🎮 Gamification
- **Custom Points** — Set any point value (1–500) for each task
- **Speed Bonus** — Set a time deadline; completing before it earns extra bonus points
- **Daily Streaks** — Do a task daily to build a streak. After 2 days, earn +5 streak bonus per day (up to +100)
- **Leaderboard** — See how you rank against your household members

### 📅 Task Scheduling
- **Frequencies**: Daily, Weekly, Monthly, Yearly, or One-time
- **Assignments**: Assign tasks to specific household members or leave open for anyone
- **Activity Feed**: Full history of who completed what and when

### 👥 Households
- Create multiple households (home, office, etc.)
- Join via 6-character invite code
- Each household has its own task list, leaderboard, and activity feed

### 🔐 Auth
- Secure JWT authentication
- Customizable avatar color
- Personal stats dashboard

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Tailwind CSS + Vite |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite (via better-sqlite3) |
| Auth | JWT (30-day tokens) |
| Deployment | Docker + Docker Compose |

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### Development

**Backend:**
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:3001
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### Production (Docker)
```bash
cp .env.example .env
# Edit .env and set JWT_SECRET to a strong random value
docker compose up -d
# App available at http://localhost:5173
```

---

## Points System

| Event | Points |
|-------|--------|
| Complete a task | Base points (user-defined, 1–500) |
| Beat the time deadline | +bonus points (user-defined per task) |
| 3-day streak | +5 |
| 4-day streak | +10 |
| N-day streak | +(N-2)×5, max +100 |

---

## API Reference

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Sign in

### Households
- `GET /api/households` — List your households
- `POST /api/households` — Create household
- `POST /api/households/join` — Join with invite code
- `GET /api/households/:id` — Get household + members + leaderboard

### Tasks
- `GET /api/tasks/household/:id` — List tasks
- `POST /api/tasks/household/:id` — Create task
- `PUT /api/tasks/:id` — Update task
- `DELETE /api/tasks/:id` — Soft-delete task
- `POST /api/tasks/:id/complete` — Complete task (calculates all bonuses)
- `GET /api/tasks/household/:id/completions` — Activity feed
- `GET /api/tasks/household/:id/streaks` — Streak data

### Users
- `GET /api/users/me` — Get profile
- `PUT /api/users/me` — Update profile
- `GET /api/users/me/stats` — Get personal stats
