import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { getComplianceDashboardSchema } from '../lib/validators.js';
import { generateComplianceSummary } from '../lib/claude.js';
import { PILOT_CONFIGS, type PilotConfig } from '../types/pilot.js';

type GetDashboardInput = z.infer<typeof getComplianceDashboardSchema>;

export async function getComplianceDashboard(rawInput: unknown): Promise<Record<string, unknown>> {
  // 1. Validate inputs
  const parseResult = getComplianceDashboardSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: 'Validation failed',
      details: parseResult.error.flatten(),
    };
  }

  const input: GetDashboardInput = parseResult.data;

  try {
    const pilotConfig = PILOT_CONFIGS[input.pilot_id];
    const now = new Date();
    const periodStart = new Date(now.getTime() - input.period_days * 86400 * 1000).toISOString();
    const frameworks = input.frameworks ?? pilotConfig?.regulatory_frameworks ?? [];

    // 2. Build base PDO query
    let pdoQuery = supabase
      .from('pdos')
      .select('id, decision_result, proof_type, confidence_score, created_at, facility_id, model_id')
      .eq('pilot_id', input.pilot_id)
      .gte('created_at', periodStart);

    if (input.facility_id) {
      pdoQuery = pdoQuery.eq('facility_id', input.facility_id);
    }

    const { data: pdoData } = await pdoQuery;
    const pdos = (pdoData ?? []) as Array<{
      id: string;
      decision_result: string;
      proof_type: string;
      confidence_score: number;
      created_at: string;
      facility_id: string;
      model_id: string | null;
    }>;

    // 3. Aggregate PDO stats
    const totalPDOs = pdos.length;
    const passPDOs = pdos.filter((p) => p.decision_result === 'pass').length;
    const failPDOs = pdos.filter((p) => p.decision_result === 'fail').length;
    const quarantinePDOs = pdos.filter((p) => p.decision_result === 'quarantine').length;
    const escalatePDOs = pdos.filter((p) => p.decision_result === 'escalate').length;

    const avgConfidence =
      pdos.length > 0
        ? pdos.reduce((sum, p) => sum + (p.confidence_score ?? 0), 0) / pdos.length
        : 0;

    // Count by proof type
    const proofTypeCounts: Record<string, number> = {};
    for (const pdo of pdos) {
      proofTypeCounts[pdo.proof_type] = (proofTypeCounts[pdo.proof_type] ?? 0) + 1;
    }

    // 4. Get SCRAM stats
    let scramQuery = supabase
      .from('scram_events')
      .select('id, severity, status, triggered_at')
      .eq('pilot_id', input.pilot_id)
      .gte('triggered_at', periodStart);

    if (input.facility_id) {
      scramQuery = scramQuery.eq('facility_id', input.facility_id);
    }

    const { data: scramData } = await scramQuery;
    const scrams = (scramData ?? []) as Array<{
      id: string;
      severity: string;
      status: string;
      triggered_at: string;
    }>;

    const scramsByStatus: Record<string, number> = {};
    const scramsBySeverity: Record<string, number> = {};
    for (const scram of scrams) {
      scramsByStatus[scram.status] = (scramsByStatus[scram.status] ?? 0) + 1;
      scramsBySeverity[scram.severity] = (scramsBySeverity[scram.severity] ?? 0) + 1;
    }

    // 5. Calculate compliance scores for each framework
    const complianceScores: Record<string, unknown>[] = [];

    for (const framework of frameworks) {
      const score = calculateFrameworkScore(
        framework,
        totalPDOs,
        passPDOs,
        failPDOs,
        quarantinePDOs,
        scrams.length,
        avgConfidence,
        pilotConfig
      );
      complianceScores.push(score);
    }

    const overallScore =
      complianceScores.length > 0
        ? complianceScores.reduce((sum, s) => sum + (s.score as number), 0) / complianceScores.length
        : 0;

    // 6. Get active model count
    const { data: modelData } = await supabase
      .from('ai_models')
      .select('model_id, model_name, status')
      .eq('pilot_id', input.pilot_id)
      .eq('status', 'active');

    const activeModels = (modelData ?? []).length;

    // 7. Get supply chain link count
    const { data: linkData } = await supabase
      .from('supply_chain_links')
      .select('id')
      .eq('source_pilot_id', input.pilot_id);

    const supplyChainLinks = (linkData ?? []).length;

    // 8. Get entity screening stats
    const screeningPDOs = pdos.filter((p) => p.proof_type === 'entity_screening');

    // 9. Generate executive summary via Claude
    let executiveSummary: string | null = null;

    if (input.include_executive_summary && totalPDOs > 0) {
      const summaryData = {
        pilot_id: input.pilot_id,
        period_days: input.period_days,
        total_pdos: totalPDOs,
        pass_rate: totalPDOs > 0 ? passPDOs / totalPDOs : 0,
        fail_rate: totalPDOs > 0 ? failPDOs / totalPDOs : 0,
        avg_confidence: avgConfidence,
        scram_count: scrams.length,
        open_scrams: scramsByStatus['triggered'] ?? 0 + (scramsByStatus['investigating'] ?? 0),
        overall_compliance_score: overallScore,
        frameworks,
      };

      const primaryFramework = frameworks[0] ?? 'IATF_16949';
      executiveSummary = await generateComplianceSummary(summaryData, primaryFramework);
    }

    // 10. Build dashboard
    return {
      success: true,
      pilot_id: input.pilot_id,
      pilot_name: pilotConfig?.name ?? input.pilot_id,
      facility_id: input.facility_id ?? 'all',
      period_days: input.period_days,
      period_start: periodStart,
      period_end: now.toISOString(),

      pdo_stats: {
        total: totalPDOs,
        pass: passPDOs,
        fail: failPDOs,
        quarantine: quarantinePDOs,
        escalate: escalatePDOs,
        pass_rate: totalPDOs > 0 ? parseFloat((passPDOs / totalPDOs).toFixed(4)) : 0,
        fail_rate: totalPDOs > 0 ? parseFloat((failPDOs / totalPDOs).toFixed(4)) : 0,
        avg_confidence: parseFloat(avgConfidence.toFixed(4)),
        by_proof_type: proofTypeCounts,
      },

      scram_stats: {
        total: scrams.length,
        by_status: scramsByStatus,
        by_severity: scramsBySeverity,
        open: (scramsByStatus['triggered'] ?? 0) + (scramsByStatus['investigating'] ?? 0),
        resolved: scramsByStatus['resolved'] ?? 0,
      },

      compliance: {
        overall_score: parseFloat(overallScore.toFixed(1)),
        overall_grade: scoreToGrade(overallScore),
        frameworks: complianceScores,
      },

      operational: {
        active_ai_models: activeModels,
        supply_chain_links: supplyChainLinks,
        entity_screenings: screeningPDOs.length,
      },

      executive_summary: executiveSummary,
      generated_at: now.toISOString(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to get compliance dashboard: ${message}`,
    };
  }
}

function calculateFrameworkScore(
  framework: string,
  totalPDOs: number,
  passPDOs: number,
  failPDOs: number,
  _quarantinePDOs: number,
  scramCount: number,
  avgConfidence: number,
  pilotConfig: PilotConfig | undefined
): Record<string, unknown> {
  let score = 100;

  if (totalPDOs === 0) {
    return {
      framework,
      score: 100,
      grade: 'A',
      passing: true,
      notes: 'No PDOs in period',
    };
  }

  // Deduct for fail rate
  const failRate = failPDOs / totalPDOs;
  score -= failRate * 30;

  // Deduct for SCAMs
  if (scramCount > 0) {
    score -= Math.min(20, scramCount * 5);
  }

  // Deduct for low confidence
  if (avgConfidence < 0.9) {
    score -= (0.9 - avgConfidence) * 50;
  }

  // Framework-specific adjustments
  if (framework === 'ITAR' || framework === 'EAR') {
    // Zero-tolerance: any fail is 100% deduction
    if (failPDOs > 0) score = 0;
  }

  if (framework === 'UFLPA') {
    if (failPDOs > 0) score = Math.min(score, 50);
  }

  score = Math.max(0, Math.min(100, score));
  const threshold = (pilotConfig?.compliance_thresholds?.[framework]) ?? 80;

  return {
    framework,
    score: parseFloat(score.toFixed(1)),
    grade: scoreToGrade(score),
    passing: score >= threshold,
    threshold,
    gaps: score < threshold ? [`Score ${score.toFixed(1)} is below threshold ${threshold}`] : [],
  };
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}
