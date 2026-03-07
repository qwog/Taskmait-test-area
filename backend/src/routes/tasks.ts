import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

function isMember(householdId: string, userId: string): boolean {
  return !!db.prepare('SELECT 1 FROM household_members WHERE household_id = ? AND user_id = ?').get(householdId, userId);
}

// List tasks for a household
router.get('/household/:householdId', (req: AuthRequest, res: Response) => {
  const { householdId } = req.params;
  if (!isMember(householdId, req.userId!)) return res.status(403).json({ error: 'Not a member' });

  const tasks = db.prepare(`
    SELECT t.*,
      u.username as created_by_username,
      a.username as assigned_to_username,
      a.avatar_color as assigned_to_color
    FROM tasks t
    LEFT JOIN users u ON t.created_by = u.id
    LEFT JOIN users a ON t.assigned_to = a.id
    WHERE t.household_id = ? AND t.is_active = 1
    ORDER BY t.created_at DESC
  `).all(householdId);
  return res.json(tasks);
});

// Create task
router.post('/household/:householdId', (req: AuthRequest, res: Response) => {
  const { householdId } = req.params;
  if (!isMember(householdId, req.userId!)) return res.status(403).json({ error: 'Not a member' });

  const { title, description, base_points, frequency, time_deadline, time_bonus_points, assigned_to } = req.body;

  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (!frequency || !['daily', 'weekly', 'monthly', 'yearly', 'once'].includes(frequency)) {
    return res.status(400).json({ error: 'Valid frequency is required (daily, weekly, monthly, yearly, once)' });
  }
  if (base_points !== undefined && (base_points < 1 || base_points > 10000)) {
    return res.status(400).json({ error: 'Points must be between 1 and 10000' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO tasks (id, household_id, created_by, title, description, base_points, frequency, time_deadline, time_bonus_points, assigned_to)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, householdId, req.userId, title,
    description || null,
    base_points || 10,
    frequency,
    time_deadline || null,
    time_bonus_points || 0,
    assigned_to || null
  );

  const task = db.prepare(`
    SELECT t.*, u.username as created_by_username, a.username as assigned_to_username
    FROM tasks t
    LEFT JOIN users u ON t.created_by = u.id
    LEFT JOIN users a ON t.assigned_to = a.id
    WHERE t.id = ?
  `).get(id);
  return res.status(201).json(task);
});

// Update task
router.put('/:taskId', (req: AuthRequest, res: Response) => {
  const { taskId } = req.params;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as any;
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!isMember(task.household_id, req.userId!)) return res.status(403).json({ error: 'Not a member' });

  const { title, description, base_points, frequency, time_deadline, time_bonus_points, assigned_to, is_active } = req.body;

  db.prepare(`
    UPDATE tasks SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      base_points = COALESCE(?, base_points),
      frequency = COALESCE(?, frequency),
      time_deadline = ?,
      time_bonus_points = COALESCE(?, time_bonus_points),
      assigned_to = ?,
      is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(
    title || null, description || null, base_points || null, frequency || null,
    time_deadline !== undefined ? time_deadline : task.time_deadline,
    time_bonus_points || null,
    assigned_to !== undefined ? assigned_to : task.assigned_to,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    taskId
  );

  const updated = db.prepare(`
    SELECT t.*, u.username as created_by_username, a.username as assigned_to_username
    FROM tasks t LEFT JOIN users u ON t.created_by = u.id LEFT JOIN users a ON t.assigned_to = a.id
    WHERE t.id = ?
  `).get(taskId);
  return res.json(updated);
});

// Delete task
router.delete('/:taskId', (req: AuthRequest, res: Response) => {
  const { taskId } = req.params;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as any;
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!isMember(task.household_id, req.userId!)) return res.status(403).json({ error: 'Not a member' });

  db.prepare('UPDATE tasks SET is_active = 0 WHERE id = ?').run(taskId);
  return res.json({ message: 'Task deleted' });
});

// Complete a task — core gamification logic
router.post('/:taskId/complete', (req: AuthRequest, res: Response) => {
  const { taskId } = req.params;
  const { notes } = req.body;
  const userId = req.userId!;

  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND is_active = 1').get(taskId) as any;
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!isMember(task.household_id, userId)) return res.status(403).json({ error: 'Not a member' });

  // Check if already completed in current period
  const now = new Date();
  const todayDate = now.toISOString().split('T')[0];

  let periodStart: string;
  switch (task.frequency) {
    case 'daily':
      periodStart = `${todayDate} 00:00:00`;
      break;
    case 'weekly': {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      periodStart = `${d.toISOString().split('T')[0]} 00:00:00`;
      break;
    }
    case 'monthly':
      periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01 00:00:00`;
      break;
    case 'yearly':
      periodStart = `${now.getFullYear()}-01-01 00:00:00`;
      break;
    default:
      periodStart = '2000-01-01 00:00:00';
  }

  if (task.frequency !== 'once') {
    const alreadyDone = db.prepare(`
      SELECT id FROM task_completions
      WHERE task_id = ? AND user_id = ? AND completed_at >= ?
    `).get(taskId, userId, periodStart);
    if (alreadyDone) return res.status(409).json({ error: 'Task already completed this period' });
  }

  // Calculate points
  let base_points = task.base_points;
  let bonus_points = 0;

  // Time deadline bonus
  if (task.time_deadline && task.time_bonus_points > 0) {
    const [hours, minutes] = task.time_deadline.split(':').map(Number);
    const deadline = new Date(now);
    deadline.setHours(hours, minutes, 0, 0);
    if (now <= deadline) {
      bonus_points += task.time_bonus_points;
    }
  }

  // Streak logic
  let streak_bonus = 0;
  let streak = db.prepare('SELECT * FROM streaks WHERE user_id = ? AND task_id = ?').get(userId, taskId) as any;

  let newStreak = 1;
  if (streak) {
    const lastDate = streak.last_completed_date;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastDate === yesterdayStr) {
      newStreak = streak.current_streak + 1;
    } else if (lastDate === todayDate) {
      newStreak = streak.current_streak; // same day, don't increment
    }
  }

  // Streak bonuses: +5 per day after 2, max +100
  if (newStreak >= 3) {
    streak_bonus = Math.min((newStreak - 2) * 5, 100);
  }

  const totalPoints = base_points + bonus_points + streak_bonus;

  // Save completion
  const completionId = uuidv4();
  db.prepare(`
    INSERT INTO task_completions (id, task_id, user_id, household_id, points_earned, base_points, bonus_points, streak_bonus, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(completionId, taskId, userId, task.household_id, totalPoints, base_points, bonus_points, streak_bonus, notes || null);

  // Update user total points
  db.prepare('UPDATE users SET total_points = total_points + ? WHERE id = ?').run(totalPoints, userId);

  // Update streak
  const longestStreak = streak ? Math.max(streak.longest_streak, newStreak) : newStreak;
  if (streak) {
    db.prepare('UPDATE streaks SET current_streak = ?, longest_streak = ?, last_completed_date = ? WHERE user_id = ? AND task_id = ?')
      .run(newStreak, longestStreak, todayDate, userId, taskId);
  } else {
    db.prepare('INSERT INTO streaks (user_id, task_id, current_streak, longest_streak, last_completed_date) VALUES (?, ?, ?, ?, ?)')
      .run(userId, taskId, newStreak, longestStreak, todayDate);
  }

  return res.json({
    message: 'Task completed!',
    points_earned: totalPoints,
    base_points,
    bonus_points,
    streak_bonus,
    new_streak: newStreak,
    completion_id: completionId
  });
});

// Get completions for a household (recent activity feed)
router.get('/household/:householdId/completions', (req: AuthRequest, res: Response) => {
  const { householdId } = req.params;
  if (!isMember(householdId, req.userId!)) return res.status(403).json({ error: 'Not a member' });

  const completions = db.prepare(`
    SELECT tc.*, t.title as task_title, t.frequency, u.username, u.avatar_color
    FROM task_completions tc
    INNER JOIN tasks t ON tc.task_id = t.id
    INNER JOIN users u ON tc.user_id = u.id
    WHERE tc.household_id = ?
    ORDER BY tc.completed_at DESC
    LIMIT 50
  `).all(householdId);
  return res.json(completions);
});

// Get streaks for a user in a household
router.get('/household/:householdId/streaks', (req: AuthRequest, res: Response) => {
  const { householdId } = req.params;
  if (!isMember(householdId, req.userId!)) return res.status(403).json({ error: 'Not a member' });

  const streaks = db.prepare(`
    SELECT s.*, t.title, t.frequency
    FROM streaks s
    INNER JOIN tasks t ON s.task_id = t.id
    WHERE t.household_id = ? AND s.user_id = ?
    ORDER BY s.current_streak DESC
  `).all(householdId, req.userId);
  return res.json(streaks);
});

export default router;
