export function saturationVaporPressure(tempF: number): number {
  const tempC = (tempF - 32) * (5 / 9);
  const eHpa = 6.1078 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  return eHpa / 1.33322;
}

export function menzelEvaporationRate(args: {
  concreteTempF: number;
  ambientTempF: number;
  humidityPct: number;
  windMph: number;
}): number {
  const { concreteTempF, ambientTempF, humidityPct, windMph } = args;
  const eC = saturationVaporPressure(concreteTempF);
  const eA = saturationVaporPressure(ambientTempF);
  const r = humidityPct / 100;
  const rate = 0.44 * (eC - r * eA) * (0.253 + 0.06 * windMph);
  return Math.max(0, Number(rate.toFixed(3)));
}
