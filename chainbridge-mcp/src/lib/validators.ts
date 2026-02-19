import { z } from 'zod';

// ─── PDO Sub-schemas ────────────────────────────────────────────────────────

const ProofTypeSchema = z.enum([
  'sensor_reading',
  'vision_inspection',
  'dimensional_measurement',
  'torque_verification',
  'weld_quality',
  'material_certification',
  'supplier_attestation',
  'human_verification',
  'ai_inference',
  'regulatory_check',
  'entity_screening',
  'model_registration',
  'scram_resolution',
]);

const DecisionResultSchema = z.enum([
  'pass',
  'fail',
  'quarantine',
  'escalate',
  'defer',
  'override_approved',
  'override_rejected',
]);

const OutcomeActionSchema = z.enum([
  'approve',
  'reject',
  'hold',
  'rework',
  'scrap',
  'escalate_to_human',
  'trigger_scram',
  'notify_supplier',
  'log_only',
  'release_hold',
]);

const PilotIdSchema = z.enum(['magna', 'roush', 'l_and_l', 'adac', 'corridor']);

const PDOProofSchema = z.object({
  type: ProofTypeSchema,
  source_system: z.string().min(1),
  raw_value: z.unknown(),
  unit: z.string().optional(),
  confidence_score: z.number().min(0).max(1),
  measurement_timestamp: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)),
  equipment_id: z.string().optional(),
  operator_id: z.string().optional(),
  calibration_due: z.string().optional(),
  attachments: z.array(z.object({
    type: z.enum(['image', 'document', 'video', 'sensor_log']),
    url: z.string().url(),
    hash: z.string().optional(),
  })).optional(),
});

const PDODecisionSchema = z.object({
  result: DecisionResultSchema,
  model_id: z.string().optional(),
  model_version: z.string().optional(),
  rule_id: z.string().optional(),
  threshold_used: z.number().optional(),
  confidence_score: z.number().min(0).max(1).optional(),
  reasoning: z.string().optional(),
  human_reviewer_id: z.string().optional(),
  reviewed_at: z.string().optional(),
  override_justification: z.string().optional(),
});

const PDOOutcomeSchema = z.object({
  action: OutcomeActionSchema,
  station_id: z.string().min(1),
  line_id: z.string().min(1),
  part_number: z.string().optional(),
  serial_number: z.string().optional(),
  batch_number: z.string().optional(),
  downstream_notified: z.boolean().optional(),
  scram_triggered: z.boolean().optional(),
  scram_id: z.string().optional(),
  notes: z.string().optional(),
  regulatory_flags: z.array(z.string()).optional(),
});

const PDOMetadataSchema = z.object({
  pilot_id: PilotIdSchema,
  facility_id: z.string().min(1),
  created_by: z.string().min(1),
  schema_version: z.string().default('1.0.0'),
  regulatory_frameworks: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  retention_until: z.string().optional(),
});

// ─── Tool Schemas ────────────────────────────────────────────────────────────

export const createPDOSchema = z.object({
  proof: PDOProofSchema,
  decision: PDODecisionSchema,
  outcome: PDOOutcomeSchema,
  metadata: PDOMetadataSchema,
  parent_pdo_id: z.string().uuid().optional(),
});

export const triggerSCRAMSchema = z.object({
  facility_id: z.string().min(1),
  pilot_id: PilotIdSchema,
  line_id: z.string().min(1),
  station_id: z.string().optional(),
  severity: z.enum(['P0_CRITICAL', 'P1_HIGH', 'P2_MEDIUM', 'P3_LOW']),
  trigger_pdo_id: z.string().uuid().optional(),
  trigger_model_id: z.string().optional(),
  trigger_reason: z.string().min(10),
  cascade: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional(),
});

const AuthorizationLevelSchema = z.enum([
  'operator',
  'engineer',
  'senior_engineer',
  'plant_manager',
  'quality_director',
  'executive',
]);

const AuthorizerSchema = z.object({
  id: z.string().min(1),
  role: AuthorizationLevelSchema,
  authorized_at: z.string(),
  signature: z.string().optional(),
});

const TrinityGateSchema = z.object({
  authorizer_1: AuthorizerSchema,
  authorizer_2: AuthorizerSchema,
  authorizer_3: AuthorizerSchema,
  quorum_achieved_at: z.string(),
});

export const resolveSCRAMSchema = z.object({
  scram_id: z.string().uuid(),
  resolution: z.enum([
    'root_cause_fixed',
    'workaround_applied',
    'false_positive_confirmed',
    'process_adjusted',
    'equipment_repaired',
    'supplier_corrective_action',
    'escalated_to_oem',
  ]),
  resolution_notes: z.string().min(20),
  trinity_gate: TrinityGateSchema,
  resolved_by: z.string().min(1),
});

export const checkDriftSchema = z.object({
  model_id: z.string().min(1),
  pilot_id: PilotIdSchema,
  facility_id: z.string().min(1),
  time_window_hours: z.number().int().min(1).max(720).default(24),
  include_assessment: z.boolean().default(true),
});

export const screenEntitySchema = z.object({
  entity_name: z.string().min(1),
  entity_type: z.enum(['supplier', 'customer', 'carrier', 'individual', 'organization']),
  country_of_origin: z.string().optional(),
  screening_lists: z.array(z.enum([
    'UFLPA',
    'EU_SANCTIONS',
    'OFAC_SDN',
    'BIS_ENTITY_LIST',
    'ITAR_DEBARRED',
    'EU_SUPPLY_CHAIN_ACT',
  ])).default(['UFLPA', 'EU_SANCTIONS', 'OFAC_SDN', 'BIS_ENTITY_LIST']),
  pilot_id: PilotIdSchema,
  facility_id: z.string().min(1),
  requested_by: z.string().min(1),
});

export const getAuditTrailSchema = z.object({
  pilot_id: PilotIdSchema.optional(),
  facility_id: z.string().optional(),
  station_id: z.string().optional(),
  line_id: z.string().optional(),
  model_id: z.string().optional(),
  chain_root_id: z.string().uuid().optional(),
  pdo_id: z.string().uuid().optional(),
  decision_result: DecisionResultSchema.optional(),
  proof_type: ProofTypeSchema.optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  limit: z.number().int().min(1).max(500).default(50),
  offset: z.number().int().min(0).default(0),
  format: z.enum(['full', 'summary', 'regulatory']).default('full'),
  verify_hashes: z.boolean().default(false),
});

export const getComplianceDashboardSchema = z.object({
  pilot_id: PilotIdSchema,
  facility_id: z.string().optional(),
  frameworks: z.array(z.enum([
    'EU_AI_ACT',
    'IATF_16949',
    'ISO_PAS_8800',
    'UFLPA',
    'EU_SUPPLY_CHAIN_ACT',
    'REACH',
    'RoHS',
    'ITAR',
    'EAR',
    'CMMC',
  ])).optional(),
  period_days: z.number().int().min(1).max(365).default(30),
  include_executive_summary: z.boolean().default(true),
});

export const registerAIModelSchema = z.object({
  model_id: z.string().min(1),
  model_name: z.string().min(1),
  model_version: z.string().min(1),
  model_type: z.enum([
    'vision_inspection',
    'dimensional_analysis',
    'predictive_quality',
    'anomaly_detection',
    'natural_language',
    'process_optimization',
    'risk_classification',
  ]),
  pilot_id: PilotIdSchema,
  facility_ids: z.array(z.string()).min(1),
  regulatory_frameworks: z.array(z.string()).min(1),
  drift_tolerance: z.number().min(0).max(1).default(0.05),
  confidence_threshold: z.number().min(0).max(1).default(0.85),
  registered_by: z.string().min(1),
  vendor: z.string().optional(),
  description: z.string().optional(),
  baseline_metrics: z.object({
    mean_confidence: z.number().min(0).max(1),
    fail_rate: z.number().min(0).max(1),
    pass_rate: z.number().min(0).max(1),
    quarantine_rate: z.number().min(0).max(1),
  }).optional(),
});

export const generateComplianceReportSchema = z.object({
  pilot_id: PilotIdSchema,
  facility_id: z.string().min(1),
  framework: z.enum([
    'EU_AI_ACT',
    'IATF_16949',
    'ISO_PAS_8800',
    'UFLPA',
    'EU_SUPPLY_CHAIN_ACT',
    'REACH',
    'RoHS',
    'ITAR',
    'EAR',
    'CMMC',
  ]),
  period_start: z.string(),
  period_end: z.string(),
  sections: z.array(z.string()).optional(),
  generated_by: z.string().min(1),
});

export const linkSupplyChainSchema = z.object({
  source_facility_id: z.string().min(1),
  source_pilot_id: PilotIdSchema,
  target_facility_id: z.string().min(1),
  target_pilot_id: PilotIdSchema,
  link_type: z.enum(['tier1_to_oem', 'tier2_to_tier1', 'tier3_to_tier2', 'logistics', 'co_manufacturer']),
  parts: z.array(z.string()).optional(),
  scram_cascade_enabled: z.boolean().default(true),
  cascade_severity_threshold: z.enum(['P0_CRITICAL', 'P1_HIGH', 'P2_MEDIUM', 'P3_LOW']).default('P1_HIGH'),
  created_by: z.string().min(1),
  notes: z.string().optional(),
});
