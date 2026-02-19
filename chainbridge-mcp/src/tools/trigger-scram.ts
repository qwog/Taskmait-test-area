import { z } from 'zod';
import { triggerSCRAMSchema } from '../lib/validators.js';
import { triggerSCRAM, getCascadeTargets, propagateCascade } from '../lib/scram-engine.js';
import { PILOT_CONFIGS } from '../types/pilot.js';

type TriggerSCRAMInput = z.infer<typeof triggerSCRAMSchema>;

export async function triggerScramTool(rawInput: unknown): Promise<Record<string, unknown>> {
  // 1. Validate inputs
  const parseResult = triggerSCRAMSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: 'Validation failed',
      details: parseResult.error.flatten(),
    };
  }

  const input: TriggerSCRAMInput = parseResult.data;

  try {
    // 2. Write SCRAM to Redis first, then Supabase (done inside triggerSCRAM)
    const scram = await triggerSCRAM({
      facility_id: input.facility_id,
      pilot_id: input.pilot_id,
      line_id: input.line_id,
      station_id: input.station_id,
      severity: input.severity,
      trigger_pdo_id: input.trigger_pdo_id,
      trigger_model_id: input.trigger_model_id,
      trigger_reason: input.trigger_reason,
      cascade: input.cascade,
      metadata: input.metadata,
    });

    let cascadeResults: Array<{ facility_id: string; scram_id: string }> = [];

    // 3. If cascade is enabled and pilot supports it, propagate
    const pilotConfig = PILOT_CONFIGS[input.pilot_id];
    const cascadeEnabled = pilotConfig?.scram_cascade_enabled ?? false;

    if (input.cascade && cascadeEnabled) {
      const cascadeTargets = await getCascadeTargets(input.facility_id, input.line_id);

      if (cascadeTargets.length > 0) {
        cascadeResults = await propagateCascade(
          scram.id,
          input.facility_id,
          cascadeTargets,
          input.severity,
          input.trigger_reason
        );
      }
    }

    // 4. Build response
    return {
      success: true,
      scram_id: scram.id,
      severity: scram.severity,
      status: scram.status,
      facility_id: scram.facility_id,
      line_id: scram.line_id,
      affected_stations: scram.affected_stations,
      triggered_at: scram.triggered_at,
      cascade_enabled: input.cascade && cascadeEnabled,
      cascade_count: cascadeResults.length,
      cascade_results: cascadeResults,
      message: buildSCRAMMessage(scram.severity, input.facility_id, input.line_id, cascadeResults.length),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to trigger SCRAM: ${message}`,
    };
  }
}

function buildSCRAMMessage(
  severity: string,
  facilityId: string,
  lineId: string,
  cascadeCount: number
): string {
  const severityLabels: Record<string, string> = {
    P0_CRITICAL: 'CRITICAL — FULL PRODUCTION HALT',
    P1_HIGH: 'HIGH — LINE STOP',
    P2_MEDIUM: 'MEDIUM — STATION HALT',
    P3_LOW: 'LOW — WARNING',
  };

  const label = severityLabels[severity] ?? severity;
  let msg = `SCRAM ${label} triggered at facility ${facilityId}, line ${lineId}.`;

  if (cascadeCount > 0) {
    msg += ` Cascade propagated to ${cascadeCount} downstream facility(ies).`;
  }

  return msg;
}
