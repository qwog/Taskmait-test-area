import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { clearScramState } from '../lib/redis.js';
import { resolveSCRAMSchema } from '../lib/validators.js';
import { hashPDO } from '../lib/hash.js';
import type { SCRAMEvent } from '../types/scram.js';

type ResolveSCRAMInput = z.infer<typeof resolveSCRAMSchema>;

export async function resolveScram(rawInput: unknown): Promise<Record<string, unknown>> {
  // 1. Validate inputs
  const parseResult = resolveSCRAMSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: 'Validation failed',
      details: parseResult.error.flatten(),
    };
  }

  const input: ResolveSCRAMInput = parseResult.data;

  try {
    // 2. Fetch existing SCRAM
    const { data: scramData, error: fetchError } = await supabase
      .from('scram_events')
      .select('*')
      .eq('id', input.scram_id)
      .single();

    if (fetchError || !scramData) {
      return {
        success: false,
        error: `SCRAM ${input.scram_id} not found`,
      };
    }

    const scram = scramData as SCRAMEvent;

    // Check if already resolved
    if (scram.status === 'resolved' || scram.status === 'false_positive') {
      return {
        success: false,
        error: `SCRAM ${input.scram_id} is already resolved (status: ${scram.status})`,
      };
    }

    // 2. Verify Trinity Gate — 3 distinct authorizers with appropriate roles
    const gate = input.trinity_gate;
    const authorizers = [gate.authorizer_1, gate.authorizer_2, gate.authorizer_3];

    // Check for duplicates
    const ids = authorizers.map((a) => a.id);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size < 3) {
      return {
        success: false,
        error: 'Trinity Gate requires 3 distinct authorizers. Duplicate IDs detected.',
      };
    }

    // Check authority level for severity
    const requiredRoles = getRequiredRoles(scram.severity);
    const hasAuthority = authorizers.some((a) =>
      requiredRoles.includes(a.role)
    );

    if (!hasAuthority) {
      return {
        success: false,
        error: `SCRAM severity ${scram.severity} requires at least one authorizer with role: ${requiredRoles.join(' or ')}`,
      };
    }

    const now = new Date().toISOString();

    // 3. Clear Redis state
    await clearScramState(input.scram_id);

    // 4. Update Supabase SCRAM record
    const newStatus =
      input.resolution === 'false_positive_confirmed' ? 'false_positive' : 'resolved';

    const { error: updateError } = await supabase
      .from('scram_events')
      .update({
        status: newStatus,
        resolution: input.resolution,
        resolution_notes: input.resolution_notes,
        trinity_gate: input.trinity_gate,
        resolved_by: input.resolved_by,
        resolved_at: now,
        updated_at: now,
      })
      .eq('id', input.scram_id);

    if (updateError) {
      return {
        success: false,
        error: `Failed to update SCRAM: ${updateError.message}`,
      };
    }

    // 5. Create resolution PDO
    const resolutionProof = {
      type: 'scram_resolution' as const,
      source_system: 'chainbridge-mcp',
      raw_value: {
        scram_id: input.scram_id,
        resolution: input.resolution,
        trinity_gate: input.trinity_gate,
      },
      confidence_score: 1.0,
      measurement_timestamp: now,
      operator_id: input.resolved_by,
    };

    const resolutionDecision = {
      result: 'pass' as const,
      rule_id: 'SCRAM_RESOLUTION',
      confidence_score: 1.0,
      reasoning: input.resolution_notes,
      human_reviewer_id: input.resolved_by,
      reviewed_at: now,
    };

    const resolutionOutcome = {
      action: 'release_hold' as const,
      station_id: scram.station_id ?? `${scram.line_id}-all`,
      line_id: scram.line_id,
      notes: `SCRAM ${input.scram_id} resolved: ${input.resolution}`,
      scram_triggered: false,
    };

    const resolutionHash = hashPDO(resolutionProof, resolutionDecision, resolutionOutcome);

    const { data: pdoData } = await supabase
      .from('pdos')
      .insert({
        hash: resolutionHash,
        proof: resolutionProof,
        decision: resolutionDecision,
        outcome: resolutionOutcome,
        metadata: {
          pilot_id: scram.pilot_id,
          facility_id: scram.facility_id,
          created_by: input.resolved_by,
          schema_version: '1.0.0',
          tags: ['scram_resolution'],
        },
        pilot_id: scram.pilot_id,
        facility_id: scram.facility_id,
        line_id: scram.line_id,
        decision_result: 'pass',
        outcome_action: 'release_hold',
        proof_type: 'scram_resolution',
        confidence_score: 1.0,
        chain_position: 0,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    // Link resolution PDO back to SCRAM
    if (pdoData) {
      const inserted = pdoData as { id: string };
      await supabase
        .from('scram_events')
        .update({ resolution_pdo_id: inserted.id })
        .eq('id', input.scram_id);
    }

    return {
      success: true,
      scram_id: input.scram_id,
      status: newStatus,
      resolution: input.resolution,
      resolved_by: input.resolved_by,
      resolved_at: now,
      resolution_pdo_id: pdoData ? (pdoData as { id: string }).id : null,
      trinity_gate_verified: true,
      message: `SCRAM ${input.scram_id} successfully resolved. Status: ${newStatus}.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to resolve SCRAM: ${message}`,
    };
  }
}

function getRequiredRoles(severity: string): string[] {
  switch (severity) {
    case 'P0_CRITICAL':
      return ['plant_manager', 'quality_director', 'executive'];
    case 'P1_HIGH':
      return ['senior_engineer', 'plant_manager', 'quality_director', 'executive'];
    case 'P2_MEDIUM':
      return ['engineer', 'senior_engineer', 'plant_manager', 'quality_director', 'executive'];
    case 'P3_LOW':
      return ['operator', 'engineer', 'senior_engineer', 'plant_manager', 'quality_director', 'executive'];
    default:
      return ['engineer', 'senior_engineer', 'plant_manager', 'quality_director', 'executive'];
  }
}
