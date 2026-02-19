import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { linkSupplyChainSchema } from '../lib/validators.js';
import { PILOT_CONFIGS } from '../types/pilot.js';

type LinkSupplyChainInput = z.infer<typeof linkSupplyChainSchema>;

export async function linkSupplyChain(rawInput: unknown): Promise<Record<string, unknown>> {
  // 1. Validate inputs
  const parseResult = linkSupplyChainSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: 'Validation failed',
      details: parseResult.error.flatten(),
    };
  }

  const input: LinkSupplyChainInput = parseResult.data;

  try {
    const now = new Date().toISOString();

    // Check if link already exists
    const { data: existing } = await supabase
      .from('supply_chain_links')
      .select('id, status')
      .eq('source_facility_id', input.source_facility_id)
      .eq('target_facility_id', input.target_facility_id)
      .single();

    if (existing) {
      return {
        success: false,
        error: `Supply chain link from ${input.source_facility_id} to ${input.target_facility_id} already exists.`,
        existing_link_id: (existing as { id: string }).id,
      };
    }

    // 2. Build link record
    const sourcePilot = PILOT_CONFIGS[input.source_pilot_id];
    const targetPilot = PILOT_CONFIGS[input.target_pilot_id];

    const linkRecord = {
      source_facility_id: input.source_facility_id,
      source_pilot_id: input.source_pilot_id,
      target_facility_id: input.target_facility_id,
      target_pilot_id: input.target_pilot_id,
      link_type: input.link_type,
      parts: input.parts ?? [],
      scram_cascade_enabled: input.scram_cascade_enabled,
      cascade_severity_threshold: input.cascade_severity_threshold,
      created_by: input.created_by,
      notes: input.notes ?? null,
      status: 'active',
      created_at: now,
      updated_at: now,
    };

    const { data: linkData, error: linkError } = await supabase
      .from('supply_chain_links')
      .insert(linkRecord)
      .select()
      .single();

    if (linkError) {
      return {
        success: false,
        error: `Failed to create supply chain link: ${linkError.message}`,
        code: linkError.code,
      };
    }

    const link = linkData as Record<string, unknown>;

    // 3. Configure SCRAM cascade rules
    const cascadeConfig = buildCascadeConfig(input);

    // Store cascade rules in the link record
    await supabase
      .from('supply_chain_links')
      .update({ cascade_config: cascadeConfig })
      .eq('id', link.id as string);

    // 4. Build compliance overlap information
    const sourceFrameworks = new Set(sourcePilot?.regulatory_frameworks ?? []);
    const targetFrameworks = new Set(targetPilot?.regulatory_frameworks ?? []);
    const sharedFrameworks = [...sourceFrameworks].filter((f) => targetFrameworks.has(f));
    const frameworkGaps = [
      ...[...sourceFrameworks].filter((f) => !targetFrameworks.has(f)).map((f) => `Source has ${f}, target does not`),
      ...[...targetFrameworks].filter((f) => !sourceFrameworks.has(f)).map((f) => `Target has ${f}, source does not`),
    ];

    return {
      success: true,
      link_id: link.id,
      source: {
        facility_id: input.source_facility_id,
        pilot_id: input.source_pilot_id,
        pilot_name: sourcePilot?.name ?? input.source_pilot_id,
      },
      target: {
        facility_id: input.target_facility_id,
        pilot_id: input.target_pilot_id,
        pilot_name: targetPilot?.name ?? input.target_pilot_id,
      },
      link_type: input.link_type,
      parts_covered: input.parts ?? [],
      cascade_config: cascadeConfig,
      compliance_overlap: {
        shared_frameworks: sharedFrameworks,
        framework_gaps: frameworkGaps,
        alignment_score: sourceFrameworks.size > 0
          ? parseFloat((sharedFrameworks.length / Math.max(sourceFrameworks.size, targetFrameworks.size)).toFixed(2))
          : 0,
      },
      created_at: now,
      message: `Supply chain link established from ${input.source_facility_id} (${input.source_pilot_id}) to ${input.target_facility_id} (${input.target_pilot_id}). SCRAM cascade ${input.scram_cascade_enabled ? 'ENABLED' : 'DISABLED'} at threshold ${input.cascade_severity_threshold}.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to link supply chain: ${message}`,
    };
  }
}

interface CascadeConfig {
  enabled: boolean;
  severity_threshold: string;
  propagation_rules: Array<{
    trigger_severity: string;
    action: string;
    notification_required: boolean;
    trinity_gate_required: boolean;
  }>;
  delay_seconds: number;
  max_cascade_depth: number;
}

function buildCascadeConfig(input: LinkSupplyChainInput): CascadeConfig {
  if (!input.scram_cascade_enabled) {
    return {
      enabled: false,
      severity_threshold: input.cascade_severity_threshold,
      propagation_rules: [],
      delay_seconds: 0,
      max_cascade_depth: 0,
    };
  }

  const severityOrder = ['P0_CRITICAL', 'P1_HIGH', 'P2_MEDIUM', 'P3_LOW'];
  const thresholdIndex = severityOrder.indexOf(input.cascade_severity_threshold);

  const propagationRules = severityOrder
    .slice(0, thresholdIndex + 1)
    .map((severity) => ({
      trigger_severity: severity,
      action: severity === 'P0_CRITICAL' ? 'immediate_halt' : severity === 'P1_HIGH' ? 'line_stop' : 'notify',
      notification_required: true,
      trinity_gate_required: severity === 'P0_CRITICAL' || severity === 'P1_HIGH',
    }));

  return {
    enabled: true,
    severity_threshold: input.cascade_severity_threshold,
    propagation_rules: propagationRules,
    delay_seconds: input.link_type === 'tier1_to_oem' ? 0 : 30,
    max_cascade_depth: 3,
  };
}
