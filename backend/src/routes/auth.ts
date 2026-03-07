import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { signToken } from '../middleware/auth';

const router = Router();

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6',
];

router.post('/register', (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
  if (existing) return res.status(409).json({ error: 'Email or username already in use' });

  const id = uuidv4();
  const password_hash = bcrypt.hashSync(password, 10);
  const avatar_color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  db.prepare(
    'INSERT INTO users (id, username, email, password_hash, avatar_color) VALUES (?, ?, ?, ?, ?)'
  ).run(id, username, email, password_hash, avatar_color);

  const token = signToken(id);
  const user = db.prepare('SELECT id, username, email, avatar_color, total_points, created_at FROM users WHERE id = ?').get(id);
  return res.status(201).json({ token, user });
});

router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken(user.id);
  const { password_hash: _, ...safeUser } = user;
  return res.json({ token, user: safeUser });
});

export default router;
