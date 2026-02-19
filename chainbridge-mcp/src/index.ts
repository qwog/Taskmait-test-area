import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { createPDO } from './tools/create-pdo.js';
import { triggerScramTool } from './tools/trigger-scram.js';
import { resolveScram } from './tools/resolve-scram.js';
import { checkDrift } from './tools/check-drift.js';
import { screenEntity } from './tools/screen-entity.js';
import { getAuditTrail } from './tools/get-audit-trail.js';
import { getComplianceDashboard } from './tools/get-compliance-dashboard.js';
import { registerAIModel } from './tools/register-ai-model.js';
import { generateComplianceReport } from './tools/generate-compliance-report.js';
import { linkSupplyChain } from './tools/link-supply-chain.js';

// ─── Tool Definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'create_pdo',
    description:
      'Create a Proof-Decision-Outcome (PDO) record — the atomic audit unit of ChainBridge. Records a quality or compliance decision with its evidence (proof) and action taken (outcome). Generates a SHA-256 hash for tamper-evidence. Automatically evaluates SCRAM trigger rules for fail/quarantine decisions.',
    inputSchema: {
      type: 'object',
      properties: {
        proof: {
          type: 'object',
          description: 'The evidence/measurement that informed the decision',
          properties: {
            type: { type: 'string', enum: ['sensor_reading', 'vision_inspection', 'dimensional_measurement', 'torque_verification', 'weld_quality', 'material_certification', 'supplier_attestation', 'human_verification', 'ai_inference', 'regulatory_check', 'entity_screening', 'model_registration', 'scram_resolution'] },
            source_system: { type: 'string' },
            raw_value: {},
            unit: { type: 'string' },
            confidence_score: { type: 'number', minimum: 0, maximum: 1 },
            measurement_timestamp: { type: 'string' },
            equipment_id: { type: 'string' },
            operator_id: { type: 'string' },
          },
          required: ['type', 'source_system', 'raw_value', 'confidence_score', 'measurement_timestamp'],
        },
        decision: {
          type: 'object',
          description: 'The decision made based on the proof',
          properties: {
            result: { type: 'string', enum: ['pass', 'fail', 'quarantine', 'escalate', 'defer', 'override_approved', 'override_rejected'] },
            model_id: { type: 'string' },
            model_version: { type: 'string' },
            rule_id: { type: 'string' },
            confidence_score: { type: 'number', minimum: 0, maximum: 1 },
            reasoning: { type: 'string' },
            human_reviewer_id: { type: 'string' },
          },
          required: ['result'],
        },
        outcome: {
          type: 'object',
          description: 'The action taken as a result of the decision',
          properties: {
            action: { type: 'string', enum: ['approve', 'reject', 'hold', 'rework', 'scrap', 'escalate_to_human', 'trigger_scram', 'notify_supplier', 'log_only', 'release_hold'] },
            station_id: { type: 'string' },
            line_id: { type: 'string' },
            part_number: { type: 'string' },
            serial_number: { type: 'string' },
            batch_number: { type: 'string' },
            notes: { type: 'string' },
          },
          required: ['action', 'station_id', 'line_id'],
        },
        metadata: {
          type: 'object',
          properties: {
            pilot_id: { type: 'string', enum: ['magna', 'roush', 'l_and_l', 'adac', 'corridor'] },
            facility_id: { type: 'string' },
            created_by: { type: 'string' },
            schema_version: { type: 'string' },
            regulatory_frameworks: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
          },
          required: ['pilot_id', 'facility_id', 'created_by'],
        },
        parent_pdo_id: { type: 'string', description: 'UUID of parent PDO for chain linking' },
      },
      required: ['proof', 'decision', 'outcome', 'metadata'],
    },
  },
  {
    name: 'trigger_scram',
    description:
      'Trigger a SCRAM (Safety-Critical Risk and Alert Management) event. Immediately halts production at the specified facility/line. Writes to Redis for instant circuit-breaking, then persists to Supabase. Supports cascade propagation to downstream supply chain partners.',
    inputSchema: {
      type: 'object',
      properties: {
        facility_id: { type: 'string', description: 'Facility where SCRAM is triggered' },
        pilot_id: { type: 'string', enum: ['magna', 'roush', 'l_and_l', 'adac', 'corridor'] },
        line_id: { type: 'string', description: 'Production line ID' },
        station_id: { type: 'string', description: 'Specific station (optional)' },
        severity: { type: 'string', enum: ['P0_CRITICAL', 'P1_HIGH', 'P2_MEDIUM', 'P3_LOW'], description: 'P0=Full halt, P1=Line stop, P2=Station halt, P3=Warning' },
        trigger_pdo_id: { type: 'string', description: 'PDO UUID that triggered this SCRAM' },
        trigger_model_id: { type: 'string', description: 'AI model that triggered this SCRAM' },
        trigger_reason: { type: 'string', description: 'Human-readable reason (min 10 chars)' },
        cascade: { type: 'boolean', default: false, description: 'Propagate to downstream supply chain' },
        metadata: { type: 'object' },
      },
      required: ['facility_id', 'pilot_id', 'line_id', 'severity', 'trigger_reason'],
    },
  },
  {
    name: 'resolve_scram',
    description:
      'Resolve an active SCRAM event. Requires Trinity Gate authorization — 3 distinct human authorizers with appropriate roles. Clears Redis circuit-breaker state, updates Supabase record, and creates a resolution PDO for audit trail.',
    inputSchema: {
      type: 'object',
      properties: {
        scram_id: { type: 'string', description: 'UUID of the SCRAM to resolve' },
        resolution: { type: 'string', enum: ['root_cause_fixed', 'workaround_applied', 'false_positive_confirmed', 'process_adjusted', 'equipment_repaired', 'supplier_corrective_action', 'escalated_to_oem'] },
        resolution_notes: { type: 'string', description: 'Detailed resolution notes (min 20 chars)' },
        trinity_gate: {
          type: 'object',
          description: 'Three independent authorizations',
          properties: {
            authorizer_1: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                role: { type: 'string', enum: ['operator', 'engineer', 'senior_engineer', 'plant_manager', 'quality_director', 'executive'] },
                authorized_at: { type: 'string' },
              },
              required: ['id', 'role', 'authorized_at'],
            },
            authorizer_2: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                role: { type: 'string', enum: ['operator', 'engineer', 'senior_engineer', 'plant_manager', 'quality_director', 'executive'] },
                authorized_at: { type: 'string' },
              },
              required: ['id', 'role', 'authorized_at'],
            },
            authorizer_3: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                role: { type: 'string', enum: ['operator', 'engineer', 'senior_engineer', 'plant_manager', 'quality_director', 'executive'] },
                authorized_at: { type: 'string' },
              },
              required: ['id', 'role', 'authorized_at'],
            },
            quorum_achieved_at: { type: 'string' },
          },
          required: ['authorizer_1', 'authorizer_2', 'authorizer_3', 'quorum_achieved_at'],
        },
        resolved_by: { type: 'string', description: 'ID of person recording the resolution' },
      },
      required: ['scram_id', 'resolution', 'resolution_notes', 'trinity_gate', 'resolved_by'],
    },
  },
  {
    name: 'check_drift',
    description:
      'Check an AI model for statistical drift compared to its registered baseline. Analyzes confidence score distributions, decision patterns, and temporal trends. Uses Claude for plain-English assessment and actionable recommendations.',
    inputSchema: {
      type: 'object',
      properties: {
        model_id: { type: 'string', description: 'AI model ID to check' },
        pilot_id: { type: 'string', enum: ['magna', 'roush', 'l_and_l', 'adac', 'corridor'] },
        facility_id: { type: 'string' },
        time_window_hours: { type: 'number', minimum: 1, maximum: 720, default: 24, description: 'Hours to look back' },
        include_assessment: { type: 'boolean', default: true, description: 'Include Claude AI assessment' },
      },
      required: ['model_id', 'pilot_id', 'facility_id'],
    },
  },
  {
    name: 'screen_entity',
    description:
      'Screen a supply chain entity (supplier, carrier, individual) against trade compliance and sanctions lists including UFLPA, EU Sanctions, OFAC SDN, BIS Entity List, and ITAR Debarred. Creates a screening PDO and returns risk level with matches.',
    inputSchema: {
      type: 'object',
      properties: {
        entity_name: { type: 'string', description: 'Full legal name of entity to screen' },
        entity_type: { type: 'string', enum: ['supplier', 'customer', 'carrier', 'individual', 'organization'] },
        country_of_origin: { type: 'string', description: 'ISO country code or full name' },
        screening_lists: {
          type: 'array',
          items: { type: 'string', enum: ['UFLPA', 'EU_SANCTIONS', 'OFAC_SDN', 'BIS_ENTITY_LIST', 'ITAR_DEBARRED', 'EU_SUPPLY_CHAIN_ACT'] },
          default: ['UFLPA', 'EU_SANCTIONS', 'OFAC_SDN', 'BIS_ENTITY_LIST'],
        },
        pilot_id: { type: 'string', enum: ['magna', 'roush', 'l_and_l', 'adac', 'corridor'] },
        facility_id: { type: 'string' },
        requested_by: { type: 'string', description: 'Agent or user requesting the screen' },
      },
      required: ['entity_name', 'entity_type', 'pilot_id', 'facility_id', 'requested_by'],
    },
  },
  {
    name: 'get_audit_trail',
    description:
      'Query the PDO audit trail with rich filtering options. Supports single PDO lookup, chain traversal (follow parent_pdo_id links), and filtered queries by facility, station, model, date range, etc. Can verify SHA-256 hash integrity of each record. Formats output for full detail, summary, or regulatory compliance.',
    inputSchema: {
      type: 'object',
      properties: {
        pilot_id: { type: 'string', enum: ['magna', 'roush', 'l_and_l', 'adac', 'corridor'] },
        facility_id: { type: 'string' },
        station_id: { type: 'string' },
        line_id: { type: 'string' },
        model_id: { type: 'string' },
        chain_root_id: { type: 'string', description: 'UUID — traverse full PDO chain' },
        pdo_id: { type: 'string', description: 'UUID — look up a single PDO' },
        decision_result: { type: 'string', enum: ['pass', 'fail', 'quarantine', 'escalate', 'defer', 'override_approved', 'override_rejected'] },
        proof_type: { type: 'string' },
        from_date: { type: 'string', description: 'ISO 8601 start date' },
        to_date: { type: 'string', description: 'ISO 8601 end date' },
        limit: { type: 'number', minimum: 1, maximum: 500, default: 50 },
        offset: { type: 'number', minimum: 0, default: 0 },
        format: { type: 'string', enum: ['full', 'summary', 'regulatory'], default: 'full' },
        verify_hashes: { type: 'boolean', default: false, description: 'Verify SHA-256 integrity' },
      },
    },
  },
  {
    name: 'get_compliance_dashboard',
    description:
      'Get a real-time compliance dashboard for a pilot. Aggregates PDO pass/fail rates, SCRAM counts, AI model health, entity screening results, and calculates framework-specific compliance scores. Optionally generates an executive summary via Claude.',
    inputSchema: {
      type: 'object',
      properties: {
        pilot_id: { type: 'string', enum: ['magna', 'roush', 'l_and_l', 'adac', 'corridor'] },
        facility_id: { type: 'string', description: 'Filter to specific facility (optional)' },
        frameworks: {
          type: 'array',
          items: { type: 'string', enum: ['EU_AI_ACT', 'IATF_16949', 'ISO_PAS_8800', 'UFLPA', 'EU_SUPPLY_CHAIN_ACT', 'REACH', 'RoHS', 'ITAR', 'EAR', 'CMMC'] },
          description: 'Frameworks to assess (defaults to pilot config)',
        },
        period_days: { type: 'number', minimum: 1, maximum: 365, default: 30 },
        include_executive_summary: { type: 'boolean', default: true },
      },
      required: ['pilot_id'],
    },
  },
  {
    name: 'register_ai_model',
    description:
      'Register a new AI model with the ChainBridge constitutional control plane. Creates the model record with baseline metrics, drift tolerance, and confidence thresholds. Generates constitutional operating rules via Claude and creates a registration PDO for audit purposes.',
    inputSchema: {
      type: 'object',
      properties: {
        model_id: { type: 'string', description: 'Unique identifier for the model' },
        model_name: { type: 'string' },
        model_version: { type: 'string' },
        model_type: { type: 'string', enum: ['vision_inspection', 'dimensional_analysis', 'predictive_quality', 'anomaly_detection', 'natural_language', 'process_optimization', 'risk_classification'] },
        pilot_id: { type: 'string', enum: ['magna', 'roush', 'l_and_l', 'adac', 'corridor'] },
        facility_ids: { type: 'array', items: { type: 'string' }, description: 'Facilities where model is deployed' },
        regulatory_frameworks: { type: 'array', items: { type: 'string' }, description: 'Applicable regulatory frameworks' },
        drift_tolerance: { type: 'number', minimum: 0, maximum: 1, default: 0.05 },
        confidence_threshold: { type: 'number', minimum: 0, maximum: 1, default: 0.85 },
        registered_by: { type: 'string' },
        vendor: { type: 'string' },
        description: { type: 'string' },
        baseline_metrics: {
          type: 'object',
          properties: {
            mean_confidence: { type: 'number' },
            fail_rate: { type: 'number' },
            pass_rate: { type: 'number' },
            quarantine_rate: { type: 'number' },
          },
        },
      },
      required: ['model_id', 'model_name', 'model_version', 'model_type', 'pilot_id', 'facility_ids', 'regulatory_frameworks', 'registered_by'],
    },
  },
  {
    name: 'generate_compliance_report',
    description:
      'Generate a structured compliance report for a specific regulatory framework. Gathers PDOs, SCAMs, drift events, and entity screenings, then uses Claude to map findings to regulatory articles. Returns a comprehensive report with section assessments, gaps, and recommendations.',
    inputSchema: {
      type: 'object',
      properties: {
        pilot_id: { type: 'string', enum: ['magna', 'roush', 'l_and_l', 'adac', 'corridor'] },
        facility_id: { type: 'string' },
        framework: { type: 'string', enum: ['EU_AI_ACT', 'IATF_16949', 'ISO_PAS_8800', 'UFLPA', 'EU_SUPPLY_CHAIN_ACT', 'REACH', 'RoHS', 'ITAR', 'EAR', 'CMMC'] },
        period_start: { type: 'string', description: 'ISO 8601 start date' },
        period_end: { type: 'string', description: 'ISO 8601 end date' },
        sections: { type: 'array', items: { type: 'string' }, description: 'Specific sections to cover (defaults to framework standard sections)' },
        generated_by: { type: 'string' },
      },
      required: ['pilot_id', 'facility_id', 'framework', 'period_start', 'period_end', 'generated_by'],
    },
  },
  {
    name: 'link_supply_chain',
    description:
      'Establish a supply chain link between two facilities. Configures SCRAM cascade rules so that safety events propagate appropriately through the supply chain. Analyzes regulatory framework alignment between source and target.',
    inputSchema: {
      type: 'object',
      properties: {
        source_facility_id: { type: 'string' },
        source_pilot_id: { type: 'string', enum: ['magna', 'roush', 'l_and_l', 'adac', 'corridor'] },
        target_facility_id: { type: 'string' },
        target_pilot_id: { type: 'string', enum: ['magna', 'roush', 'l_and_l', 'adac', 'corridor'] },
        link_type: { type: 'string', enum: ['tier1_to_oem', 'tier2_to_tier1', 'tier3_to_tier2', 'logistics', 'co_manufacturer'] },
        parts: { type: 'array', items: { type: 'string' }, description: 'Part numbers flowing this link' },
        scram_cascade_enabled: { type: 'boolean', default: true },
        cascade_severity_threshold: { type: 'string', enum: ['P0_CRITICAL', 'P1_HIGH', 'P2_MEDIUM', 'P3_LOW'], default: 'P1_HIGH' },
        created_by: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['source_facility_id', 'source_pilot_id', 'target_facility_id', 'target_pilot_id', 'link_type', 'created_by'],
    },
  },
];

// ─── Server Setup ─────────────────────────────────────────────────────────────

const server = new Server(
  {
    name: 'chainbridge-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ─── List Tools Handler ───────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// ─── Call Tool Handler ────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  let result: Record<string, unknown>;

  try {
    switch (name) {
      case 'create_pdo':
        result = await createPDO(args);
        break;

      case 'trigger_scram':
        result = await triggerScramTool(args);
        break;

      case 'resolve_scram':
        result = await resolveScram(args);
        break;

      case 'check_drift':
        result = await checkDrift(args);
        break;

      case 'screen_entity':
        result = await screenEntity(args);
        break;

      case 'get_audit_trail':
        result = await getAuditTrail(args);
        break;

      case 'get_compliance_dashboard':
        result = await getComplianceDashboard(args);
        break;

      case 'register_ai_model':
        result = await registerAIModel(args);
        break;

      case 'generate_compliance_report':
        result = await generateComplianceReport(args);
        break;

      case 'link_supply_chain':
        result = await linkSupplyChain(args);
        break;

      default:
        result = { success: false, error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result = {
      success: false,
      error: `Tool execution failed: ${message}`,
      tool: name,
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
});

// ─── Start Server ─────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ChainBridge MCP server running on stdio');
}

main().catch((err) => {
  console.error('Fatal error starting ChainBridge MCP server:', err);
  process.exit(1);
});
