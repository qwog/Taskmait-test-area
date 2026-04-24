import { describe, expect, it } from "vitest";
import { findRule, RULE_CATALOG } from "./catalog";
import type {
  CurePlanSnapshot,
  MixDesignSnapshot,
  RuleContext,
  WeatherSnapshot,
} from "./types";

// ─── fixtures ──────────────────────────────────────────────────────────────
const typeIMix: MixDesignSnapshot = {
  id: "mix-1",
  name: "4000 psi flatwork",
  cementType: "Type_I",
  designStrengthPsi: 4000,
  wcRatio: 0.45,
  aggregateTopSizeIn: 1.0,
  targetAirPctMin: 5,
  targetAirPctMax: 7,
  targetSlumpInMin: 3,
  targetSlumpInMax: 5,
  admixtures: [],
};

const typeILMix: MixDesignSnapshot = { ...typeIMix, cementType: "Type_IL" };

const baseCtx: RuleContext = {
  ambientTempF: 70,
  concreteTempF: 75,
  humidityPct: 60,
  windMph: 5,
  mixDesign: typeIMix,
  jobType: "driveway",
  exposureClass: "F1",
  scheduledAt: new Date("2026-06-01T14:00:00Z"),
};

function run(rule: string, ctx: RuleContext) {
  const r = findRule(rule);
  if (!r) throw new Error(`missing rule ${rule}`);
  return r.evaluate(ctx);
}

// ─── catalog integrity ─────────────────────────────────────────────────────
describe("RULE_CATALOG", () => {
  it("contains exactly 12 rules", () => {
    expect(RULE_CATALOG.length).toBe(12);
  });
  it("every rule has a citation", () => {
    for (const r of RULE_CATALOG) expect(r.citation).toMatch(/\S/);
  });
  it("every rule has a unique id", () => {
    const ids = RULE_CATALOG.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("every rule has a semantic version", () => {
    for (const r of RULE_CATALOG) expect(r.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

// ─── 1. HOT_EVAP_RATE_THRESHOLD ────────────────────────────────────────────
describe("HOT_EVAP_RATE_THRESHOLD", () => {
  it("does not fire in benign conditions", () => {
    const r = run("HOT_EVAP_RATE_THRESHOLD", baseCtx);
    expect(r.triggered).toBe(false);
  });
  it("fires when evap rate is between 0.2 and 0.3", () => {
    const r = run("HOT_EVAP_RATE_THRESHOLD", {
      ...baseCtx,
      evaporationRateLbft2hr: 0.25,
    });
    expect(r.triggered).toBe(true);
    expect(r.severity).toBe("yellow");
  });
  it("does not fire at severe (≥0.3) — severe rule handles that", () => {
    const r = run("HOT_EVAP_RATE_THRESHOLD", {
      ...baseCtx,
      evaporationRateLbft2hr: 0.35,
    });
    expect(r.triggered).toBe(false);
  });
});

// ─── 2. HOT_EVAP_RATE_SEVERE ───────────────────────────────────────────────
describe("HOT_EVAP_RATE_SEVERE", () => {
  it("does not fire below 0.3", () => {
    const r = run("HOT_EVAP_RATE_SEVERE", {
      ...baseCtx,
      evaporationRateLbft2hr: 0.29,
    });
    expect(r.triggered).toBe(false);
  });
  it("fires at 0.3", () => {
    const r = run("HOT_EVAP_RATE_SEVERE", {
      ...baseCtx,
      evaporationRateLbft2hr: 0.3,
    });
    expect(r.triggered).toBe(true);
    expect(r.severity).toBe("red");
  });
  it("fires above 0.3", () => {
    const r = run("HOT_EVAP_RATE_SEVERE", {
      ...baseCtx,
      evaporationRateLbft2hr: 0.5,
    });
    expect(r.triggered).toBe(true);
  });
});

// ─── 3. HOT_DISCHARGE_TEMP ─────────────────────────────────────────────────
describe("HOT_DISCHARGE_TEMP", () => {
  it("does not fire at 94°F", () => {
    expect(run("HOT_DISCHARGE_TEMP", { ...baseCtx, concreteTempF: 94 }).triggered).toBe(false);
  });
  it("does not fire at 95°F boundary", () => {
    expect(run("HOT_DISCHARGE_TEMP", { ...baseCtx, concreteTempF: 95 }).triggered).toBe(false);
  });
  it("fires above 95°F", () => {
    const r = run("HOT_DISCHARGE_TEMP", { ...baseCtx, concreteTempF: 98 });
    expect(r.triggered).toBe(true);
    expect(r.severity).toBe("red");
  });
});

// ─── 4. COLD_PLACEMENT_TEMP ────────────────────────────────────────────────
describe("COLD_PLACEMENT_TEMP", () => {
  it("does not fire at 45°F", () => {
    expect(run("COLD_PLACEMENT_TEMP", { ...baseCtx, ambientTempF: 45 }).triggered).toBe(false);
  });
  it("fires at 35°F with no protection plan", () => {
    const r = run("COLD_PLACEMENT_TEMP", { ...baseCtx, ambientTempF: 35 });
    expect(r.triggered).toBe(true);
    expect(r.severity).toBe("red");
  });
  it("does not fire at 35°F when insulation is planned", () => {
    const plan: CurePlanSnapshot = {
      insulationPlanned: true,
      wetCurePlanned: false,
      evaporationRetarderPlanned: false,
      heatedEnclosurePlanned: false,
      minCureDurationHours: 72,
    };
    const r = run("COLD_PLACEMENT_TEMP", {
      ...baseCtx,
      ambientTempF: 35,
      curePlan: plan,
    });
    expect(r.triggered).toBe(false);
  });
});

// ─── 5. COLD_CURE_FORECAST ─────────────────────────────────────────────────
describe("COLD_CURE_FORECAST", () => {
  const mkForecast = (lows: number[]): WeatherSnapshot[] =>
    lows.map((t, i) => ({
      timestamp: new Date(Date.now() + i * 3600_000).toISOString(),
      tempF: t,
      humidityPct: 50,
      windMph: 5,
      source: "forecast",
    }));
  it("does not fire with mild forecast", () => {
    const r = run("COLD_CURE_FORECAST", {
      ...baseCtx,
      forecastCureWindow: mkForecast([55, 60, 50]),
    });
    expect(r.triggered).toBe(false);
  });
  it("does not fire at 40°F boundary", () => {
    const r = run("COLD_CURE_FORECAST", {
      ...baseCtx,
      forecastCureWindow: mkForecast([40, 45]),
    });
    expect(r.triggered).toBe(false);
  });
  it("fires when forecast drops below 40°F", () => {
    const r = run("COLD_CURE_FORECAST", {
      ...baseCtx,
      forecastCureWindow: mkForecast([50, 38, 45]),
    });
    expect(r.triggered).toBe(true);
    expect(r.severity).toBe("yellow");
  });
});

// ─── 6. MIX_WC_RATIO_HIGH ──────────────────────────────────────────────────
describe("MIX_WC_RATIO_HIGH", () => {
  it("does not fire at 0.45", () => {
    const r = run("MIX_WC_RATIO_HIGH", {
      ...baseCtx,
      mixDesign: { ...typeIMix, wcRatio: 0.45 },
    });
    expect(r.triggered).toBe(false);
  });
  it("fires at 0.50", () => {
    const r = run("MIX_WC_RATIO_HIGH", {
      ...baseCtx,
      mixDesign: { ...typeIMix, wcRatio: 0.5 },
    });
    expect(r.triggered).toBe(true);
  });
  it("does not fire on non-flatwork", () => {
    const r = run("MIX_WC_RATIO_HIGH", {
      ...baseCtx,
      jobType: "other",
      mixDesign: { ...typeIMix, wcRatio: 0.5 },
    });
    expect(r.triggered).toBe(false);
  });
});

// ─── 7. MIX_STRENGTH_INSUFFICIENT ──────────────────────────────────────────
describe("MIX_STRENGTH_INSUFFICIENT", () => {
  it("does not fire at 4000 psi / F1", () => {
    expect(run("MIX_STRENGTH_INSUFFICIENT", baseCtx).triggered).toBe(false);
  });
  it("fires at 3000 psi on driveway", () => {
    const r = run("MIX_STRENGTH_INSUFFICIENT", {
      ...baseCtx,
      mixDesign: { ...typeIMix, designStrengthPsi: 3000 },
    });
    expect(r.triggered).toBe(true);
    expect(r.severity).toBe("red");
  });
  it("fires at 4000 psi for F2 exposure", () => {
    const r = run("MIX_STRENGTH_INSUFFICIENT", {
      ...baseCtx,
      exposureClass: "F2",
      mixDesign: { ...typeIMix, designStrengthPsi: 4000 },
    });
    expect(r.triggered).toBe(true);
  });
});

// ─── 8. MIX_AIR_CONTENT_RANGE ──────────────────────────────────────────────
describe("MIX_AIR_CONTENT_RANGE", () => {
  it("does not fire for F0 exposure", () => {
    const r = run("MIX_AIR_CONTENT_RANGE", {
      ...baseCtx,
      exposureClass: "F0",
      mixDesign: { ...typeIMix, targetAirPctMin: null, targetAirPctMax: null },
    });
    expect(r.triggered).toBe(false);
  });
  it("fires when air target is below 5% on F1", () => {
    const r = run("MIX_AIR_CONTENT_RANGE", {
      ...baseCtx,
      mixDesign: { ...typeIMix, targetAirPctMin: 3, targetAirPctMax: 4 },
    });
    expect(r.triggered).toBe(true);
    expect(r.severity).toBe("yellow");
  });
  it("fires when F2 mix has no air target", () => {
    const r = run("MIX_AIR_CONTENT_RANGE", {
      ...baseCtx,
      exposureClass: "F2",
      mixDesign: { ...typeIMix, targetAirPctMin: null, targetAirPctMax: null },
    });
    expect(r.triggered).toBe(true);
  });
});

// ─── 9. TYPEIL_TROWEL_WARNING ──────────────────────────────────────────────
describe("TYPEIL_TROWEL_WARNING", () => {
  it("does not fire on Type I", () => {
    expect(run("TYPEIL_TROWEL_WARNING", baseCtx).triggered).toBe(false);
  });
  it("fires for Type IL + flatwork", () => {
    const r = run("TYPEIL_TROWEL_WARNING", { ...baseCtx, mixDesign: typeILMix });
    expect(r.triggered).toBe(true);
    expect(r.severity).toBe("yellow");
  });
  it("does not fire for Type IL non-flatwork", () => {
    const r = run("TYPEIL_TROWEL_WARNING", {
      ...baseCtx,
      mixDesign: typeILMix,
      jobType: "other",
    });
    expect(r.triggered).toBe(false);
  });
});

// ─── 10. TYPEIL_SCALING_RISK ───────────────────────────────────────────────
describe("TYPEIL_SCALING_RISK", () => {
  const dryCuredPlan: CurePlanSnapshot = {
    insulationPlanned: false,
    wetCurePlanned: false,
    evaporationRetarderPlanned: false,
    heatedEnclosurePlanned: false,
    minCureDurationHours: 24,
  };
  it("does not fire on Type I", () => {
    const r = run("TYPEIL_SCALING_RISK", {
      ...baseCtx,
      exposureClass: "F3",
      humidityPct: 30,
      curePlan: dryCuredPlan,
    });
    expect(r.triggered).toBe(false);
  });
  it("fires for Type IL + F3 + low humidity + inadequate cure", () => {
    const r = run("TYPEIL_SCALING_RISK", {
      ...baseCtx,
      mixDesign: typeILMix,
      exposureClass: "F3",
      humidityPct: 30,
      curePlan: dryCuredPlan,
    });
    expect(r.triggered).toBe(true);
    expect(r.severity).toBe("red");
  });
  it("does not fire for Type IL when 7-day wet cure is planned", () => {
    const adequate: CurePlanSnapshot = { ...dryCuredPlan, wetCurePlanned: true, minCureDurationHours: 168 };
    const r = run("TYPEIL_SCALING_RISK", {
      ...baseCtx,
      mixDesign: typeILMix,
      exposureClass: "F3",
      humidityPct: 30,
      curePlan: adequate,
    });
    expect(r.triggered).toBe(false);
  });
  it("does not fire for Type IL on F1 exposure", () => {
    const r = run("TYPEIL_SCALING_RISK", {
      ...baseCtx,
      mixDesign: typeILMix,
      exposureClass: "F1",
      humidityPct: 30,
      curePlan: dryCuredPlan,
    });
    expect(r.triggered).toBe(false);
  });
});

// ─── 11. DELIVERY_DISCHARGE_WINDOW ─────────────────────────────────────────
describe("DELIVERY_DISCHARGE_WINDOW", () => {
  const at = (min: number) => new Date(Date.UTC(2026, 5, 1, 12, min)).toISOString();
  it("does not fire under 90 min in mild weather", () => {
    const r = run("DELIVERY_DISCHARGE_WINDOW", {
      ...baseCtx,
      ambientTempF: 70,
      batchTicket: { batchedAt: at(0), deliveredAt: at(75), hasRetarder: false },
    });
    expect(r.triggered).toBe(false);
  });
  it("fires at 100 min in mild weather without retarder", () => {
    const r = run("DELIVERY_DISCHARGE_WINDOW", {
      ...baseCtx,
      ambientTempF: 70,
      batchTicket: { batchedAt: at(0), deliveredAt: at(100), hasRetarder: false },
    });
    expect(r.triggered).toBe(true);
    expect(r.severity).toBe("red");
  });
  it("fires at 75 min in hot weather without retarder", () => {
    const r = run("DELIVERY_DISCHARGE_WINDOW", {
      ...baseCtx,
      ambientTempF: 92,
      batchTicket: { batchedAt: at(0), deliveredAt: at(75), hasRetarder: false },
    });
    expect(r.triggered).toBe(true);
  });
  it("does not fire at 85 min when retarder is dosed", () => {
    const r = run("DELIVERY_DISCHARGE_WINDOW", {
      ...baseCtx,
      ambientTempF: 92,
      batchTicket: { batchedAt: at(0), deliveredAt: at(85), hasRetarder: true },
    });
    expect(r.triggered).toBe(false);
  });
});

// ─── 12. TEST_SLUMP_OUT_OF_SPEC ────────────────────────────────────────────
describe("TEST_SLUMP_OUT_OF_SPEC", () => {
  it("does not fire within target range", () => {
    const r = run("TEST_SLUMP_OUT_OF_SPEC", { ...baseCtx, measuredSlumpIn: 4.0 });
    expect(r.triggered).toBe(false);
  });
  it("fires below target", () => {
    const r = run("TEST_SLUMP_OUT_OF_SPEC", { ...baseCtx, measuredSlumpIn: 2.0 });
    expect(r.triggered).toBe(true);
  });
  it("fires above target", () => {
    const r = run("TEST_SLUMP_OUT_OF_SPEC", { ...baseCtx, measuredSlumpIn: 7.0 });
    expect(r.triggered).toBe(true);
    expect(r.severity).toBe("yellow");
  });
});
