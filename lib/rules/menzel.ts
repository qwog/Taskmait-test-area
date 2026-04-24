/**
 * Menzel formula — ACI 305R-20 §2.1.4
 *
 * Evaporation rate of surface moisture from freshly placed concrete:
 *
 *   W = 0.44 × (e_c − r × e_a) × (0.253 + 0.06 × V)
 *
 *   W   = evaporation rate, lb/ft²/hr
 *   e_c = saturation vapor pressure at concrete-surface temp, inHg
 *   e_a = saturation vapor pressure at ambient air temp, inHg
 *   r   = relative humidity as a decimal (0.0–1.0)
 *   V   = average wind speed, mph, measured 20 in above the surface
 *
 * Saturation vapor pressure uses the Tetens equation:
 *   e_s(hPa) = 6.1078 · exp(17.27·T / (T + 237.3))  with T in °C
 * We expose it in mmHg for readability (standard thermodynamic units);
 * the Menzel coefficient 0.44 assumes inHg, so we convert inside the
 * evaporation routine (1 inHg = 25.4 mmHg).
 */

const MMHG_PER_INHG = 25.4;

export function saturationVaporPressure(tempF: number): number {
  const tempC = (tempF - 32) * (5 / 9);
  const eHpa = 6.1078 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  return eHpa / 1.33322;
}

export interface MenzelInput {
  concreteTempF: number;
  ambientTempF: number;
  humidityPct: number; // 0–100
  windMph: number;     // at 20 in above surface
}

export function menzelEvaporationRate(args: MenzelInput): number {
  const { concreteTempF, ambientTempF, humidityPct, windMph } = args;
  const eC = saturationVaporPressure(concreteTempF) / MMHG_PER_INHG;
  const eA = saturationVaporPressure(ambientTempF) / MMHG_PER_INHG;
  const r = humidityPct / 100;
  const rate = 0.44 * (eC - r * eA) * (0.253 + 0.06 * windMph);
  return Math.max(0, Number(rate.toFixed(3)));
}

/**
 * ACI 305R-20 §2.1.5 risk bands, used by the rules engine.
 * 0.2 lb/ft²/hr is the plastic-shrinkage warning threshold;
 * 0.3 lb/ft²/hr is the severe threshold.
 */
export type EvapRisk = "low" | "moderate" | "high" | "severe";

export function evapRiskBand(rate: number): EvapRisk {
  if (rate >= 0.3) return "severe";
  if (rate >= 0.2) return "high";
  if (rate >= 0.1) return "moderate";
  return "low";
}
