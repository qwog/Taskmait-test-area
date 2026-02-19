/**
 * GET /api/pdo
 * List / search PDOs with pagination and filters.
 *
 * Query params:
 *   facility_id       UUID
 *   decision_result   pass | fail | quarantine | escalate
 *   pilot_id          magna | roush | l_and_l | adac | corridor
 *   date_from         ISO datetime string
 *   date_to           ISO datetime string
 *   page              integer (default 1)
 *   limit             integer (default 20, max 100)
 */
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth, unauthorized } from '../lib/auth';
import { getSupabaseAdmin } from '../lib/supabase';

const QuerySchema = z.object({
  facility_id: z.string().uuid().optional(),
  decision_result: z.enum(['pass', 'fail', 'quarantine', 'escalate']).optional(),
  pilot_id: z.enum(['magna', 'roush', 'l_and_l', 'adac', 'corridor']).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = verifyAuth(req);
  if (!auth) return unauthorized(res);

  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid query params', details: parsed.error.flatten() });
  }

  const { facility_id, decision_result, pilot_id, date_from, date_to, page, limit } = parsed.data;
  const offset = (page - 1) * limit;

  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('pdos')
    .select('*', { count: 'exact' })
    .eq('org_id', auth.org_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (facility_id) query = query.eq('facility_id', facility_id);
  if (decision_result) query = query.eq('decision_result', decision_result);
  if (pilot_id) query = query.eq('pilot_id', pilot_id);
  if (date_from) query = query.gte('created_at', date_from);
  if (date_to) query = query.lte('created_at', date_to);

  const { data, error, count } = await query;

  if (error) {
    console.error('[PDO list] error:', error);
    return res.status(500).json({ error: 'Failed to fetch PDOs', details: error.message });
  }

  return res.status(200).json({
    data,
    pagination: {
      total: count ?? 0,
      page,
      limit,
      pages: Math.ceil((count ?? 0) / limit),
    },
  });
}
