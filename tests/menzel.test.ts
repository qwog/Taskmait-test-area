import { describe, expect, it } from 'vitest';
import { menzelEvaporationRate, saturationVaporPressure } from '@/lib/rules/menzel';

describe('menzel evaporation formula', () => {
  it('calculates saturation vapor pressure increasing with temperature', () => {
    expect(saturationVaporPressure(40)).toBeLessThan(saturationVaporPressure(80));
  });

  it('matches expected reference-like values from ACI chart bands', () => {
    expect(menzelEvaporationRate({ concreteTempF: 70, ambientTempF: 70, humidityPct: 80, windMph: 10 })).toBeCloseTo(0.073, 2);
    expect(menzelEvaporationRate({ concreteTempF: 80, ambientTempF: 90, humidityPct: 40, windMph: 15 })).toBeCloseTo(0.372, 2);
    expect(menzelEvaporationRate({ concreteTempF: 90, ambientTempF: 100, humidityPct: 20, windMph: 20 })).toBeCloseTo(0.822, 2);
  });
});
