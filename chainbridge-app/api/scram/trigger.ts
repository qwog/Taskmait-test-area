/**
 * POST /api/scram/trigger
 * Manually trigger a SCRAM event. Writes to Redis for real-time state
 * and inserts a durable record in Supabase.
 */
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth, unauthorized } from '../lib/auth';
import { getSupabaseAdmin } from '../lib/supabase';
import { setScramActive } from '../lib/redis';

const TriggerSchema = z.object({
  facility_id: z.string().uuid(),
  line_id: z.string().uuid().optional(),
  station_id: z.string().uuid().optional(),
  trigger_pdo_id: z.string().uuid().optional(),
  severity: z.enum(['critical', 'high', 'medium']),
  reason: z.string().min(1).max(1000),
  affected_systems: z.array(z.string()).optional(),
  cascade: z.boolean().default(false),
  cascade_targets: z.array(z.string().uuid()).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = verifyAuth(req);
  if (!auth) return unauthorized(res);

  const parsed = TriggerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
  }

  const input = parsed.data;
  const supabase = getSupabaseAdmin();

  // Insert into Supabase first (source of truth)
  const { data: scram, error } = await supabase
    .from('scrams')
    .insert({
      org_id: auth.org_id,
      facility_id: input.facility_id,
      line_id: input.line_id ?? null,
      station_id: input.station_id ?? null,
      trigger_pdo_id: input.trigger_pdo_id ?? null,
      severity: input.severity,
      reason: input.reason,
      affected_systems: input.affected_systems ?? [],
      cascade: input.cascade,
      cascade_targets: input.cascade_targets ?? [],
      status: 'active',
    })
    .select()
    .single();

  if (error || !scram) {
    console.error('[SCRAM trigger] insert error:', error);
    return res.status(500).json({ error: 'Failed to trigger SCRAM', details: error?.message });
  }

  // Mirror to Redis for real-time access
  try {
    await setScramActive({
      id: scram.id,
      org_id: auth.org_id,
      facility_id: input.facility_id,
      severity: input.severity,
      reason: input.reason,
      triggered_at: scram.triggered_at,
      status: 'active',
    });
  } catch (redisErr) {
    // Redis failure is non-fatal — Supabase is source of truth
    console.error('[SCRAM trigger] Redis write failed:', redisErr);
  }

  // If cascade, notify downstream facilities (stub — integrate with EDI/webhook in prod)
  if (input.cascade && input.cascade_targets?.length) {
    console.info(
      `[SCRAM cascade] SCRAM ${scram.id} cascading to ${input.cascade_targets.length} targets`
    );
    // TODO: publish cascade events to message queue / webhook
  }

  return res.status(201).json({ data: scram });
}
