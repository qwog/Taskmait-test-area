// SCRAM (Safety-Critical Risk and Alert Management) Type Definitions

export type SCRAMSeverity =
  | 'P0_CRITICAL'   // Full production halt, immediate action required
  | 'P1_HIGH'       // Line stop, senior engineer required
  | 'P2_MEDIUM'     // Station halt, engineer required
  | 'P3_LOW';       // Warning, monitor closely

export type SCRAMStatus =
  | 'triggered'
  | 'acknowledged'
  | 'investigating'
  | 'resolved'
  | 'false_positive'
  | 'cascaded';

export type SCRAMResolution =
  | 'root_cause_fixed'
  | 'workaround_applied'
  | 'false_positive_confirmed'
  | 'process_adjusted'
  | 'equipment_repaired'
  | 'supplier_corrective_action'
  | 'escalated_to_oem';

export type AuthorizationLevel =
  | 'operator'       // Can acknowledge
  | 'engineer'       // Can investigate and resolve P2/P3
  | 'senior_engineer' // Can resolve P1
  | 'plant_manager'  // Can resolve P0
  | 'quality_director' // Can override false positive
  | 'executive';     // Full authority

export interface TrinityGate {
  // Three independent authorizations required for SCRAM resolution
  authorizer_1: {
    id: string;
    role: AuthorizationLevel;
    authorized_at: string;
    signature?: string;
  };
  authorizer_2: {
    id: string;
    role: AuthorizationLevel;
    authorized_at: string;
    signature?: string;
  };
  authorizer_3: {
    id: string;
    role: AuthorizationLevel;
    authorized_at: string;
    signature?: string;
  };
  quorum_achieved_at: string;
}

export interface SCRAMEvent {
  id: string; // UUID
  facility_id: string;
  pilot_id: string;
  line_id: string;
  station_id?: string;
  severity: SCRAMSeverity;
  status: SCRAMStatus;
  trigger_pdo_id?: string;
  trigger_model_id?: string;
  trigger_reason: string;
  affected_stations: string[];
  cascade_targets?: Array<{
    facility_id: string;
    line_id: string;
    scram_id: string;
  }>;
  trinity_gate?: TrinityGate;
  resolution?: SCRAMResolution;
  resolution_pdo_id?: string;
  resolution_notes?: string;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_by?: string;
  resolved_at?: string;
  triggered_at: string; // ISO 8601
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface SCRAMCreateInput {
  facility_id: string;
  pilot_id: string;
  line_id: string;
  station_id?: string;
  severity: SCRAMSeverity;
  trigger_pdo_id?: string;
  trigger_model_id?: string;
  trigger_reason: string;
  cascade?: boolean;
  metadata?: Record<string, unknown>;
}

export interface SCRAMResolveInput {
  scram_id: string;
  resolution: SCRAMResolution;
  resolution_notes: string;
  trinity_gate: TrinityGate;
  resolved_by: string;
}
