import { describe, expect, it } from 'vitest';
import { ruleCatalog } from '@/lib/rules/catalog';
import { RuleContext } from '@/lib/rules/types';

const base: RuleContext = {
  ambientTempF: 70,
  concreteTempF: 80,
  humidityPct: 60,
  windMph: 10,
  evaporationRateLbft2hr: 0.1,
  mixDesign: {
    cementType: 'Type_I',
    designStrengthPsi: 4500,
    wcRatio: 0.42,
    targetAirPctMin: 5.5,
    targetAirPctMax: 7.0,
    targetSlumpInMin: 4,
    targetSlumpInMax: 5
  },
  jobType: 'driveway',
  exposureClass: 'F1',
  scheduledAt: new Date('2026-04-24T12:00:00Z'),
  forecastCureWindow: [{ timestamp: '2026-04-24T13:00:00Z', tempF: 50, humidityPct: 60, windMph: 5 }],
  hasColdWeatherProtectionPlan: true,
  hasSufficientCurePlan: true,
  batchedAt: new Date('2026-04-24T12:00:00Z'),
  deliveredAt: new Date('2026-04-24T12:45:00Z'),
  hasRetarder: false,
  measuredSlumpIn: 4.5
};

function run(id: string, ctx: Partial<RuleContext>) {
  const rule = ruleCatalog.find((r) => r.id === id);
  if (!rule) throw new Error(`Missing rule: ${id}`);
  return rule.evaluate({ ...base, ...ctx, mixDesign: { ...base.mixDesign, ...(ctx.mixDesign ?? {}) } });
}

describe('rule catalog threshold behavior', () => {
  it('HOT_EVAP_RATE_THRESHOLD below/at/above', () => {
    expect(run('HOT_EVAP_RATE_THRESHOLD', { evaporationRateLbft2hr: 0.19 }).triggered).toBe(false);
    expect(run('HOT_EVAP_RATE_THRESHOLD', { evaporationRateLbft2hr: 0.2 }).triggered).toBe(true);
    expect(run('HOT_EVAP_RATE_THRESHOLD', { evaporationRateLbft2hr: 0.4 }).severity).toBe('yellow');
  });

  it('HOT_EVAP_RATE_SEVERE below/at/above', () => {
    expect(run('HOT_EVAP_RATE_SEVERE', { evaporationRateLbft2hr: 0.29 }).triggered).toBe(false);
    expect(run('HOT_EVAP_RATE_SEVERE', { evaporationRateLbft2hr: 0.3 }).triggered).toBe(true);
    expect(run('HOT_EVAP_RATE_SEVERE', { evaporationRateLbft2hr: 0.5 }).severity).toBe('red');
  });

  it('HOT_DISCHARGE_TEMP below/at/above', () => {
    expect(run('HOT_DISCHARGE_TEMP', { concreteTempF: 95 }).triggered).toBe(false);
    expect(run('HOT_DISCHARGE_TEMP', { concreteTempF: 95.1 }).triggered).toBe(true);
    expect(run('HOT_DISCHARGE_TEMP', { concreteTempF: 102 }).severity).toBe('red');
  });

  it('COLD_PLACEMENT_TEMP below/at/above', () => {
    expect(run('COLD_PLACEMENT_TEMP', { ambientTempF: 39, hasColdWeatherProtectionPlan: false }).triggered).toBe(true);
    expect(run('COLD_PLACEMENT_TEMP', { ambientTempF: 40, hasColdWeatherProtectionPlan: false }).triggered).toBe(false);
    expect(run('COLD_PLACEMENT_TEMP', { ambientTempF: 20, hasColdWeatherProtectionPlan: true }).triggered).toBe(false);
  });

  it('COLD_CURE_FORECAST below/at/above', () => {
    expect(run('COLD_CURE_FORECAST', { forecastCureWindow: [{ timestamp: '', tempF: 39, humidityPct: 0, windMph: 0 }] }).triggered).toBe(true);
    expect(run('COLD_CURE_FORECAST', { forecastCureWindow: [{ timestamp: '', tempF: 40, humidityPct: 0, windMph: 0 }] }).triggered).toBe(false);
    expect(run('COLD_CURE_FORECAST', { forecastCureWindow: [{ timestamp: '', tempF: 50, humidityPct: 0, windMph: 0 }] }).severity).toBe('green');
  });

  it('MIX_WC_RATIO_HIGH below/at/above', () => {
    expect(run('MIX_WC_RATIO_HIGH', { mixDesign: { wcRatio: 0.44 } as any }).triggered).toBe(false);
    expect(run('MIX_WC_RATIO_HIGH', { mixDesign: { wcRatio: 0.45 } as any }).triggered).toBe(false);
    expect(run('MIX_WC_RATIO_HIGH', { mixDesign: { wcRatio: 0.46 } as any }).triggered).toBe(true);
  });

  it('MIX_STRENGTH_INSUFFICIENT below/at/above', () => {
    expect(run('MIX_STRENGTH_INSUFFICIENT', { exposureClass: 'F2', mixDesign: { designStrengthPsi: 4400 } as any }).triggered).toBe(true);
    expect(run('MIX_STRENGTH_INSUFFICIENT', { exposureClass: 'F2', mixDesign: { designStrengthPsi: 4500 } as any }).triggered).toBe(false);
    expect(run('MIX_STRENGTH_INSUFFICIENT', { exposureClass: 'F3', mixDesign: { designStrengthPsi: 6000 } as any }).triggered).toBe(false);
  });

  it('MIX_AIR_CONTENT_RANGE below/at/above', () => {
    expect(run('MIX_AIR_CONTENT_RANGE', { exposureClass: 'F2', mixDesign: { targetAirPctMin: 4.9, targetAirPctMax: 7 } as any }).triggered).toBe(true);
    expect(run('MIX_AIR_CONTENT_RANGE', { exposureClass: 'F2', mixDesign: { targetAirPctMin: 5, targetAirPctMax: 8 } as any }).triggered).toBe(false);
    expect(run('MIX_AIR_CONTENT_RANGE', { exposureClass: 'F0', mixDesign: { targetAirPctMin: 2, targetAirPctMax: 10 } as any }).triggered).toBe(false);
  });

  it('TYPEIL_TROWEL_WARNING below/at/above', () => {
    expect(run('TYPEIL_TROWEL_WARNING', { mixDesign: { cementType: 'Type_I' } as any }).triggered).toBe(false);
    expect(run('TYPEIL_TROWEL_WARNING', { mixDesign: { cementType: 'Type_IL' } as any }).triggered).toBe(true);
    expect(run('TYPEIL_TROWEL_WARNING', { mixDesign: { cementType: 'Type_IL' } as any, jobType: 'other' }).triggered).toBe(false);
  });

  it('TYPEIL_SCALING_RISK below/at/above', () => {
    expect(run('TYPEIL_SCALING_RISK', { mixDesign: { cementType: 'Type_IL' } as any, exposureClass: 'F2', humidityPct: 49, hasSufficientCurePlan: false }).triggered).toBe(true);
    expect(run('TYPEIL_SCALING_RISK', { mixDesign: { cementType: 'Type_IL' } as any, exposureClass: 'F2', humidityPct: 50, hasSufficientCurePlan: false }).triggered).toBe(false);
    expect(run('TYPEIL_SCALING_RISK', { mixDesign: { cementType: 'Type_IL' } as any, exposureClass: 'F3', humidityPct: 20, hasSufficientCurePlan: true }).triggered).toBe(false);
  });

  it('DELIVERY_DISCHARGE_WINDOW below/at/above', () => {
    expect(run('DELIVERY_DISCHARGE_WINDOW', { ambientTempF: 70, batchedAt: new Date('2026-04-24T12:00:00Z'), deliveredAt: new Date('2026-04-24T13:29:00Z') }).triggered).toBe(false);
    expect(run('DELIVERY_DISCHARGE_WINDOW', { ambientTempF: 70, batchedAt: new Date('2026-04-24T12:00:00Z'), deliveredAt: new Date('2026-04-24T13:30:00Z') }).triggered).toBe(false);
    expect(run('DELIVERY_DISCHARGE_WINDOW', { ambientTempF: 92, batchedAt: new Date('2026-04-24T12:00:00Z'), deliveredAt: new Date('2026-04-24T13:01:00Z') }).triggered).toBe(true);
  });

  it('TEST_SLUMP_OUT_OF_SPEC below/at/above', () => {
    expect(run('TEST_SLUMP_OUT_OF_SPEC', { measuredSlumpIn: 3.9 }).triggered).toBe(true);
    expect(run('TEST_SLUMP_OUT_OF_SPEC', { measuredSlumpIn: 4.0 }).triggered).toBe(false);
    expect(run('TEST_SLUMP_OUT_OF_SPEC', { measuredSlumpIn: 5.1 }).triggered).toBe(true);
  });
});
