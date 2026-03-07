import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(path.join(DB_DIR, 'choretastic.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_color TEXT NOT NULL DEFAULT '#6366f1',
      total_points INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS households (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      invite_code TEXT UNIQUE NOT NULL,
      owner_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS household_members (
      household_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (household_id, user_id),
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL,
      created_by TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      base_points INTEGER NOT NULL DEFAULT 10,
      frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly', 'once')),
      time_deadline TEXT,
      time_bonus_points INTEGER NOT NULL DEFAULT 0,
      assigned_to TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS task_completions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      household_id TEXT NOT NULL,
      points_earned INTEGER NOT NULL,
      base_points INTEGER NOT NULL,
      bonus_points INTEGER NOT NULL DEFAULT 0,
      streak_bonus INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT NOT NULL DEFAULT (datetime('now')),
      notes TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS streaks (
      user_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      last_completed_date TEXT,
      PRIMARY KEY (user_id, task_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
  `);

  console.log('Database initialized');
}

export default db;
