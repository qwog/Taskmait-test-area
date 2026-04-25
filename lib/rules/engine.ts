import type { SupabaseClient } from '@supabase/supabase-js';
import { ruleCatalog } from './catalog';
import { menzelEvaporationRate } from './menzel';
import { PourLogEvent, RuleContext, RuleEvaluation } from './types';
import { getNwsForecastWindow } from '@/lib/weather/nws';

function levelFromEvaluations(evaluations: RuleEvaluation[]): 'green' | 'yellow' | 'red' {
  if (evaluations.some((e) => e.triggered && e.severity === 'red')) return 'red';
  if (evaluations.some((e) => e.triggered && e.severity === 'yellow')) return 'yellow';
  return 'green';
}

function buildEvaluation(pourId: string, rule: typeof ruleCatalog[number], ctx: RuleContext): RuleEvaluation {
  const result = rule.evaluate(ctx);
  return {
    pourId,
    ruleId: rule.id,
    ruleVersion: rule.version,
    evaluatedAt: new Date().toISOString(),
    triggered: result.triggered,
    severity: result.severity,
    inputs: ctx as unknown as Record<string, unknown>,
    outputMessage: result.message,
    citation: rule.citation,
    mitigation: result.mitigation
  };
}

export async function evaluatePrePour(pourId: string, supabase: SupabaseClient) {
  const { data: pourJoin, error } = await supabase
    .from('pours')
    .select('id, scheduled_at, job:jobs(job_type, exposure_class, latitude, longitude), mix:mix_designs(*)')
    .eq('id', pourId)
    .single();

  if (error || !pourJoin) throw new Error(`Pour lookup failed: ${error?.message ?? 'missing pour'}`);
  const job = Array.isArray(pourJoin.job) ? pourJoin.job[0] : pourJoin.job;
  const mix = Array.isArray(pourJoin.mix) ? pourJoin.mix[0] : pourJoin.mix;

  const forecast = await getNwsForecastWindow({
    lat: Number(job.latitude),
    lng: Number(job.longitude),
    at: pourJoin.scheduled_at,
    userAgent: process.env.NWS_USER_AGENT ?? 'PourGuard/1.0 (contact@pourguard.app)'
  });

  const anchor = forecast[0] ?? { tempF: 70, humidityPct: 50, windMph: 5 };
  const evaporation = menzelEvaporationRate({
    concreteTempF: anchor.tempF + 10,
    ambientTempF: anchor.tempF,
    humidityPct: anchor.humidityPct,
    windMph: anchor.windMph
  });

  const ctx: RuleContext = {
    ambientTempF: anchor.tempF,
    concreteTempF: anchor.tempF + 10,
    humidityPct: anchor.humidityPct,
    windMph: anchor.windMph,
    evaporationRateLbft2hr: evaporation,
    mixDesign: {
      cementType: mix.cement_type,
      designStrengthPsi: mix.design_strength_psi,
      wcRatio: Number(mix.wc_ratio),
      targetAirPctMin: mix.target_air_pct_min,
      targetAirPctMax: mix.target_air_pct_max,
      targetSlumpInMin: mix.target_slump_in_min,
      targetSlumpInMax: mix.target_slump_in_max,
      admixtures: mix.admixtures ?? []
    },
    jobType: job.job_type,
    exposureClass: job.exposure_class,
    scheduledAt: new Date(pourJoin.scheduled_at),
    forecastCureWindow: forecast,
    hasColdWeatherProtectionPlan: false,
    hasSufficientCurePlan: false
  };

  const evaluations = ruleCatalog.map((rule) => buildEvaluation(pourId, rule, ctx));
  const level = levelFromEvaluations(evaluations);
  const mitigations = evaluations.filter((e) => e.triggered && e.mitigation).map((e) => e.mitigation as string);

  await supabase.from('rule_evaluations').insert(evaluations.map((e) => ({
    pour_id: e.pourId,
    rule_id: e.ruleId,
    rule_version: e.ruleVersion,
    evaluated_at: e.evaluatedAt,
    triggered: e.triggered,
    severity: e.severity,
    inputs: e.inputs,
    output_message: e.outputMessage,
    citation: e.citation,
    mitigation: e.mitigation
  })));

  await supabase.from('pours').update({ pre_pour_risk_level: level }).eq('id', pourId);

  return { level, evaluations, mitigations };
}

export async function evaluateLiveEvent(pourId: string, event: PourLogEvent, supabase: SupabaseClient): Promise<RuleEvaluation[]> {
  if (event.eventType !== 'slump_test') return [];

  const { data: pourJoin, error } = await supabase
    .from('pours')
    .select('id, scheduled_at, job:jobs(job_type, exposure_class), mix:mix_designs(*)')
    .eq('id', pourId)
    .single();

  if (error || !pourJoin) throw new Error(`Pour lookup failed: ${error?.message ?? 'missing pour'}`);
  const job = Array.isArray(pourJoin.job) ? pourJoin.job[0] : pourJoin.job;
  const mix = Array.isArray(pourJoin.mix) ? pourJoin.mix[0] : pourJoin.mix;

  const ctx: RuleContext = {
    ambientTempF: Number(event.payload?.ambientTempF ?? 70),
    concreteTempF: Number(event.payload?.concreteTempF ?? 75),
    humidityPct: Number(event.payload?.humidityPct ?? 50),
    windMph: Number(event.payload?.windMph ?? 5),
    mixDesign: {
      cementType: mix.cement_type,
      designStrengthPsi: mix.design_strength_psi,
      wcRatio: Number(mix.wc_ratio),
      targetSlumpInMin: mix.target_slump_in_min,
      targetSlumpInMax: mix.target_slump_in_max
    },
    jobType: job.job_type,
    exposureClass: job.exposure_class,
    scheduledAt: new Date(pourJoin.scheduled_at),
    measuredSlumpIn: Number(event.payload?.measuredSlumpIn)
  };

  const slumpRule = ruleCatalog.find((r) => r.id === 'TEST_SLUMP_OUT_OF_SPEC');
  if (!slumpRule) return [];

  const evaluation = buildEvaluation(pourId, slumpRule, ctx);
  await supabase.from('rule_evaluations').insert({
    pour_id: evaluation.pourId,
    rule_id: evaluation.ruleId,
    rule_version: evaluation.ruleVersion,
    evaluated_at: evaluation.evaluatedAt,
    triggered: evaluation.triggered,
    severity: evaluation.severity,
    inputs: evaluation.inputs,
    output_message: evaluation.outputMessage,
    citation: evaluation.citation,
    mitigation: evaluation.mitigation
  });

  return [evaluation];
}
