import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth, unauthorized } from '../lib/auth';
import { getSupabaseAdmin } from '../lib/supabase';
import { computePdoHash } from '../lib/hash';
import { setScramActive } from '../lib/redis';

// ── Input schema ──────────────────────────────────────────────────────────

const CreatePdoSchema = z.object({
  facility_id: z.string().uuid(),
  line_id: z.string().uuid().optional(),
  station_id: z.string().uuid().optional(),

  proof_type: z.string().min(1),
  proof_source_system: z.string().min(1),
  proof_ai_model_id: z.string().optional(),
  proof_ai_model_version: z.string().optional(),
  proof_confidence_score: z.number().min(0).max(1).optional(),
  proof_raw_data_ref: z.string().optional(),
  proof_feature_classification: z.record(z.unknown()).optional(),
  proof_timestamp: z.string().datetime(),

  decision_result: z.enum(['pass', 'fail', 'quarantine', 'escalate']),
  decision_threshold_used: z.number().min(0).max(1).optional(),
  decision_constitutional_rule_id: z.string().optional(),
  decision_reasoning: z.string().optional(),

  outcome_action: z.enum(['proceed', 'halt', 'rework', 'scrap', 'human_review']),
  outcome_downstream_system: z.string().optional(),
  outcome_record_id: z.string().optional(),
  outcome_operator_id: z.string().optional(),

  pilot_id: z.enum(['magna', 'roush', 'l_and_l', 'adac', 'corridor']).optional(),
  jurisdiction: z.string().min(1),
  regulatory_frameworks: z.array(z.string()).min(1),

  parent_pdo_id: z.string().uuid().optional(),
  chain_position: z.number().int().min(0).default(0),
});

// ── SCRAM evaluation ──────────────────────────────────────────────────────

async function evaluateScramRules(
  pdo: z.infer<typeof CreatePdoSchema> & { id: string; org_id: string }
): Promise<void> {
  // Auto-trigger SCRAM for 'fail' with outcome 'halt', or explicit escalate
  const shouldScram =
    (pdo.decision_result === 'fail' && pdo.outcome_action === 'halt') ||
    pdo.decision_result === 'escalate';

  if (!shouldScram) return;

  const supabase = getSupabaseAdmin();

  const severity =
    pdo.decision_result === 'escalate' ? 'critical' : 'high';

  const { data: scram, error } = await supabase
    .from('scrams')
    .insert({
      org_id: pdo.org_id,
      facility_id: pdo.facility_id,
      line_id: pdo.line_id ?? null,
      station_id: pdo.station_id ?? null,
      trigger_pdo_id: pdo.id,
      severity,
      reason: pdo.decision_reasoning ?? `Auto-triggered by PDO decision: ${pdo.decision_result}`,
      affected_systems: pdo.proof_source_system ? [pdo.proof_source_system] : [],
      cascade: false,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    console.error('[SCRAM] insert error:', error);
    return;
  }

  // Mirror to Redis for real-time access
  await setScramActive({
    id: scram.id,
    org_id: pdo.org_id,
    facility_id: pdo.facility_id,
    severity,
    reason: scram.reason,
    triggered_at: scram.triggered_at,
    status: 'active',
  });
}

// ── Handler ───────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = verifyAuth(req);
  if (!auth) return unauthorized(res);

  const parsed = CreatePdoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
  }

  const input = parsed.data;

  // Compute content hash before insert
  const content_hash = computePdoHash({
    org_id: auth.org_id,
    facility_id: input.facility_id,
    proof_type: input.proof_type,
    proof_source_system: input.proof_source_system,
    proof_timestamp: input.proof_timestamp,
    proof_confidence_score: input.proof_confidence_score,
    decision_result: input.decision_result,
    decision_threshold_used: input.decision_threshold_used,
    outcome_action: input.outcome_action,
    jurisdiction: input.jurisdiction,
    regulatory_frameworks: input.regulatory_frameworks,
    parent_pdo_id: input.parent_pdo_id,
    chain_position: input.chain_position,
  });

  const supabase = getSupabaseAdmin();

  const { data: pdo, error } = await supabase
    .from('pdos')
    .insert({
      org_id: auth.org_id,
      ...input,
      content_hash,
      hash_algorithm: 'SHA-256',
    })
    .select()
    .single();

  if (error) {
    console.error('[PDO] insert error:', error);
    return res.status(500).json({ error: 'Failed to create PDO', details: error.message });
  }

  // Evaluate SCRAM rules asynchronously (non-blocking response)
  evaluateScramRules({ ...input, id: pdo.id, org_id: auth.org_id }).catch(console.error);

  return res.status(201).json({ data: pdo });
}
