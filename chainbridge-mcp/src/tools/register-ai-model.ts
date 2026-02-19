import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { hashPDO } from '../lib/hash.js';
import { registerAIModelSchema } from '../lib/validators.js';
import { generateConstitutionalRules } from '../lib/claude.js';

type RegisterAIModelInput = z.infer<typeof registerAIModelSchema>;

export async function registerAIModel(rawInput: unknown): Promise<Record<string, unknown>> {
  // 1. Validate inputs
  const parseResult = registerAIModelSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: 'Validation failed',
      details: parseResult.error.flatten(),
    };
  }

  const input: RegisterAIModelInput = parseResult.data;

  try {
    const now = new Date().toISOString();

    // Check if model already registered
    const { data: existing } = await supabase
      .from('ai_models')
      .select('model_id, status')
      .eq('model_id', input.model_id)
      .single();

    if (existing) {
      return {
        success: false,
        error: `AI model ${input.model_id} is already registered. Use update endpoint to modify.`,
        existing_status: (existing as { status: string }).status,
      };
    }

    // 2. Insert into ai_models table
    const modelRecord = {
      model_id: input.model_id,
      model_name: input.model_name,
      model_version: input.model_version,
      model_type: input.model_type,
      pilot_id: input.pilot_id,
      facility_ids: input.facility_ids,
      regulatory_frameworks: input.regulatory_frameworks,
      drift_tolerance: input.drift_tolerance,
      confidence_threshold: input.confidence_threshold,
      registered_by: input.registered_by,
      vendor: input.vendor ?? null,
      description: input.description ?? null,
      status: 'active',
      baseline_metrics: input.baseline_metrics ?? {
        mean_confidence: 0.92,
        fail_rate: 0.02,
        pass_rate: 0.95,
        quarantine_rate: 0.03,
        std_confidence: 0.05,
      },
      constitutional_rules: [],
      registered_at: now,
      created_at: now,
      updated_at: now,
    };

    const { data: modelData, error: modelError } = await supabase
      .from('ai_models')
      .insert(modelRecord)
      .select()
      .single();

    if (modelError) {
      return {
        success: false,
        error: `Failed to register model: ${modelError.message}`,
        code: modelError.code,
      };
    }

    // 3. Generate constitutional rules via Claude
    let constitutionalRules: string[] = [];
    try {
      constitutionalRules = await generateConstitutionalRules(
        input.model_id,
        input.model_type,
        input.pilot_id,
        input.regulatory_frameworks
      );

      // Store rules back to ai_models
      await supabase
        .from('ai_models')
        .update({ constitutional_rules: constitutionalRules })
        .eq('model_id', input.model_id);
    } catch (ruleErr) {
      // Non-fatal — constitutional rules can be generated later
      console.error('Failed to generate constitutional rules:', ruleErr);
      constitutionalRules = getDefaultConstitutionalRules(input.model_type, input.regulatory_frameworks);
    }

    // 4. Create registration PDO
    const regProof = {
      type: 'model_registration' as const,
      source_system: 'chainbridge-mcp',
      raw_value: {
        model_id: input.model_id,
        model_name: input.model_name,
        model_version: input.model_version,
        model_type: input.model_type,
        vendor: input.vendor,
        regulatory_frameworks: input.regulatory_frameworks,
        constitutional_rules_count: constitutionalRules.length,
      },
      confidence_score: 1.0,
      measurement_timestamp: now,
      operator_id: input.registered_by,
    };

    const regDecision = {
      result: 'pass' as const,
      rule_id: 'MODEL_REGISTRATION',
      confidence_score: 1.0,
      reasoning: `AI model ${input.model_id} v${input.model_version} registered with ${constitutionalRules.length} constitutional rules`,
      human_reviewer_id: input.registered_by,
      reviewed_at: now,
    };

    const regOutcome = {
      action: 'approve' as const,
      station_id: `${input.pilot_id}-model-registry`,
      line_id: 'ai-governance',
      notes: `Model registered under frameworks: ${input.regulatory_frameworks.join(', ')}`,
      downstream_notified: false,
    };

    const regHash = hashPDO(regProof, regDecision, regOutcome);

    const { data: pdoData } = await supabase
      .from('pdos')
      .insert({
        hash: regHash,
        proof: regProof,
        decision: regDecision,
        outcome: regOutcome,
        metadata: {
          pilot_id: input.pilot_id,
          facility_id: input.facility_ids[0],
          created_by: input.registered_by,
          schema_version: '1.0.0',
          tags: ['model_registration', `model:${input.model_id}`],
          regulatory_frameworks: input.regulatory_frameworks,
        },
        pilot_id: input.pilot_id,
        facility_id: input.facility_ids[0],
        line_id: 'ai-governance',
        station_id: `${input.pilot_id}-model-registry`,
        decision_result: 'pass',
        outcome_action: 'approve',
        proof_type: 'model_registration',
        confidence_score: 1.0,
        model_id: input.model_id,
        chain_position: 0,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    const pdoId = pdoData ? (pdoData as { id: string }).id : null;

    // Set chain_root_id to self
    if (pdoId) {
      await supabase.from('pdos').update({ chain_root_id: pdoId }).eq('id', pdoId);
      await supabase
        .from('ai_models')
        .update({ registration_pdo_id: pdoId })
        .eq('model_id', input.model_id);
    }

    return {
      success: true,
      model_id: input.model_id,
      model_name: input.model_name,
      model_version: input.model_version,
      model_type: input.model_type,
      pilot_id: input.pilot_id,
      status: 'active',
      regulatory_frameworks: input.regulatory_frameworks,
      constitutional_rules_count: constitutionalRules.length,
      constitutional_rules: constitutionalRules,
      drift_tolerance: input.drift_tolerance,
      confidence_threshold: input.confidence_threshold,
      registration_pdo_id: pdoId,
      registered_at: now,
      message: `AI model ${input.model_id} successfully registered with ${constitutionalRules.length} constitutional rules under ${input.pilot_id} pilot.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to register AI model: ${message}`,
    };
  }
}

function getDefaultConstitutionalRules(
  modelType: string,
  frameworks: string[]
): string[] {
  const rules = [
    'All decisions must be logged with a Proof-Decision-Outcome (PDO) record.',
    'Confidence scores below the configured threshold must trigger human review.',
    'Model drift exceeding tolerance must trigger automatic SCRAM evaluation.',
    'All regulatory frameworks must be checked before approving a decision.',
    'No production override is permitted without Trinity Gate authorization for P0/P1 severity.',
  ];

  if (frameworks.includes('EU_AI_ACT')) {
    rules.push('Comply with EU AI Act Annex III high-risk AI system requirements.');
    rules.push('Maintain human oversight capability and audit logs per EU AI Act Article 9.');
  }

  if (frameworks.includes('IATF_16949')) {
    rules.push('All quality decisions must be traceable to IATF 16949 clause 8.5.1 control plan.');
  }

  if (modelType === 'vision_inspection') {
    rules.push('Vision inspection results must be corroborated by a second measurement if confidence < 0.90.');
  }

  return rules;
}
