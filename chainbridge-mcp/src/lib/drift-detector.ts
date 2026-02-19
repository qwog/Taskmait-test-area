import { supabase } from './supabase.js';
import type { DriftMetrics } from '../types/compliance.js';

interface BaselineMetrics {
  mean_confidence: number;
  std_confidence: number;
  fail_rate: number;
  quarantine_rate: number;
  pass_rate: number;
}

interface PDORow {
  id: string;
  decision_result: string;
  confidence_score: number | null;
  created_at: string;
}

/**
 * Compute drift metrics for a given model over the specified time window,
 * comparing to the stored baseline.
 */
export async function calculateDriftMetrics(
  modelId: string,
  timeWindowHours: number,
  pdos: PDORow[]
): Promise<DriftMetrics> {
  const baseline = await getDriftBaseline(modelId);

  const confidenceScores = pdos
    .map((p) => p.confidence_score)
    .filter((c): c is number => c !== null && c !== undefined);

  const sampleCount = pdos.length;

  if (sampleCount === 0) {
    return {
      model_id: modelId,
      time_window_hours: timeWindowHours,
      sample_count: 0,
      metrics: {
        mean_confidence: 0,
        std_confidence: 0,
        p95_confidence: 0,
        p5_confidence: 0,
        fail_rate: 0,
        quarantine_rate: 0,
        pass_rate: 0,
      },
      baseline_metrics: baseline,
      drift_detected: false,
      drift_score: 0,
      drift_dimensions: {
        confidence_drift: 0,
        decision_drift: 0,
        temporal_drift: 0,
      },
    };
  }

  // Decision rates
  const failCount = pdos.filter((p) => p.decision_result === 'fail').length;
  const quarantineCount = pdos.filter((p) => p.decision_result === 'quarantine').length;
  const passCount = pdos.filter((p) => p.decision_result === 'pass').length;

  const failRate = failCount / sampleCount;
  const quarantineRate = quarantineCount / sampleCount;
  const passRate = passCount / sampleCount;

  // Confidence statistics
  const meanConfidence =
    confidenceScores.length > 0
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
      : 0;

  const variance =
    confidenceScores.length > 1
      ? confidenceScores.reduce((acc, v) => acc + Math.pow(v - meanConfidence, 2), 0) /
        (confidenceScores.length - 1)
      : 0;
  const stdConfidence = Math.sqrt(variance);

  const sorted = [...confidenceScores].sort((a, b) => a - b);
  const p95Index = Math.floor(sorted.length * 0.95);
  const p5Index = Math.floor(sorted.length * 0.05);
  const p95Confidence = sorted[Math.min(p95Index, sorted.length - 1)] ?? 0;
  const p5Confidence = sorted[Math.max(p5Index, 0)] ?? 0;

  // Drift dimensions
  const confidenceDrift = Math.abs(meanConfidence - baseline.mean_confidence);
  const decisionDrift =
    Math.abs(failRate - baseline.fail_rate) +
    Math.abs(quarantineRate - baseline.quarantine_rate);

  // Temporal drift: check if recent half is worse than earlier half
  const midPoint = Math.floor(pdos.length / 2);
  const earlyPdos = pdos.slice(0, midPoint);
  const recentPdos = pdos.slice(midPoint);
  const earlyFailRate =
    earlyPdos.length > 0
      ? earlyPdos.filter((p) => p.decision_result === 'fail').length / earlyPdos.length
      : 0;
  const recentFailRate =
    recentPdos.length > 0
      ? recentPdos.filter((p) => p.decision_result === 'fail').length / recentPdos.length
      : 0;
  const temporalDrift = Math.max(0, recentFailRate - earlyFailRate);

  // Overall drift score (weighted)
  const driftScore = Math.min(
    1.0,
    confidenceDrift * 2 + decisionDrift * 1.5 + temporalDrift * 1.0
  );

  const driftDetected = isDriftDetected(
    { mean_confidence: meanConfidence, fail_rate: failRate, quarantine_rate: quarantineRate, pass_rate: passRate, std_confidence: stdConfidence },
    baseline,
    0.05
  );

  return {
    model_id: modelId,
    time_window_hours: timeWindowHours,
    sample_count: sampleCount,
    metrics: {
      mean_confidence: meanConfidence,
      std_confidence: stdConfidence,
      p95_confidence: p95Confidence,
      p5_confidence: p5Confidence,
      fail_rate: failRate,
      quarantine_rate: quarantineRate,
      pass_rate: passRate,
    },
    baseline_metrics: baseline,
    drift_detected: driftDetected,
    drift_score: driftScore,
    drift_dimensions: {
      confidence_drift: confidenceDrift,
      decision_drift: decisionDrift,
      temporal_drift: temporalDrift,
    },
  };
}

/**
 * Fetch baseline metrics for a model from the ai_models table.
 */
export async function getDriftBaseline(modelId: string): Promise<BaselineMetrics> {
  const { data, error } = await supabase
    .from('ai_models')
    .select('baseline_metrics')
    .eq('model_id', modelId)
    .single();

  if (error || !data || !data.baseline_metrics) {
    // Return conservative defaults if no baseline set
    return {
      mean_confidence: 0.92,
      std_confidence: 0.05,
      fail_rate: 0.02,
      quarantine_rate: 0.03,
      pass_rate: 0.95,
    };
  }

  const bm = data.baseline_metrics as Partial<BaselineMetrics>;
  return {
    mean_confidence: bm.mean_confidence ?? 0.92,
    std_confidence: bm.std_confidence ?? 0.05,
    fail_rate: bm.fail_rate ?? 0.02,
    quarantine_rate: bm.quarantine_rate ?? 0.03,
    pass_rate: bm.pass_rate ?? 0.95,
  };
}

/**
 * Determine if drift has exceeded the tolerance threshold.
 */
export function isDriftDetected(
  current: { mean_confidence: number; fail_rate: number; quarantine_rate: number; pass_rate: number; std_confidence: number },
  baseline: BaselineMetrics,
  tolerance: number
): boolean {
  const confidenceDrop = baseline.mean_confidence - current.mean_confidence;
  const failRateIncrease = current.fail_rate - baseline.fail_rate;
  const quarantineRateIncrease = current.quarantine_rate - baseline.quarantine_rate;

  return (
    confidenceDrop > tolerance ||
    failRateIncrease > tolerance ||
    quarantineRateIncrease > tolerance
  );
}

/**
 * Fetch PDO data for a model within a time window.
 */
export async function fetchModelPDOs(
  modelId: string,
  facilityId: string,
  timeWindowHours: number
): Promise<PDORow[]> {
  const since = new Date(Date.now() - timeWindowHours * 3600 * 1000).toISOString();

  const { data, error } = await supabase
    .from('pdos')
    .select('id, decision_result, confidence_score, created_at')
    .eq('model_id', modelId)
    .eq('facility_id', facilityId)
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch PDOs for model ${modelId}: ${error.message}`);
  }

  return (data ?? []) as PDORow[];
}
