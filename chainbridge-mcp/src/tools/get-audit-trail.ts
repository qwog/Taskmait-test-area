import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { getAuditTrailSchema } from '../lib/validators.js';
import { verifyHash } from '../lib/hash.js';
import { resolveChain } from '../lib/chain-resolver.js';

type GetAuditTrailInput = z.infer<typeof getAuditTrailSchema>;

interface PDORecord {
  id: string;
  hash: string;
  proof: Record<string, unknown>;
  decision: Record<string, unknown>;
  outcome: Record<string, unknown>;
  metadata: Record<string, unknown>;
  parent_pdo_id: string | null;
  chain_root_id: string | null;
  chain_position: number;
  created_at: string;
  updated_at: string;
  decision_result: string;
  outcome_action: string;
  proof_type: string;
  confidence_score: number;
  facility_id: string;
  pilot_id: string;
  line_id: string;
  station_id: string | null;
  model_id: string | null;
}

export async function getAuditTrail(rawInput: unknown): Promise<Record<string, unknown>> {
  // 1. Validate inputs
  const parseResult = getAuditTrailSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: 'Validation failed',
      details: parseResult.error.flatten(),
    };
  }

  const input: GetAuditTrailInput = parseResult.data;

  try {
    // 2. Handle chain traversal for a specific chain root
    if (input.chain_root_id) {
      const chainEntries = await resolveChain(input.chain_root_id);
      return {
        success: true,
        mode: 'chain',
        chain_root_id: input.chain_root_id,
        chain_length: chainEntries.length,
        entries: chainEntries,
        queried_at: new Date().toISOString(),
      };
    }

    // 3. Handle single PDO lookup
    if (input.pdo_id) {
      const { data, error } = await supabase
        .from('pdos')
        .select('*')
        .eq('id', input.pdo_id)
        .single();

      if (error || !data) {
        return {
          success: false,
          error: `PDO ${input.pdo_id} not found`,
        };
      }

      const pdo = data as PDORecord;
      let hashValid: boolean | null = null;

      if (input.verify_hashes) {
        hashValid = verifyHash(pdo.proof, pdo.decision, pdo.outcome, pdo.hash);
      }

      return {
        success: true,
        mode: 'single',
        pdo: formatPDO(pdo, input.format),
        hash_valid: hashValid,
        queried_at: new Date().toISOString(),
      };
    }

    // 4. Build query with filters
    let query = supabase.from('pdos').select('*');

    if (input.pilot_id) query = query.eq('pilot_id', input.pilot_id);
    if (input.facility_id) query = query.eq('facility_id', input.facility_id);
    if (input.station_id) query = query.eq('station_id', input.station_id);
    if (input.line_id) query = query.eq('line_id', input.line_id);
    if (input.model_id) query = query.eq('model_id', input.model_id);
    if (input.decision_result) query = query.eq('decision_result', input.decision_result);
    if (input.proof_type) query = query.eq('proof_type', input.proof_type);
    if (input.from_date) query = query.gte('created_at', input.from_date);
    if (input.to_date) query = query.lte('created_at', input.to_date);

    query = query
      .order('created_at', { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return {
        success: false,
        error: `Query failed: ${error.message}`,
      };
    }

    const pdos = (data ?? []) as PDORecord[];

    // 5. Optionally verify hash integrity of each PDO
    const formattedPDOs = pdos.map((pdo) => {
      const formatted = formatPDO(pdo, input.format);

      if (input.verify_hashes) {
        const hashValid = verifyHash(pdo.proof, pdo.decision, pdo.outcome, pdo.hash);
        return { ...formatted, hash_valid: hashValid };
      }

      return formatted;
    });

    // Hash integrity summary
    let hashIntegrity: Record<string, unknown> | null = null;
    if (input.verify_hashes) {
      const hashResults = pdos.map((pdo) =>
        verifyHash(pdo.proof, pdo.decision, pdo.outcome, pdo.hash)
      );
      const validCount = hashResults.filter(Boolean).length;
      hashIntegrity = {
        total_checked: hashResults.length,
        valid: validCount,
        invalid: hashResults.length - validCount,
        integrity_rate: hashResults.length > 0 ? validCount / hashResults.length : 1,
      };
    }

    return {
      success: true,
      mode: 'query',
      total_count: count ?? pdos.length,
      returned_count: pdos.length,
      limit: input.limit,
      offset: input.offset,
      filters_applied: buildFilterSummary(input),
      pdos: formattedPDOs,
      hash_integrity: hashIntegrity,
      queried_at: new Date().toISOString(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to get audit trail: ${message}`,
    };
  }
}

function formatPDO(
  pdo: PDORecord,
  format: 'full' | 'summary' | 'regulatory'
): Record<string, unknown> {
  switch (format) {
    case 'summary':
      return {
        id: pdo.id,
        hash: pdo.hash,
        decision_result: pdo.decision_result,
        outcome_action: pdo.outcome_action,
        proof_type: pdo.proof_type,
        confidence_score: pdo.confidence_score,
        facility_id: pdo.facility_id,
        line_id: pdo.line_id,
        chain_position: pdo.chain_position,
        created_at: pdo.created_at,
      };

    case 'regulatory':
      return {
        record_id: pdo.id,
        integrity_hash: pdo.hash,
        proof_type: pdo.proof_type,
        decision: {
          result: pdo.decision_result,
          confidence: pdo.confidence_score,
          model_id: pdo.model_id,
          reasoning: (pdo.decision as Record<string, unknown>).reasoning,
        },
        outcome: {
          action: pdo.outcome_action,
          station: pdo.station_id,
          line: pdo.line_id,
          facility: pdo.facility_id,
        },
        regulatory_frameworks: (pdo.metadata as Record<string, unknown>).regulatory_frameworks,
        timestamp: pdo.created_at,
        chain: {
          root_id: pdo.chain_root_id,
          position: pdo.chain_position,
          parent_id: pdo.parent_pdo_id,
        },
      };

    case 'full':
    default:
      return pdo as unknown as Record<string, unknown>;
  }
}

function buildFilterSummary(input: GetAuditTrailInput): Record<string, unknown> {
  const filters: Record<string, unknown> = {};
  if (input.pilot_id) filters.pilot_id = input.pilot_id;
  if (input.facility_id) filters.facility_id = input.facility_id;
  if (input.station_id) filters.station_id = input.station_id;
  if (input.line_id) filters.line_id = input.line_id;
  if (input.model_id) filters.model_id = input.model_id;
  if (input.decision_result) filters.decision_result = input.decision_result;
  if (input.proof_type) filters.proof_type = input.proof_type;
  if (input.from_date) filters.from_date = input.from_date;
  if (input.to_date) filters.to_date = input.to_date;
  return filters;
}
