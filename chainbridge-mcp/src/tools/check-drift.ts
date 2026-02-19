import { z } from 'zod';
import { checkDriftSchema } from '../lib/validators.js';
import {
  calculateDriftMetrics,
  fetchModelPDOs,
} from '../lib/drift-detector.js';
import { generateDriftAssessment } from '../lib/claude.js';

type CheckDriftInput = z.infer<typeof checkDriftSchema>;

export async function checkDrift(rawInput: unknown): Promise<Record<string, unknown>> {
  // 1. Validate inputs
  const parseResult = checkDriftSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: 'Validation failed',
      details: parseResult.error.flatten(),
    };
  }

  const input: CheckDriftInput = parseResult.data;

  try {
    // 2. Query PDOs for model in time window
    const pdos = await fetchModelPDOs(
      input.model_id,
      input.facility_id,
      input.time_window_hours
    );

    // 3. Calculate drift vs baseline
    const driftMetrics = await calculateDriftMetrics(
      input.model_id,
      input.time_window_hours,
      pdos
    );

    // 4. Generate Claude assessment if requested
    let assessment: string | null = null;
    const recommendations: string[] = [];

    if (input.include_assessment) {
      assessment = await generateDriftAssessment(input.model_id, {
        drift_detected: driftMetrics.drift_detected,
        drift_score: driftMetrics.drift_score,
        drift_dimensions: driftMetrics.drift_dimensions,
        current_metrics: driftMetrics.metrics,
        baseline_metrics: driftMetrics.baseline_metrics,
        sample_count: driftMetrics.sample_count,
        time_window_hours: driftMetrics.time_window_hours,
      });

      // Generate recommendations based on drift
      if (driftMetrics.drift_detected) {
        if (driftMetrics.drift_score > 0.5) {
          recommendations.push('Consider triggering a P1 or P2 SCRAM to halt production pending model review.');
          recommendations.push('Initiate immediate model retraining or rollback to previous version.');
        }
        if (driftMetrics.drift_dimensions.confidence_drift > 0.1) {
          recommendations.push('Confidence score degradation detected — review input data distribution.');
        }
        if (driftMetrics.drift_dimensions.decision_drift > 0.1) {
          recommendations.push('Decision pattern drift detected — audit recent false positives/negatives.');
        }
        if (driftMetrics.drift_dimensions.temporal_drift > 0.05) {
          recommendations.push('Temporal degradation trend identified — escalate for immediate model inspection.');
        }
      } else {
        recommendations.push('Model is operating within acceptable drift bounds.');
        recommendations.push('Continue routine monitoring as scheduled.');
      }
    }

    // Determine severity
    const severity = getDriftSeverity(driftMetrics.drift_score, driftMetrics.drift_detected);

    return {
      success: true,
      model_id: input.model_id,
      pilot_id: input.pilot_id,
      facility_id: input.facility_id,
      time_window_hours: input.time_window_hours,
      sample_count: driftMetrics.sample_count,
      drift_detected: driftMetrics.drift_detected,
      drift_score: parseFloat(driftMetrics.drift_score.toFixed(4)),
      severity,
      drift_dimensions: {
        confidence_drift: parseFloat(driftMetrics.drift_dimensions.confidence_drift.toFixed(4)),
        decision_drift: parseFloat(driftMetrics.drift_dimensions.decision_drift.toFixed(4)),
        temporal_drift: parseFloat(driftMetrics.drift_dimensions.temporal_drift.toFixed(4)),
      },
      current_metrics: {
        mean_confidence: parseFloat(driftMetrics.metrics.mean_confidence.toFixed(4)),
        std_confidence: parseFloat(driftMetrics.metrics.std_confidence.toFixed(4)),
        fail_rate: parseFloat(driftMetrics.metrics.fail_rate.toFixed(4)),
        quarantine_rate: parseFloat(driftMetrics.metrics.quarantine_rate.toFixed(4)),
        pass_rate: parseFloat(driftMetrics.metrics.pass_rate.toFixed(4)),
      },
      baseline_metrics: {
        mean_confidence: parseFloat(driftMetrics.baseline_metrics.mean_confidence.toFixed(4)),
        fail_rate: parseFloat(driftMetrics.baseline_metrics.fail_rate.toFixed(4)),
        quarantine_rate: parseFloat(driftMetrics.baseline_metrics.quarantine_rate.toFixed(4)),
        pass_rate: parseFloat(driftMetrics.baseline_metrics.pass_rate.toFixed(4)),
      },
      assessment,
      recommendations,
      scram_recommended: driftMetrics.drift_score > 0.4,
      assessed_at: new Date().toISOString(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to check drift: ${message}`,
    };
  }
}

function getDriftSeverity(
  driftScore: number,
  driftDetected: boolean
): 'none' | 'low' | 'medium' | 'high' | 'critical' {
  if (!driftDetected) return 'none';
  if (driftScore < 0.1) return 'low';
  if (driftScore < 0.3) return 'medium';
  if (driftScore < 0.5) return 'high';
  return 'critical';
}
