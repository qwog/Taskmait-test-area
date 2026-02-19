/**
 * GET /api/pdo/:id
 * Fetch a single PDO by ID with optional hash integrity verification.
 *
 * Query params:
 *   verify=true   — re-compute and compare content_hash before returning
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth, unauthorized } from '../lib/auth';
import { getSupabaseAdmin } from '../lib/supabase';
import { verifyPdoHash } from '../lib/hash';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = verifyAuth(req);
  if (!auth) return unauthorized(res);

  // In Vercel dynamic routes the segment is req.query.id
  const { id, verify } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing PDO id' });
  }

  const supabase = getSupabaseAdmin();

  const { data: pdo, error } = await supabase
    .from('pdos')
    .select('*')
    .eq('id', id)
    .eq('org_id', auth.org_id)
    .single();

  if (error || !pdo) {
    return res.status(404).json({ error: 'PDO not found' });
  }

  let hashValid: boolean | null = null;

  if (verify === 'true') {
    hashValid = verifyPdoHash(pdo.content_hash, {
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
  }

  return res.status(200).json({
    data: pdo,
    ...(hashValid !== null && { integrity: { valid: hashValid, algorithm: pdo.hash_algorithm } }),
  });
}
