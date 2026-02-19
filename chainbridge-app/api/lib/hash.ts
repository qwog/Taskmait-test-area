import { createHash } from 'crypto';

/**
 * Computes a deterministic SHA-256 content hash for a PDO.
 * The hash covers all immutable fields so any tampering is detectable.
 */
export function computePdoHash(pdo: {
  org_id: string;
  facility_id: string;
  proof_type: string;
  proof_source_system: string;
  proof_timestamp: string;
  proof_confidence_score?: number | null;
  decision_result: string;
  decision_threshold_used?: number | null;
  outcome_action: string;
  jurisdiction: string;
  regulatory_frameworks: string[];
  parent_pdo_id?: string | null;
  chain_position?: number;
}): string {
  // Canonical JSON: sorted keys, no trailing whitespace
  const canonical = JSON.stringify({
    org_id: pdo.org_id,
    facility_id: pdo.facility_id,
    proof_type: pdo.proof_type,
    proof_source_system: pdo.proof_source_system,
    proof_timestamp: pdo.proof_timestamp,
    proof_confidence_score: pdo.proof_confidence_score ?? null,
    decision_result: pdo.decision_result,
    decision_threshold_used: pdo.decision_threshold_used ?? null,
    outcome_action: pdo.outcome_action,
    jurisdiction: pdo.jurisdiction,
    regulatory_frameworks: [...pdo.regulatory_frameworks].sort(),
    parent_pdo_id: pdo.parent_pdo_id ?? null,
    chain_position: pdo.chain_position ?? 0,
  });

  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * Verifies that a stored PDO's content_hash matches a freshly computed hash.
 * Returns true if the record is unmodified.
 */
export function verifyPdoHash(
  storedHash: string,
  pdo: Parameters<typeof computePdoHash>[0]
): boolean {
  const computed = computePdoHash(pdo);
  return computed === storedHash;
}

/** Generic SHA-256 of any string payload (used for audit logs etc.) */
export function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}
