/**
 * GET /api/pdo/chain?root_id=<uuid>
 * Returns the full chain of custody for a PDO chain, ordered by chain_position.
 *
 * The endpoint walks the parent_pdo_id linkage from the given root PDO forward
 * and returns all nodes. Alternatively, if chain_position 0 is not provided,
 * it resolves the root by traversing upward first, then returns the full chain.
 */
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth, unauthorized } from '../lib/auth';
import { getSupabaseAdmin } from '../lib/supabase';
import { verifyPdoHash } from '../lib/hash';

const QuerySchema = z.object({
  root_id: z.string().uuid(),
  verify_hashes: z.enum(['true', 'false']).default('false'),
});

async function resolveRoot(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  orgId: string,
  pdoId: string
): Promise<string> {
  // Walk upward until we find a PDO with no parent
  let currentId = pdoId;
  const visited = new Set<string>();

  while (true) {
    if (visited.has(currentId)) break; // cycle guard
    visited.add(currentId);

    const { data } = await supabase
      .from('pdos')
      .select('id, parent_pdo_id')
      .eq('id', currentId)
      .eq('org_id', orgId)
      .single();

    if (!data || !data.parent_pdo_id) break;
    currentId = data.parent_pdo_id;
  }

  return currentId;
}

async function fetchChain(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  orgId: string,
  rootId: string
): Promise<any[]> {
  // BFS / iterative walk downward
  const chain: any[] = [];
  const queue: string[] = [rootId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const { data: pdo } = await supabase
      .from('pdos')
      .select('*')
      .eq('id', currentId)
      .eq('org_id', orgId)
      .single();

    if (!pdo) continue;
    chain.push(pdo);

    // Find children
    const { data: children } = await supabase
      .from('pdos')
      .select('id')
      .eq('parent_pdo_id', currentId)
      .eq('org_id', orgId);

    if (children) {
      for (const child of children) queue.push(child.id);
    }
  }

  return chain.sort((a, b) => a.chain_position - b.chain_position);
}

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

  const { root_id, verify_hashes } = parsed.data;
  const supabase = getSupabaseAdmin();

  // Resolve actual root (in case a mid-chain PDO was supplied)
  const rootId = await resolveRoot(supabase, auth.org_id, root_id);
  const chain = await fetchChain(supabase, auth.org_id, rootId);

  if (chain.length === 0) {
    return res.status(404).json({ error: 'Chain not found' });
  }

  let integrityResults: Record<string, boolean> | undefined;

  if (verify_hashes === 'true') {
    integrityResults = {};
    for (const pdo of chain) {
      integrityResults[pdo.id] = verifyPdoHash(pdo.content_hash, {
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
  }

  return res.status(200).json({
    data: chain,
    chain_length: chain.length,
    root_id: rootId,
    ...(integrityResults && { integrity: integrityResults }),
  });
}
