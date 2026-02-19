import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { hashPDO } from '../lib/hash.js';
import { createPDOSchema } from '../lib/validators.js';
import { appendToChain } from '../lib/chain-resolver.js';
import { checkSCRAMRules, triggerSCRAM } from '../lib/scram-engine.js';

type CreatePDOInput = z.infer<typeof createPDOSchema>;

export async function createPDO(rawInput: unknown): Promise<Record<string, unknown>> {
  // 1. Validate inputs
  const parseResult = createPDOSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: 'Validation failed',
      details: parseResult.error.flatten(),
    };
  }

  const input: CreatePDOInput = parseResult.data;

  try {
    // 2. Generate SHA-256 hash
    const hash = hashPDO(input.proof, input.decision, input.outcome);

    // 3. Resolve chain info if parent exists
    let chainRootId: string | null = null;
    let chainPosition: number | null = null;

    if (input.parent_pdo_id) {
      // Verify parent exists
      const { data: parentData, error: parentError } = await supabase
        .from('pdos')
        .select('id, chain_root_id, chain_position')
        .eq('id', input.parent_pdo_id)
        .single();

      if (parentError || !parentData) {
        return {
          success: false,
          error: `Parent PDO ${input.parent_pdo_id} not found`,
        };
      }

      const chainInfo = await appendToChain(input.parent_pdo_id);
      chainRootId = chainInfo.chain_root_id;
      chainPosition = chainInfo.chain_position;
    }

    const now = new Date().toISOString();

    // 4. Build the PDO record for Supabase
    const pdoRecord = {
      hash,
      proof: input.proof,
      decision: input.decision,
      outcome: input.outcome,
      metadata: input.metadata,
      pilot_id: input.metadata.pilot_id,
      facility_id: input.metadata.facility_id,
      line_id: input.outcome.line_id,
      station_id: input.outcome.station_id,
      decision_result: input.decision.result,
      outcome_action: input.outcome.action,
      proof_type: input.proof.type,
      confidence_score: input.decision.confidence_score ?? input.proof.confidence_score,
      model_id: input.decision.model_id ?? null,
      parent_pdo_id: input.parent_pdo_id ?? null,
      chain_root_id: chainRootId,
      chain_position: chainPosition ?? 0,
      created_at: now,
      updated_at: now,
    };

    // 5. Insert into Supabase
    const { data, error } = await supabase
      .from('pdos')
      .insert(pdoRecord)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Database insert failed: ${error.message}`,
        code: error.code,
      };
    }

    const pdo = data as Record<string, unknown>;

    // Update chain_root_id to self if this is a root PDO
    if (!input.parent_pdo_id && pdo.id) {
      await supabase
        .from('pdos')
        .update({ chain_root_id: pdo.id })
        .eq('id', pdo.id as string);
      pdo.chain_root_id = pdo.id;
    }

    // 6. Check SCRAM rules for fail/quarantine decisions
    let scramTriggered = false;
    let scramDetails: Record<string, unknown> | null = null;

    if (
      input.decision.result === 'fail' ||
      input.decision.result === 'quarantine'
    ) {
      const confidenceScore =
        input.decision.confidence_score ?? input.proof.confidence_score;

      const scramCheck = await checkSCRAMRules(
        input.metadata.facility_id,
        input.outcome.line_id,
        input.decision.result,
        confidenceScore
      );

      if (scramCheck.shouldFire) {
        const scram = await triggerSCRAM({
          facility_id: input.metadata.facility_id,
          pilot_id: input.metadata.pilot_id,
          line_id: input.outcome.line_id,
          station_id: input.outcome.station_id,
          severity: scramCheck.severity,
          trigger_pdo_id: pdo.id as string,
          trigger_model_id: input.decision.model_id,
          trigger_reason: scramCheck.reason,
          cascade: false,
        });

        scramTriggered = true;
        scramDetails = {
          scram_id: scram.id,
          severity: scram.severity,
          reason: scramCheck.reason,
        };

        // Update PDO to reference SCRAM
        await supabase
          .from('pdos')
          .update({
            'outcome.scram_triggered': true,
            'outcome.scram_id': scram.id,
          })
          .eq('id', pdo.id as string);
      }
    }

    return {
      success: true,
      pdo_id: pdo.id,
      hash,
      chain_root_id: pdo.chain_root_id,
      chain_position: pdo.chain_position,
      decision_result: input.decision.result,
      outcome_action: input.outcome.action,
      scram_triggered: scramTriggered,
      scram: scramDetails,
      created_at: now,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Unexpected error creating PDO: ${message}`,
    };
  }
}
