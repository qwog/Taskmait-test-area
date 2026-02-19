import { supabase } from './supabase.js';
import type { PDOChainEntry } from '../types/pdo.js';

/**
 * Recursively follow parent_pdo_id links to reconstruct the full chain.
 * Returns entries ordered from root to leaf.
 */
export async function resolveChain(pdoId: string): Promise<PDOChainEntry[]> {
  const chain: PDOChainEntry[] = [];
  const visited = new Set<string>();

  // First get the PDO itself and walk backwards to root
  let currentId: string | null = pdoId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);

    const { data, error } = await supabase
      .from('pdos')
      .select(
        'id, hash, chain_position, decision_result, outcome_action, created_at, proof_type, confidence_score, parent_pdo_id, chain_root_id'
      )
      .eq('id', currentId)
      .single();

    if (error || !data) break;

    const row = data as {
      id: string;
      hash: string;
      chain_position: number | null;
      decision_result: string;
      outcome_action: string;
      created_at: string;
      proof_type: string;
      confidence_score: number | null;
      parent_pdo_id: string | null;
      chain_root_id: string | null;
    };

    chain.unshift({
      pdo_id: row.id,
      hash: row.hash,
      chain_position: row.chain_position ?? 0,
      decision_result: row.decision_result as PDOChainEntry['decision_result'],
      outcome_action: row.outcome_action as PDOChainEntry['outcome_action'],
      created_at: row.created_at,
      proof_type: row.proof_type as PDOChainEntry['proof_type'],
      confidence_score: row.confidence_score ?? 0,
    });

    currentId = row.parent_pdo_id;
  }

  // If chain_root_id is set, also get all forward children
  if (chain.length > 0) {
    const rootEntry = chain[0];
    const rootId = rootEntry.pdo_id;

    const { data: forwardData } = await supabase
      .from('pdos')
      .select(
        'id, hash, chain_position, decision_result, outcome_action, created_at, proof_type, confidence_score'
      )
      .eq('chain_root_id', rootId)
      .neq('id', pdoId)
      .order('chain_position', { ascending: true });

    if (forwardData && forwardData.length > 0) {
      const forwardEntries = (
        forwardData as Array<{
          id: string;
          hash: string;
          chain_position: number;
          decision_result: string;
          outcome_action: string;
          created_at: string;
          proof_type: string;
          confidence_score: number;
        }>
      ).map((row) => ({
        pdo_id: row.id,
        hash: row.hash,
        chain_position: row.chain_position ?? 0,
        decision_result: row.decision_result as PDOChainEntry['decision_result'],
        outcome_action: row.outcome_action as PDOChainEntry['outcome_action'],
        created_at: row.created_at,
        proof_type: row.proof_type as PDOChainEntry['proof_type'],
        confidence_score: row.confidence_score ?? 0,
      }));

      // Merge forward chain (avoid duplicates)
      const existingIds = new Set(chain.map((e) => e.pdo_id));
      for (const entry of forwardEntries) {
        if (!existingIds.has(entry.pdo_id)) {
          chain.push(entry);
        }
      }

      // Sort by chain_position
      chain.sort((a, b) => a.chain_position - b.chain_position);
    }
  }

  return chain;
}

/**
 * Find the root PDO of a chain by walking parent links.
 */
export async function getChainRoot(pdoId: string): Promise<string> {
  // First check if chain_root_id is already set
  const { data } = await supabase
    .from('pdos')
    .select('chain_root_id, parent_pdo_id')
    .eq('id', pdoId)
    .single();

  if (data) {
    const row = data as { chain_root_id: string | null; parent_pdo_id: string | null };
    if (row.chain_root_id) return row.chain_root_id;
    if (!row.parent_pdo_id) return pdoId; // This IS the root
  }

  // Walk backwards
  let currentId = pdoId;
  const visited = new Set<string>();

  while (true) {
    if (visited.has(currentId)) break;
    visited.add(currentId);

    const { data: parentData } = await supabase
      .from('pdos')
      .select('parent_pdo_id')
      .eq('id', currentId)
      .single();

    if (!parentData) break;

    const row = parentData as { parent_pdo_id: string | null };
    if (!row.parent_pdo_id) break;

    currentId = row.parent_pdo_id;
  }

  return currentId;
}

/**
 * Determine the next chain_position for a new PDO appended to a parent.
 */
export async function appendToChain(
  parentPdoId: string
): Promise<{ chain_root_id: string; chain_position: number }> {
  // Get parent info
  const { data, error } = await supabase
    .from('pdos')
    .select('chain_root_id, chain_position')
    .eq('id', parentPdoId)
    .single();

  if (error || !data) {
    throw new Error(`Parent PDO ${parentPdoId} not found`);
  }

  const row = data as { chain_root_id: string | null; chain_position: number | null };

  const rootId = row.chain_root_id ?? parentPdoId;
  const parentPosition = row.chain_position ?? 0;

  // Get max position in this chain
  const { data: maxData } = await supabase
    .from('pdos')
    .select('chain_position')
    .eq('chain_root_id', rootId)
    .order('chain_position', { ascending: false })
    .limit(1);

  const maxPosition =
    maxData && maxData.length > 0
      ? ((maxData[0] as { chain_position: number }).chain_position ?? parentPosition)
      : parentPosition;

  return {
    chain_root_id: rootId,
    chain_position: maxPosition + 1,
  };
}
