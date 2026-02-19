// Pilot Configuration Type Definitions

export interface PilotConfig {
  id: string;
  name: string;
  description: string;
  facility_ids: string[];
  regulatory_frameworks: string[];
  scram_cascade_enabled: boolean;
  trinity_gate_required_severity: string[];
  drift_tolerance: number; // 0.0 - 1.0
  compliance_thresholds: Record<string, number>; // framework -> min score
  ai_models: string[];
  supply_chain_depth: number; // tiers
  data_residency: string; // 'us' | 'eu' | 'global'
  audit_retention_days: number;
  contact: {
    primary: string;
    escalation: string;
  };
}

export const PILOT_CONFIGS: Record<string, PilotConfig> = {
  magna: {
    id: 'magna',
    name: 'Magna International',
    description: 'Tier-1 automotive supplier — body & chassis systems',
    facility_ids: ['magna-ontario-001', 'magna-mexico-001', 'magna-germany-001'],
    regulatory_frameworks: ['IATF_16949', 'EU_AI_ACT', 'ISO_PAS_8800', 'REACH', 'RoHS'],
    scram_cascade_enabled: true,
    trinity_gate_required_severity: ['P0_CRITICAL', 'P1_HIGH'],
    drift_tolerance: 0.05,
    compliance_thresholds: {
      IATF_16949: 90,
      EU_AI_ACT: 85,
      ISO_PAS_8800: 80,
    },
    ai_models: ['magna-vision-v2', 'magna-torque-v1', 'magna-weld-v3'],
    supply_chain_depth: 3,
    data_residency: 'global',
    audit_retention_days: 2555, // 7 years
    contact: {
      primary: 'quality.ops@magna.com',
      escalation: 'vp.quality@magna.com',
    },
  },
  roush: {
    id: 'roush',
    name: 'Roush Industries',
    description: 'Specialty vehicle & performance engineering',
    facility_ids: ['roush-livonia-001', 'roush-livonia-002'],
    regulatory_frameworks: ['IATF_16949', 'ITAR', 'EAR', 'ISO_PAS_8800'],
    scram_cascade_enabled: true,
    trinity_gate_required_severity: ['P0_CRITICAL', 'P1_HIGH', 'P2_MEDIUM'],
    drift_tolerance: 0.03,
    compliance_thresholds: {
      IATF_16949: 95,
      ITAR: 100,
      EAR: 100,
      ISO_PAS_8800: 85,
    },
    ai_models: ['roush-inspect-v1', 'roush-perf-v2'],
    supply_chain_depth: 2,
    data_residency: 'us',
    audit_retention_days: 3650, // 10 years (ITAR requirement)
    contact: {
      primary: 'quality@roush.com',
      escalation: 'compliance@roush.com',
    },
  },
  l_and_l: {
    id: 'l_and_l',
    name: 'L&L Products',
    description: 'Specialty sealing, acoustic & thermal management systems',
    facility_ids: ['ll-romeo-001', 'll-germany-001'],
    regulatory_frameworks: ['IATF_16949', 'REACH', 'RoHS', 'EU_SUPPLY_CHAIN_ACT'],
    scram_cascade_enabled: false,
    trinity_gate_required_severity: ['P0_CRITICAL'],
    drift_tolerance: 0.08,
    compliance_thresholds: {
      IATF_16949: 85,
      REACH: 90,
      RoHS: 90,
    },
    ai_models: ['ll-seal-inspect-v1'],
    supply_chain_depth: 4,
    data_residency: 'eu',
    audit_retention_days: 1825, // 5 years
    contact: {
      primary: 'quality@llproducts.com',
      escalation: 'director.quality@llproducts.com',
    },
  },
  adac: {
    id: 'adac',
    name: 'ADAC Automotive',
    description: 'Door handle & access systems — high-volume stamping',
    facility_ids: ['adac-muskegon-001', 'adac-muskegon-002'],
    regulatory_frameworks: ['IATF_16949', 'UFLPA', 'ISO_PAS_8800'],
    scram_cascade_enabled: true,
    trinity_gate_required_severity: ['P0_CRITICAL', 'P1_HIGH'],
    drift_tolerance: 0.05,
    compliance_thresholds: {
      IATF_16949: 90,
      UFLPA: 100,
      ISO_PAS_8800: 80,
    },
    ai_models: ['adac-stamp-v1', 'adac-assembly-v2'],
    supply_chain_depth: 3,
    data_residency: 'us',
    audit_retention_days: 2190, // 6 years
    contact: {
      primary: 'quality@adac-auto.com',
      escalation: 'vp.operations@adac-auto.com',
    },
  },
  corridor: {
    id: 'corridor',
    name: 'Corridor Industrial',
    description: 'EV battery pack assembly & testing',
    facility_ids: ['corridor-detroit-001'],
    regulatory_frameworks: ['IATF_16949', 'EU_AI_ACT', 'ISO_PAS_8800', 'UFLPA', 'REACH'],
    scram_cascade_enabled: true,
    trinity_gate_required_severity: ['P0_CRITICAL', 'P1_HIGH'],
    drift_tolerance: 0.02, // tightest tolerance — safety critical
    compliance_thresholds: {
      IATF_16949: 95,
      EU_AI_ACT: 90,
      ISO_PAS_8800: 90,
      UFLPA: 100,
    },
    ai_models: ['corridor-cell-inspect-v1', 'corridor-bms-v1', 'corridor-thermal-v1'],
    supply_chain_depth: 5,
    data_residency: 'us',
    audit_retention_days: 3650, // 10 years — EV battery safety
    contact: {
      primary: 'quality@corridorind.com',
      escalation: 'cto@corridorind.com',
    },
  },
};
