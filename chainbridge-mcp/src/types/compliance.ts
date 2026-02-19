// Compliance Type Definitions

export type RegulatoryFramework =
  | 'EU_AI_ACT'
  | 'IATF_16949'
  | 'ISO_PAS_8800'
  | 'UFLPA'
  | 'EU_SUPPLY_CHAIN_ACT'
  | 'REACH'
  | 'RoHS'
  | 'ITAR'
  | 'EAR'
  | 'CMMC';

export interface ComplianceScore {
  framework: RegulatoryFramework;
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  passing: boolean;
  threshold: number; // minimum passing score
  last_assessed: string; // ISO 8601
  assessment_pdo_id?: string;
  gaps: string[];
  controls_passed: number;
  controls_total: number;
}

export interface ComplianceReport {
  id: string;
  pilot_id: string;
  facility_id: string;
  framework: RegulatoryFramework;
  report_period_start: string;
  report_period_end: string;
  overall_score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  sections: Record<string, {
    status: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';
    score: number;
    findings: string[];
    evidence_pdos: string[];
    notes?: string;
  }>;
  gaps: Array<{
    article_ref: string;
    description: string;
    severity: 'critical' | 'major' | 'minor' | 'observation';
    remediation_timeline?: string;
  }>;
  recommendations: string[];
  executive_summary: string;
  generated_by: string;
  generated_at: string;
  approved_by?: string;
  approved_at?: string;
}

export interface EntityScreeningResult {
  entity_name: string;
  entity_type: 'supplier' | 'customer' | 'carrier' | 'individual' | 'organization';
  country_of_origin?: string;
  screening_lists_checked: RegulatoryFramework[];
  risk_level: 'clear' | 'low' | 'medium' | 'high' | 'blocked';
  matches: Array<{
    list: string;
    match_type: 'exact' | 'partial' | 'fuzzy';
    matched_name: string;
    confidence: number;
    entry_reference?: string;
    reason?: string;
  }>;
  screening_pdo_id?: string;
  screened_at: string;
  next_screening_due?: string;
  override_allowed: boolean;
  override_authority?: string;
}

export interface DriftMetrics {
  model_id: string;
  time_window_hours: number;
  sample_count: number;
  metrics: {
    mean_confidence: number;
    std_confidence: number;
    p95_confidence: number;
    p5_confidence: number;
    fail_rate: number;
    quarantine_rate: number;
    pass_rate: number;
    mean_inference_ms?: number;
  };
  baseline_metrics: {
    mean_confidence: number;
    std_confidence: number;
    fail_rate: number;
    quarantine_rate: number;
    pass_rate: number;
  };
  drift_detected: boolean;
  drift_score: number; // 0.0 - 1.0, higher = more drift
  drift_dimensions: {
    confidence_drift: number;
    decision_drift: number;
    temporal_drift: number;
  };
}

export interface DriftAssessment {
  model_id: string;
  drift_metrics: DriftMetrics;
  assessment: string; // Claude-generated
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  scram_recommended: boolean;
  assessed_at: string;
}
