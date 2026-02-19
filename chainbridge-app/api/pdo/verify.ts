/**
 * POST /api/pdo/verify
 * Verify the hash integrity of one or more PDOs.
 *
 * Body: { ids: string[] }   — up to 50 PDO UUIDs
 * Returns per-PDO integrity result.
 */
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth, unauthorized } from '../lib/auth';
import { getSupabaseAdmin } from '../lib/supabase';
import { verifyPdoHash, computePdoHash } from '../lib/hash';

const BodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = verifyAuth(req);
  if (!auth) return unauthorized(res);

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
  }

  const { ids } = parsed.data;
  const supabase = getSupabaseAdmin();

  const { data: pdos, error } = await supabase
    .from('pdos')
    .select('*')
    .in('id', ids)
    .eq('org_id', auth.org_id);

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch PDOs', details: error.message });
  }

  const results = (pdos ?? []).map((pdo) => {
    const recomputed = computePdoHash({
      org_id: pdo.org_id,
      facility_id: pdo.facility_id,
      proof_type: pdo.proof_type,
      proof_source_system: pdo.proof_source_system,
      proof_timestamp: pdo.proof_timestamp,
      proof_confidence_score: pdo.proof_confidence_score,
      decision_result: pdo.decision_result,
      decision_threshold_used: pdo.decision_threshold_used,
      outcome_action: pdo.outcome_action,
      jurisdiction: pdo.jurisdiction,
      regulatory_frameworks: pdo.regulatory_frameworks,
      parent_pdo_id: pdo.parent_pdo_id,
      chain_position: pdo.chain_position,
    });

    const valid = recomputed === pdo.content_hash;

    return {
      id: pdo.id,
      valid,
      stored_hash: pdo.content_hash,
      computed_hash: recomputed,
      algorithm: pdo.hash_algorithm,
      tampered: !valid,
    };
  });

  // Report any requested IDs that were not found (org_id mismatch or missing)
  const foundIds = new Set(results.map((r) => r.id));
  const missing = ids.filter((id) => !foundIds.has(id));

  const allValid = results.every((r) => r.valid);

  return res.status(200).json({
    summary: {
      total: ids.length,
      verified: results.length,
      valid: results.filter((r) => r.valid).length,
      tampered: results.filter((r) => r.tampered).length,
      missing: missing.length,
      all_valid: allValid,
    },
    results,
    ...(missing.length > 0 && { missing_ids: missing }),
  });
}
