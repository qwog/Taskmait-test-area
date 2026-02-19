// PDO (Proof-Decision-Outcome) Type Definitions

export type ProofType =
  | 'sensor_reading'
  | 'vision_inspection'
  | 'dimensional_measurement'
  | 'torque_verification'
  | 'weld_quality'
  | 'material_certification'
  | 'supplier_attestation'
  | 'human_verification'
  | 'ai_inference'
  | 'regulatory_check'
  | 'entity_screening'
  | 'model_registration'
  | 'scram_resolution';

export type DecisionResult =
  | 'pass'
  | 'fail'
  | 'quarantine'
  | 'escalate'
  | 'defer'
  | 'override_approved'
  | 'override_rejected';

export type OutcomeAction =
  | 'approve'
  | 'reject'
  | 'hold'
  | 'rework'
  | 'scrap'
  | 'escalate_to_human'
  | 'trigger_scram'
  | 'notify_supplier'
  | 'log_only'
  | 'release_hold';

export type PilotId =
  | 'magna'
  | 'roush'
  | 'l_and_l'
  | 'adac'
  | 'corridor';

export interface PDOProof {
  type: ProofType;
  source_system: string;
  raw_value: unknown;
  unit?: string;
  confidence_score: number; // 0.0 - 1.0
  measurement_timestamp: string; // ISO 8601
  equipment_id?: string;
  operator_id?: string;
  calibration_due?: string;
  attachments?: Array<{
    type: 'image' | 'document' | 'video' | 'sensor_log';
    url: string;
    hash?: string;
  }>;
}

export interface PDODecision {
  result: DecisionResult;
  model_id?: string;
  model_version?: string;
  rule_id?: string;
  threshold_used?: number;
  confidence_score?: number;
  reasoning?: string;
  human_reviewer_id?: string;
  reviewed_at?: string;
  override_justification?: string;
}

export interface PDOOutcome {
  action: OutcomeAction;
  station_id: string;
  line_id: string;
  part_number?: string;
  serial_number?: string;
  batch_number?: string;
  downstream_notified?: boolean;
  scram_triggered?: boolean;
  scram_id?: string;
  notes?: string;
  regulatory_flags?: string[];
}

export interface PDOMetadata {
  pilot_id: PilotId;
  facility_id: string;
  created_by: string; // agent or human ID
  schema_version: string;
  regulatory_frameworks?: string[];
  tags?: string[];
  retention_until?: string; // ISO 8601
}

export interface PDO {
  id: string; // UUID
  hash: string; // SHA-256 of proof+decision+outcome
  proof: PDOProof;
  decision: PDODecision;
  outcome: PDOOutcome;
  metadata: PDOMetadata;
  parent_pdo_id?: string;
  chain_root_id?: string;
  chain_position?: number;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export interface PDOCreateInput {
  proof: PDOProof;
  decision: PDODecision;
  outcome: PDOOutcome;
  metadata: PDOMetadata;
  parent_pdo_id?: string;
}

export interface PDOChainEntry {
  pdo_id: string;
  hash: string;
  chain_position: number;
  decision_result: DecisionResult;
  outcome_action: OutcomeAction;
  created_at: string;
  proof_type: ProofType;
  confidence_score: number;
}
