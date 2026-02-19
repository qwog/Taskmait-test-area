import { supabase } from './supabase.js';
import { setScramState } from './redis.js';
import type { SCRAMCreateInput, SCRAMEvent, SCRAMSeverity } from '../types/scram.js';

interface CascadeTarget {
  facility_id: string;
  line_id: string;
  pilot_id: string;
}

/**
 * Trigger a SCRAM event: write to Redis first for fast circuit-breaking,
 * then persist to Supabase for durable audit.
 */
export async function triggerSCRAM(input: SCRAMCreateInput): Promise<SCRAMEvent> {
  const now = new Date().toISOString();

  // Build the record we want to insert
  const scramRecord = {
    facility_id: input.facility_id,
    pilot_id: input.pilot_id,
    line_id: input.line_id,
    station_id: input.station_id ?? null,
    severity: input.severity,
    status: 'triggered',
    trigger_pdo_id: input.trigger_pdo_id ?? null,
    trigger_model_id: input.trigger_model_id ?? null,
    trigger_reason: input.trigger_reason,
    affected_stations: await getAffectedStations(input.facility_id, input.line_id),
    cascade_targets: [] as CascadeTarget[],
    triggered_at: now,
    metadata: input.metadata ?? {},
  };

  // 1. Write to Redis immediately for fast circuit-breaking
  const tempId = `scram-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  await setScramState(tempId, input.facility_id, input.line_id, input.severity);

  // 2. Insert into Supabase
  const { data, error } = await supabase
    .from('scram_events')
    .insert(scramRecord)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert SCRAM record: ${error.message}`);
  }

  const scram = data as SCRAMEvent;

  // 3. Update Redis key with real ID
  await setScramState(scram.id, input.facility_id, input.line_id, input.severity);

  return scram;
}

/**
 * Evaluate whether a SCRAM should be triggered based on decision result
 * and confidence score thresholds.
 */
export async function checkSCRAMRules(
  facilityId: string,
  lineId: string,
  decisionResult: string,
  confidenceScore: number
): Promise<{ shouldFire: boolean; severity: SCRAMSeverity; reason: string }> {
  // Critical: fail with very low confidence
  if (decisionResult === 'fail' && confidenceScore >= 0.95) {
    return {
      shouldFire: true,
      severity: 'P0_CRITICAL',
      reason: `High-confidence failure detected (confidence: ${confidenceScore}) on line ${lineId}`,
    };
  }

  // High: quarantine or fail with moderate confidence
  if (
    (decisionResult === 'quarantine' || decisionResult === 'fail') &&
    confidenceScore >= 0.80
  ) {
    return {
      shouldFire: true,
      severity: 'P1_HIGH',
      reason: `Quarantine/fail decision at high confidence (${confidenceScore}) on line ${lineId}`,
    };
  }

  // Medium: multiple consecutive fails — check recent PDOs
  const recentFails = await countRecentFailures(facilityId, lineId, 10);
  if (recentFails >= 5) {
    return {
      shouldFire: true,
      severity: 'P2_MEDIUM',
      reason: `${recentFails} failures in last 10 PDOs on line ${lineId}`,
    };
  }

  // Low: any quarantine
  if (decisionResult === 'quarantine') {
    return {
      shouldFire: true,
      severity: 'P3_LOW',
      reason: `Quarantine decision on line ${lineId}`,
    };
  }

  return { shouldFire: false, severity: 'P3_LOW', reason: '' };
}

/**
 * Look up supply chain links to find cascade targets.
 */
export async function getCascadeTargets(
  facilityId: string,
  lineId: string
): Promise<CascadeTarget[]> {
  const { data, error } = await supabase
    .from('supply_chain_links')
    .select('target_facility_id, target_pilot_id, scram_cascade_enabled, cascade_severity_threshold')
    .eq('source_facility_id', facilityId)
    .eq('scram_cascade_enabled', true);

  if (error || !data) return [];

  return data.map((row: Record<string, string>) => ({
    facility_id: row.target_facility_id,
    line_id: lineId, // cascade to same line designation
    pilot_id: row.target_pilot_id,
  }));
}

/**
 * Propagate SCRAM to each cascade target by creating linked SCRAM records.
 */
export async function propagateCascade(
  parentScramId: string,
  parentFacilityId: string,
  targets: CascadeTarget[],
  severity: SCRAMSeverity,
  reason: string
): Promise<Array<{ facility_id: string; scram_id: string }>> {
  const results: Array<{ facility_id: string; scram_id: string }> = [];

  for (const target of targets) {
    try {
      const now = new Date().toISOString();
      const cascadeRecord = {
        facility_id: target.facility_id,
        pilot_id: target.pilot_id,
        line_id: target.line_id,
        severity,
        status: 'cascaded',
        trigger_reason: `CASCADE from facility ${parentFacilityId} SCRAM ${parentScramId}: ${reason}`,
        affected_stations: [],
        cascade_targets: [],
        triggered_at: now,
        metadata: { parent_scram_id: parentScramId, cascade_source: parentFacilityId },
      };

      const { data, error } = await supabase
        .from('scram_events')
        .insert(cascadeRecord)
        .select('id')
        .single();

      if (!error && data) {
        const inserted = data as { id: string };
        await setScramState(inserted.id, target.facility_id, target.line_id, severity);
        results.push({ facility_id: target.facility_id, scram_id: inserted.id });
      }
    } catch (err) {
      // Log but don't fail the whole cascade
      console.error(`Cascade to ${target.facility_id} failed:`, err);
    }
  }

  // Update parent SCRAM with cascade_targets
  if (results.length > 0) {
    await supabase
      .from('scram_events')
      .update({ cascade_targets: results })
      .eq('id', parentScramId);
  }

  return results;
}

// ─── Private helpers ─────────────────────────────────────────────────────────

async function getAffectedStations(
  facilityId: string,
  lineId: string
): Promise<string[]> {
  const { data } = await supabase
    .from('stations')
    .select('station_id')
    .eq('facility_id', facilityId)
    .eq('line_id', lineId);

  if (!data || data.length === 0) {
    // Fallback: return generic station IDs
    return [`${lineId}-STN-01`, `${lineId}-STN-02`, `${lineId}-STN-03`];
  }

  return (data as Array<{ station_id: string }>).map((row) => row.station_id);
}

async function countRecentFailures(
  facilityId: string,
  lineId: string,
  lookback: number
): Promise<number> {
  const { data } = await supabase
    .from('pdos')
    .select('id')
    .eq('facility_id', facilityId)
    .eq('line_id', lineId)
    .in('decision_result', ['fail', 'quarantine'])
    .order('created_at', { ascending: false })
    .limit(lookback);

  return data?.length ?? 0;
}
