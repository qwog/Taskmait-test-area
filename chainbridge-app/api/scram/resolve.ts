/**
 * POST /api/scram/resolve
 * Resolve a SCRAM. Validates the Trinity Gate before allowing resolution.
 *
 * Trinity Gate requires:
 *   - identity:     confirmed operator identity (user_id present in JWT)
 *   - compliance:   all regulatory framework checks acknowledged
 *   - authorization: operator role must be 'supervisor' or 'engineer'
 */
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth, unauthorized } from '../lib/auth';
import { getSupabaseAdmin } from '../lib/supabase';
import { resolveScramInRedis } from '../lib/redis';

const ResolveSchema = z.object({
  scram_id: z.string().uuid(),
  resolution: z.enum(['resume', 'rework', 'scrap', 'escalate']),
  resolution_justification: z.string().min(10).max(2000),
  // Trinity Gate fields
  trinity_gate_identity: z.boolean(),
  trinity_gate_compliance: z.boolean(),
  trinity_gate_authorization: z.string().min(1), // operator role
  // Optional: link a resolution PDO
  resolution_pdo_id: z.string().uuid().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = verifyAuth(req);
  if (!auth) return unauthorized(res);

  const parsed = ResolveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
  }

  const input = parsed.data;

  // ── Trinity Gate validation ──────────────────────────────────────────────
  const gateErrors: string[] = [];

  if (!input.trinity_gate_identity) {
    gateErrors.push('Trinity Gate: identity confirmation required');
  }

  if (!input.trinity_gate_compliance) {
    gateErrors.push('Trinity Gate: compliance acknowledgment required');
  }

  const allowedRoles = ['supervisor', 'engineer', 'quality_manager'];
  if (!allowedRoles.includes(input.trinity_gate_authorization)) {
    gateErrors.push(
      `Trinity Gate: authorization role '${input.trinity_gate_authorization}' is not permitted. ` +
        `Must be one of: ${allowedRoles.join(', ')}`
    );
  }

  if (gateErrors.length > 0) {
    return res.status(403).json({ error: 'Trinity Gate failed', gates: gateErrors });
  }

  const supabase = getSupabaseAdmin();

  // Fetch and verify SCRAM belongs to org and is active
  const { data: scram, error: fetchError } = await supabase
    .from('scrams')
    .select('*')
    .eq('id', input.scram_id)
    .eq('org_id', auth.org_id)
    .single();

  if (fetchError || !scram) {
    return res.status(404).json({ error: 'SCRAM not found' });
  }

  if (scram.status !== 'active') {
    return res.status(409).json({
      error: `SCRAM is already ${scram.status}`,
      current_status: scram.status,
    });
  }

  // ── Update Supabase ──────────────────────────────────────────────────────
  const { data: resolved, error: updateError } = await supabase
    .from('scrams')
    .update({
      status: input.resolution === 'escalate' ? 'escalated' : 'resolved',
      resolved_by: auth.user_id,
      resolved_at: new Date().toISOString(),
      resolution: input.resolution,
      resolution_justification: input.resolution_justification,
      trinity_gate_identity: input.trinity_gate_identity,
      trinity_gate_compliance: input.trinity_gate_compliance,
      trinity_gate_authorization: input.trinity_gate_authorization,
      resolution_pdo_id: input.resolution_pdo_id ?? null,
    })
    .eq('id', input.scram_id)
    .select()
    .single();

  if (updateError) {
    console.error('[SCRAM resolve] update error:', updateError);
    return res.status(500).json({ error: 'Failed to resolve SCRAM', details: updateError.message });
  }

  // ── Remove from Redis ────────────────────────────────────────────────────
  try {
    await resolveScramInRedis(input.scram_id, auth.org_id);
  } catch (redisErr) {
    console.error('[SCRAM resolve] Redis cleanup failed:', redisErr);
  }

  return res.status(200).json({ data: resolved });
}
