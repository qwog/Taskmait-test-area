import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { hashPDO } from '../lib/hash.js';
import { screenEntitySchema } from '../lib/validators.js';
import { generateEntityRiskAssessment } from '../lib/claude.js';

type ScreenEntityInput = z.infer<typeof screenEntitySchema>;

interface ScreeningMatch {
  list: string;
  match_type: 'exact' | 'partial' | 'fuzzy';
  matched_name: string;
  confidence: number;
  entry_reference?: string;
  reason?: string;
}

// Mock screening list data — in production these would call external APIs
// or query a regularly updated database table
const MOCK_BLOCKED_ENTITIES: Record<string, Array<{
  list: string;
  entry_ref: string;
  reason: string;
  aliases?: string[];
}>> = {
  'xinjiang textile co': [
    { list: 'UFLPA', entry_ref: 'UFLPA-2022-0042', reason: 'Forced labor concern - Xinjiang region' },
  ],
  'sdn blocked corp': [
    { list: 'OFAC_SDN', entry_ref: 'SDN-2023-1234', reason: 'OFAC Specially Designated National' },
  ],
  'entity list inc': [
    { list: 'BIS_ENTITY_LIST', entry_ref: 'EL-2023-5678', reason: 'Export control - military end-use' },
  ],
  'debarred aerospace': [
    { list: 'ITAR_DEBARRED', entry_ref: 'ITAR-DEBAR-2022-009', reason: 'Debarred under ITAR 22 CFR 127.7' },
  ],
};

/**
 * Screen an entity against trade compliance and sanctions lists.
 */
export async function screenEntity(rawInput: unknown): Promise<Record<string, unknown>> {
  // 1. Validate inputs
  const parseResult = screenEntitySchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: 'Validation failed',
      details: parseResult.error.flatten(),
    };
  }

  const input: ScreenEntityInput = parseResult.data;

  try {
    const now = new Date().toISOString();
    const matches: ScreeningMatch[] = [];

    // 2. Check entity against each screening list
    const entityNormalized = input.entity_name.toLowerCase().trim();

    for (const list of input.screening_lists) {
      const listMatches = checkScreeningList(entityNormalized, input.entity_name, list);
      matches.push(...listMatches);
    }

    // Country-level checks
    if (input.country_of_origin) {
      const countryMatches = checkCountryRestrictions(
        input.country_of_origin,
        input.screening_lists
      );
      matches.push(...countryMatches);
    }

    // 3. Determine risk level
    const riskLevel = determineRiskLevel(matches, input.entity_name, input.country_of_origin);

    // 4. Generate risk assessment via Claude if there are matches
    let riskAssessment: string | null = null;
    if (matches.length > 0) {
      riskAssessment = await generateEntityRiskAssessment(input.entity_name, matches);
    }

    // 5. Create screening PDO
    const proof = {
      type: 'entity_screening' as const,
      source_system: 'chainbridge-mcp-screener',
      raw_value: {
        entity_name: input.entity_name,
        entity_type: input.entity_type,
        country_of_origin: input.country_of_origin,
        lists_checked: input.screening_lists,
        matches,
      },
      confidence_score: matches.length > 0 ? 0.95 : 1.0,
      measurement_timestamp: now,
      operator_id: input.requested_by,
    };

    const decision = {
      result: riskLevel === 'blocked' || riskLevel === 'high' ? ('fail' as const) : ('pass' as const),
      rule_id: 'ENTITY_SCREENING',
      confidence_score: 0.95,
      reasoning: riskAssessment ?? `Entity screened against ${input.screening_lists.join(', ')}. ${matches.length} match(es) found.`,
      human_reviewer_id: input.requested_by,
      reviewed_at: now,
    };

    const outcome = {
      action: riskLevel === 'blocked' ? ('reject' as const) :
               riskLevel === 'high' ? ('escalate_to_human' as const) :
               riskLevel === 'medium' ? ('hold' as const) :
               ('approve' as const),
      station_id: `${input.facility_id}-screening`,
      line_id: 'supply-chain',
      notes: `Entity screening for ${input.entity_name}: ${riskLevel.toUpperCase()} risk`,
      downstream_notified: riskLevel === 'blocked' || riskLevel === 'high',
    };

    const screeningHash = hashPDO(proof, decision, outcome);

    const { data: pdoData } = await supabase
      .from('pdos')
      .insert({
        hash: screeningHash,
        proof,
        decision,
        outcome,
        metadata: {
          pilot_id: input.pilot_id,
          facility_id: input.facility_id,
          created_by: input.requested_by,
          schema_version: '1.0.0',
          tags: ['entity_screening', `risk_${riskLevel}`],
          regulatory_frameworks: input.screening_lists,
        },
        pilot_id: input.pilot_id,
        facility_id: input.facility_id,
        line_id: 'supply-chain',
        station_id: `${input.facility_id}-screening`,
        decision_result: decision.result,
        outcome_action: outcome.action,
        proof_type: 'entity_screening',
        confidence_score: 0.95,
        chain_position: 0,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    const pdoId = pdoData ? (pdoData as { id: string }).id : null;

    // Update screening PDO chain_root_id
    if (pdoId) {
      await supabase.from('pdos').update({ chain_root_id: pdoId }).eq('id', pdoId);
    }

    // Calculate next screening date based on risk level
    const nextScreeningDays = riskLevel === 'clear' ? 90 : riskLevel === 'low' ? 30 : 7;
    const nextScreeningDue = new Date(
      Date.now() + nextScreeningDays * 86400 * 1000
    ).toISOString();

    return {
      success: true,
      entity_name: input.entity_name,
      entity_type: input.entity_type,
      country_of_origin: input.country_of_origin ?? null,
      screening_lists_checked: input.screening_lists,
      risk_level: riskLevel,
      match_count: matches.length,
      matches,
      risk_assessment: riskAssessment,
      override_allowed: riskLevel !== 'blocked',
      override_authority: riskLevel === 'high' ? 'quality_director' : riskLevel === 'medium' ? 'engineer' : null,
      screening_pdo_id: pdoId,
      screened_at: now,
      next_screening_due: nextScreeningDue,
      action_required: riskLevel === 'blocked' ? 'HALT — entity is blocked from supply chain' :
                       riskLevel === 'high' ? 'ESCALATE — manual review required before proceeding' :
                       riskLevel === 'medium' ? 'HOLD — engineering review recommended' :
                       'CLEAR — entity may proceed',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to screen entity: ${message}`,
    };
  }
}

function checkScreeningList(
  entityNormalized: string,
  entityOriginal: string,
  list: string
): ScreeningMatch[] {
  const matches: ScreeningMatch[] = [];

  // Check mock blocked entities
  for (const [blockedNorm, entries] of Object.entries(MOCK_BLOCKED_ENTITIES)) {
    const matchingEntries = entries.filter((e) => e.list === list);
    if (matchingEntries.length === 0) continue;

    // Exact match
    if (entityNormalized === blockedNorm) {
      for (const entry of matchingEntries) {
        matches.push({
          list,
          match_type: 'exact',
          matched_name: blockedNorm,
          confidence: 1.0,
          entry_reference: entry.entry_ref,
          reason: entry.reason,
        });
      }
      continue;
    }

    // Partial match
    if (entityNormalized.includes(blockedNorm) || blockedNorm.includes(entityNormalized)) {
      for (const entry of matchingEntries) {
        matches.push({
          list,
          match_type: 'partial',
          matched_name: blockedNorm,
          confidence: 0.75,
          entry_reference: entry.entry_ref,
          reason: entry.reason,
        });
      }
      continue;
    }

    // Fuzzy match — simple token overlap
    const entityTokens = new Set(entityNormalized.split(/\s+/));
    const blockedTokens = new Set(blockedNorm.split(/\s+/));
    const intersection = [...entityTokens].filter((t) => blockedTokens.has(t));
    const similarity = intersection.length / Math.max(entityTokens.size, blockedTokens.size);

    if (similarity >= 0.5) {
      for (const entry of matchingEntries) {
        matches.push({
          list,
          match_type: 'fuzzy',
          matched_name: blockedNorm,
          confidence: similarity,
          entry_reference: entry.entry_ref,
          reason: entry.reason,
        });
      }
    }
  }

  return matches;
}

function checkCountryRestrictions(
  country: string,
  lists: string[]
): ScreeningMatch[] {
  const matches: ScreeningMatch[] = [];
  const countryUpper = country.toUpperCase();

  // UFLPA — Xinjiang, China
  if (lists.includes('UFLPA') && (countryUpper === 'CN' || countryUpper === 'CHINA')) {
    matches.push({
      list: 'UFLPA',
      match_type: 'partial',
      matched_name: country,
      confidence: 0.6,
      reason: 'China origin — enhanced UFLPA due diligence required for Xinjiang-linked suppliers',
    });
  }

  // Russia/Belarus — EU sanctions
  if (
    lists.includes('EU_SANCTIONS') &&
    (countryUpper === 'RU' || countryUpper === 'RUSSIA' ||
     countryUpper === 'BY' || countryUpper === 'BELARUS')
  ) {
    matches.push({
      list: 'EU_SANCTIONS',
      match_type: 'exact',
      matched_name: country,
      confidence: 0.95,
      reason: 'EU sanctions apply to Russia/Belarus entities under Council Regulation (EU) 833/2014',
    });
  }

  return matches;
}

function determineRiskLevel(
  matches: ScreeningMatch[],
  _entityName: string,
  _country?: string
): 'clear' | 'low' | 'medium' | 'high' | 'blocked' {
  if (matches.length === 0) return 'clear';

  const hasExactHigh = matches.some(
    (m) => m.match_type === 'exact' &&
    ['OFAC_SDN', 'BIS_ENTITY_LIST', 'ITAR_DEBARRED'].includes(m.list) &&
    m.confidence >= 0.9
  );
  if (hasExactHigh) return 'blocked';

  const hasExact = matches.some((m) => m.match_type === 'exact' && m.confidence >= 0.9);
  if (hasExact) return 'high';

  const hasPartialHighConf = matches.some(
    (m) => m.match_type === 'partial' && m.confidence >= 0.7
  );
  if (hasPartialHighConf) return 'high';

  const hasAnyMatch = matches.some((m) => m.confidence >= 0.5);
  if (hasAnyMatch) return 'medium';

  return 'low';
}
