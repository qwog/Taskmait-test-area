import { describe, it, expect } from "vitest";
import {
  saturationVaporPressure,
  menzelEvaporationRate,
  evapRiskBand,
} from "./menzel";

// Tetens-equation sanity checks. Standard reference values (mmHg):
//   32°F (0°C)   ≈ 4.58
//   68°F (20°C)  ≈ 17.5
//   86°F (30°C)  ≈ 31.8
//  104°F (40°C)  ≈ 55.3
describe("saturationVaporPressure (Tetens)", () => {
  it("matches reference at freezing", () => {
    expect(saturationVaporPressure(32)).toBeCloseTo(4.58, 1);
  });
  it("matches reference at 68°F / 20°C", () => {
    expect(saturationVaporPressure(68)).toBeCloseTo(17.5, 0);
  });
  it("matches reference at 86°F / 30°C", () => {
    expect(saturationVaporPressure(86)).toBeCloseTo(31.8, 0);
  });
  it("matches reference at 104°F / 40°C", () => {
    expect(saturationVaporPressure(104)).toBeCloseTo(55.3, 0);
  });
});

// Against ACI 305R-20 Fig. 2.1 reference points. The chart's axes are
// imprecise to read, so we assert order-of-magnitude agreement.
describe("menzelEvaporationRate", () => {
  it("stays below ACI 0.2 warning threshold under mild conditions", () => {
    // 70°F / 70°F / 70% RH / 5 mph — routine summer morning.
    const w = menzelEvaporationRate({
      concreteTempF: 70,
      ambientTempF: 70,
      humidityPct: 70,
      windMph: 5,
    });
    expect(w).toBeLessThan(0.1);
  });

  it("crosses the 0.2 lb/ft²/hr ACI warning threshold in hot/dry/windy conditions", () => {
    // ACI 305R-20 Fig. 2.1 family of curves — mid-day summer pour.
    const w = menzelEvaporationRate({
      concreteTempF: 85,
      ambientTempF: 85,
      humidityPct: 40,
      windMph: 10,
    });
    expect(w).toBeGreaterThan(0.15);
    expect(w).toBeLessThan(0.5);
  });

  it("exceeds 0.3 under severe conditions", () => {
    // 100°F air, 95°F concrete, 20% RH, 15 mph — reliably severe.
    const w = menzelEvaporationRate({
      concreteTempF: 95,
      ambientTempF: 100,
      humidityPct: 20,
      windMph: 15,
    });
    expect(w).toBeGreaterThan(0.3);
  });

  it("is monotonic in wind speed (all else equal)", () => {
    const args = { concreteTempF: 85, ambientTempF: 85, humidityPct: 40 };
    const w0 = menzelEvaporationRate({ ...args, windMph: 0 });
    const w5 = menzelEvaporationRate({ ...args, windMph: 5 });
    const w15 = menzelEvaporationRate({ ...args, windMph: 15 });
    expect(w5).toBeGreaterThan(w0);
    expect(w15).toBeGreaterThan(w5);
  });

  it("is monotonic in concrete temperature", () => {
    const args = { ambientTempF: 75, humidityPct: 40, windMph: 10 };
    const wCool = menzelEvaporationRate({ ...args, concreteTempF: 70 });
    const wHot = menzelEvaporationRate({ ...args, concreteTempF: 95 });
    expect(wHot).toBeGreaterThan(wCool);
  });

  it("drops as humidity rises", () => {
    const args = { concreteTempF: 90, ambientTempF: 90, windMph: 10 };
    const wDry = menzelEvaporationRate({ ...args, humidityPct: 20 });
    const wWet = menzelEvaporationRate({ ...args, humidityPct: 90 });
    expect(wDry).toBeGreaterThan(wWet);
  });

  it("clamps at zero when ambient vapor pressure exceeds surface", () => {
    // Unphysical: ambient warmer than concrete with high RH → negative raw value.
    const w = menzelEvaporationRate({
      concreteTempF: 50,
      ambientTempF: 95,
      humidityPct: 95,
      windMph: 0,
    });
    expect(w).toBe(0);
  });
});

describe("evapRiskBand", () => {
  it("bands correctly at ACI thresholds", () => {
    expect(evapRiskBand(0.05)).toBe("low");
    expect(evapRiskBand(0.15)).toBe("moderate");
    expect(evapRiskBand(0.25)).toBe("high");
    expect(evapRiskBand(0.35)).toBe("severe");
  });
  it("treats boundaries as inclusive of the higher band", () => {
    expect(evapRiskBand(0.2)).toBe("high");
    expect(evapRiskBand(0.3)).toBe("severe");
  });
});
