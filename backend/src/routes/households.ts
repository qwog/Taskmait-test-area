import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Create household
router.post('/', (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Household name is required' });

  const id = uuidv4();
  let invite_code = generateInviteCode();
  // Ensure unique
  while (db.prepare('SELECT id FROM households WHERE invite_code = ?').get(invite_code)) {
    invite_code = generateInviteCode();
  }

  db.prepare('INSERT INTO households (id, name, invite_code, owner_id) VALUES (?, ?, ?, ?)').run(id, name, invite_code, req.userId);
  db.prepare('INSERT INTO household_members (household_id, user_id) VALUES (?, ?)').run(id, req.userId);

  const household = db.prepare('SELECT * FROM households WHERE id = ?').get(id);
  return res.status(201).json(household);
});

// Join household by invite code
router.post('/join', (req: AuthRequest, res: Response) => {
  const { invite_code } = req.body;
  if (!invite_code) return res.status(400).json({ error: 'Invite code is required' });

  const household = db.prepare('SELECT * FROM households WHERE invite_code = ?').get(invite_code.toUpperCase()) as any;
  if (!household) return res.status(404).json({ error: 'Household not found' });

  const member = db.prepare('SELECT * FROM household_members WHERE household_id = ? AND user_id = ?').get(household.id, req.userId);
  if (member) return res.status(409).json({ error: 'Already a member' });

  db.prepare('INSERT INTO household_members (household_id, user_id) VALUES (?, ?)').run(household.id, req.userId);
  return res.json(household);
});

// Get all households for current user
router.get('/', (req: AuthRequest, res: Response) => {
  const households = db.prepare(`
    SELECT h.*,
      (SELECT COUNT(*) FROM household_members hm2 WHERE hm2.household_id = h.id) as member_count
    FROM households h
    INNER JOIN household_members hm ON h.id = hm.household_id
    WHERE hm.user_id = ?
    ORDER BY h.created_at DESC
  `).all(req.userId);
  return res.json(households);
});

// Get household details with members
router.get('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const member = db.prepare('SELECT * FROM household_members WHERE household_id = ? AND user_id = ?').get(id, req.userId);
  if (!member) return res.status(403).json({ error: 'Not a member of this household' });

  const household = db.prepare('SELECT * FROM households WHERE id = ?').get(id) as any;
  if (!household) return res.status(404).json({ error: 'Household not found' });

  const members = db.prepare(`
    SELECT u.id, u.username, u.avatar_color, u.total_points,
      (SELECT COALESCE(SUM(tc.points_earned), 0) FROM task_completions tc WHERE tc.user_id = u.id AND tc.household_id = ?) as household_points
    FROM users u
    INNER JOIN household_members hm ON u.id = hm.user_id
    WHERE hm.household_id = ?
    ORDER BY household_points DESC
  `).all(id, id);

  return res.json({ ...household, members });
});

// Leave household
router.delete('/:id/leave', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const household = db.prepare('SELECT * FROM households WHERE id = ?').get(id) as any;
  if (!household) return res.status(404).json({ error: 'Household not found' });
  if (household.owner_id === req.userId) return res.status(400).json({ error: 'Owner cannot leave — transfer ownership or delete the household' });

  db.prepare('DELETE FROM household_members WHERE household_id = ? AND user_id = ?').run(id, req.userId);
  return res.json({ message: 'Left household' });
});

export default router;
