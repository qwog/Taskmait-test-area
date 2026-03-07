import { Router, Response } from 'express';
import db from '../db/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Get current user profile
router.get('/me', (req: AuthRequest, res: Response) => {
  const user = db.prepare('SELECT id, username, email, avatar_color, total_points, created_at FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(user);
});

// Update profile
router.put('/me', (req: AuthRequest, res: Response) => {
  const { username, avatar_color } = req.body;

  if (username) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.userId);
    if (existing) return res.status(409).json({ error: 'Username already taken' });
  }

  db.prepare(`
    UPDATE users SET
      username = COALESCE(?, username),
      avatar_color = COALESCE(?, avatar_color)
    WHERE id = ?
  `).run(username || null, avatar_color || null, req.userId);

  const user = db.prepare('SELECT id, username, email, avatar_color, total_points, created_at FROM users WHERE id = ?').get(req.userId);
  return res.json(user);
});

// Get user stats
router.get('/me/stats', (req: AuthRequest, res: Response) => {
  const totalCompletions = (db.prepare('SELECT COUNT(*) as count FROM task_completions WHERE user_id = ?').get(req.userId) as any).count;
  const totalPoints = (db.prepare('SELECT COALESCE(SUM(points_earned), 0) as pts FROM task_completions WHERE user_id = ?').get(req.userId) as any).pts;
  const longestStreak = (db.prepare('SELECT COALESCE(MAX(longest_streak), 0) as streak FROM streaks WHERE user_id = ?').get(req.userId) as any).streak;
  const todayCompletions = (db.prepare(`
    SELECT COUNT(*) as count FROM task_completions WHERE user_id = ? AND completed_at >= date('now')
  `).get(req.userId) as any).count;

  return res.json({ totalCompletions, totalPoints, longestStreak, todayCompletions });
});

export default router;
