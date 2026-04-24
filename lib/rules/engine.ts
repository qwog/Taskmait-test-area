import { RULE_CATALOG } from "./catalog";
import { menzelEvaporationRate } from "./menzel";
import type {
  PrePourEvaluation,
  Rule,
  RuleContext,
  RuleEvaluation,
} from "./types";
import { highestSeverity } from "./types";

/**
 * Run every rule whose required inputs are present in the context.
 * Rules whose inputs aren't available simply don't fire — the engine
 * silently skips them rather than throwing, so a partial context
 * (pre-pour vs. live event) is handled by the same code path.
 */
export function runRules(ctx: RuleContext): RuleEvaluation[] {
  // Pre-compute evaporation rate once so every weather rule sees the same value.
  const concreteTempF = ctx.concreteTempF ?? ctx.ambientTempF + 5;
  const evap = menzelEvaporationRate({
    concreteTempF,
    ambientTempF: ctx.ambientTempF,
    humidityPct: ctx.humidityPct,
    windMph: ctx.windSpeedAt20InAboveSurface ?? ctx.windMph,
  });
  const withEvap: RuleContext = {
    ...ctx,
    evaporationRateLbft2hr: ctx.evaporationRateLbft2hr ?? evap,
  };

  const results: RuleEvaluation[] = [];
  for (const rule of RULE_CATALOG) {
    if (!hasRequiredInputs(rule, withEvap)) continue;
    const r = rule.evaluate(withEvap);
    results.push({
      ruleId: rule.id,
      ruleVersion: rule.version,
      triggered: r.triggered,
      severity: r.severity,
      title: rule.title,
      message: r.message,
      citation: rule.citation,
      mitigation: r.mitigation,
      inputsSnapshot: snapshotInputs(rule, withEvap),
    });
  }
  return results;
}

function hasRequiredInputs(rule: Rule, ctx: RuleContext): boolean {
  for (const key of rule.inputs) {
    const v = ctx[key];
    if (v === undefined || v === null) {
      // forecastCureWindow/curePlan/batchTicket are optional at pre-pour;
      // if a rule requires them and they're absent, silently skip.
      return false;
    }
  }
  return true;
}

function snapshotInputs(rule: Rule, ctx: RuleContext): Record<string, unknown> {
  const snap: Record<string, unknown> = {};
  for (const key of rule.inputs) snap[key as string] = ctx[key];
  return snap;
}

export function summarize(
  evaluations: RuleEvaluation[]
): PrePourEvaluation {
  const triggered = evaluations.filter((e) => e.triggered);
  return {
    level: highestSeverity(evaluations),
    evaluations,
    mitigations: triggered
      .map((e) => e.mitigation)
      .filter((m): m is string => Boolean(m)),
  };
}

/**
 * Build a minimal RuleContext from raw inputs. Used by API routes after
 * fetching pour/job/mix/weather from Supabase.
 */
export function buildContext(parts: RuleContext): RuleContext {
  return parts;
}
