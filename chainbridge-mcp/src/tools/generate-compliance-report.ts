import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { generateComplianceReportSchema } from '../lib/validators.js';
import { generateComplianceReport as claudeGenerateReport } from '../lib/claude.js';

type GenerateReportInput = z.infer<typeof generateComplianceReportSchema>;

// Default sections for each regulatory framework
const FRAMEWORK_SECTIONS: Record<string, string[]> = {
  EU_AI_ACT: [
    'Article 9 - Risk Management System',
    'Article 10 - Training Data Governance',
    'Article 13 - Transparency & Logging',
    'Article 14 - Human Oversight',
    'Article 15 - Accuracy & Robustness',
    'Article 17 - Quality Management',
  ],
  IATF_16949: [
    'Clause 4 - Context of Organization',
    'Clause 6 - Planning',
    'Clause 7 - Support',
    'Clause 8 - Operation',
    'Clause 9 - Performance Evaluation',
    'Clause 10 - Improvement',
  ],
  ISO_PAS_8800: [
    'Section 4 - AI System Context',
    'Section 6 - AI Risk Management',
    'Section 7 - AI System Quality',
    'Section 8 - AI Operational Control',
    'Section 9 - Performance Monitoring',
  ],
  UFLPA: [
    'Supply Chain Traceability',
    'Xinjiang Entity Screening',
    'Forced Labor Due Diligence',
    'Audit & Documentation',
    'Corrective Action Plans',
  ],
  EU_SUPPLY_CHAIN_ACT: [
    'Human Rights Due Diligence',
    'Environmental Due Diligence',
    'Complaint Mechanism',
    'Supplier Mapping',
    'Risk Assessment',
  ],
  ITAR: [
    'Registration & Licensing',
    'Export Authorization',
    'Technical Data Controls',
    'Manufacturing Authorizations',
    'End-Use Monitoring',
  ],
  EAR: [
    'Classification Review',
    'License Determination',
    'Customer Screening',
    'Record Keeping',
    'Compliance Program',
  ],
  REACH: [
    'Substance Registration',
    'Hazard Assessment',
    'Supply Chain Communication',
    'SVHC Management',
    'Restriction Compliance',
  ],
  RoHS: [
    'Restricted Substance Verification',
    'Technical Documentation',
    'Declaration of Conformity',
    'Supply Chain Assessment',
  ],
  CMMC: [
    'Access Control',
    'Audit & Accountability',
    'Configuration Management',
    'Incident Response',
    'System & Communications Protection',
  ],
};

export async function generateComplianceReport(rawInput: unknown): Promise<Record<string, unknown>> {
  // 1. Validate inputs
  const parseResult = generateComplianceReportSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: 'Validation failed',
      details: parseResult.error.flatten(),
    };
  }

  const input: GenerateReportInput = parseResult.data;

  try {
    const now = new Date().toISOString();
    const sections = input.sections ?? FRAMEWORK_SECTIONS[input.framework] ?? ['General Compliance'];

    // 2. Gather PDOs in period
    const { data: pdoData } = await supabase
      .from('pdos')
      .select('id, decision_result, proof_type, confidence_score, created_at, model_id, outcome_action')
      .eq('pilot_id', input.pilot_id)
      .eq('facility_id', input.facility_id)
      .gte('created_at', input.period_start)
      .lte('created_at', input.period_end);

    const pdos = (pdoData ?? []) as Array<{
      id: string;
      decision_result: string;
      proof_type: string;
      confidence_score: number;
      created_at: string;
      model_id: string | null;
      outcome_action: string;
    }>;

    // 3. Gather SCAMs in period
    const { data: scramData } = await supabase
      .from('scram_events')
      .select('id, severity, status, trigger_reason, triggered_at, resolved_at')
      .eq('pilot_id', input.pilot_id)
      .eq('facility_id', input.facility_id)
      .gte('triggered_at', input.period_start)
      .lte('triggered_at', input.period_end);

    const scrams = (scramData ?? []) as Array<{
      id: string;
      severity: string;
      status: string;
      trigger_reason: string;
      triggered_at: string;
      resolved_at: string | null;
    }>;

    // 4. Gather entity screenings
    const screeningPDOs = pdos.filter((p) => p.proof_type === 'entity_screening');
    const screeningFailures = screeningPDOs.filter(
      (p) => p.decision_result === 'fail' || p.decision_result === 'quarantine'
    );

    // 5. Gather drift events
    const { data: driftData } = await supabase
      .from('drift_events')
      .select('model_id, drift_score, severity, detected_at')
      .eq('pilot_id', input.pilot_id)
      .gte('detected_at', input.period_start)
      .lte('detected_at', input.period_end);

    const driftEvents = (driftData ?? []) as Array<{
      model_id: string;
      drift_score: number;
      severity: string;
      detected_at: string;
    }>;

    // 6. Compute summary statistics
    const totalPDOs = pdos.length;
    const passRate = totalPDOs > 0
      ? pdos.filter((p) => p.decision_result === 'pass').length / totalPDOs
      : 0;
    const failRate = totalPDOs > 0
      ? pdos.filter((p) => p.decision_result === 'fail').length / totalPDOs
      : 0;
    const avgConfidence =
      totalPDOs > 0
        ? pdos.reduce((s, p) => s + (p.confidence_score ?? 0), 0) / totalPDOs
        : 0;

    const reportData: Record<string, unknown> = {
      pilot_id: input.pilot_id,
      facility_id: input.facility_id,
      framework: input.framework,
      period_start: input.period_start,
      period_end: input.period_end,
      total_pdos: totalPDOs,
      pass_rate: passRate,
      fail_rate: failRate,
      avg_confidence: avgConfidence,
      scram_count: scrams.length,
      open_scrams: scrams.filter((s) => s.status !== 'resolved' && s.status !== 'false_positive').length,
      critical_scrams: scrams.filter((s) => s.severity === 'P0_CRITICAL').length,
      entity_screenings: screeningPDOs.length,
      screening_failures: screeningFailures.length,
      drift_events: driftEvents.length,
      critical_drift_events: driftEvents.filter((d) => d.severity === 'critical' || d.severity === 'high').length,
    };

    // 7. Use Claude to map to regulatory articles and structure the report
    const claudeResult = await claudeGenerateReport(reportData, input.framework, sections);

    const compliance_percentage =
      typeof claudeResult.compliance_percentage === 'number'
        ? claudeResult.compliance_percentage
        : calculateFallbackScore(passRate, failRate, scrams.length, avgConfidence);

    const grade = scoreToGrade(compliance_percentage);

    // 8. Return structured report
    const report = {
      id: generateReportId(),
      pilot_id: input.pilot_id,
      facility_id: input.facility_id,
      framework: input.framework,
      report_period_start: input.period_start,
      report_period_end: input.period_end,
      overall_score: compliance_percentage,
      grade,
      sections: claudeResult.sections ?? {},
      gaps: claudeResult.gaps ?? [],
      recommendations: claudeResult.recommendations ?? [],
      evidence_summary: {
        total_pdos: totalPDOs,
        pass_rate: parseFloat(passRate.toFixed(4)),
        fail_rate: parseFloat(failRate.toFixed(4)),
        avg_confidence: parseFloat(avgConfidence.toFixed(4)),
        scram_events: scrams.length,
        entity_screenings: screeningPDOs.length,
        drift_events: driftEvents.length,
      },
      generated_by: input.generated_by,
      generated_at: now,
    };

    // Persist report to supabase
    await supabase.from('compliance_reports').insert({
      ...report,
      created_at: now,
    });

    return {
      success: true,
      report,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to generate compliance report: ${message}`,
    };
  }
}

function calculateFallbackScore(
  passRate: number,
  failRate: number,
  scramCount: number,
  avgConfidence: number
): number {
  let score = 100;
  score -= failRate * 40;
  score -= Math.min(20, scramCount * 4);
  if (avgConfidence < 0.9) score -= (0.9 - avgConfidence) * 50;
  return Math.max(0, Math.min(100, parseFloat(score.toFixed(1))));
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function generateReportId(): string {
  return `rpt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
